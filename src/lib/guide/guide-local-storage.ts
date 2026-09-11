/**
 * P9-B — schema-versioned device-local guide progress (answers + checklist).
 *
 * Citizen guide state stays on the device only. Never send to the server.
 * Persisted data is untrusted client input — validate on every restore.
 * Envelope `storageVersion` versions this blob format; `guideSchemaVersion`
 * is a fingerprint of the current public guide structure (question/option/
 * document/rule keys) so CMS content changes invalidate stale drafts without
 * inventing a separate CMS guide-version field.
 */

import { z } from 'zod'

import { pruneCheckedDocumentKeys } from '@/lib/guide/checklist-state'
import { visibleQuestions } from '@/lib/guide/evaluate'
import { runPublicGuideEvaluation } from '@/lib/guide/public-guide-map'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import type { GuideAnswers, GuideQuestion } from '@/lib/guide/types'

/** Envelope format version for `localStorage` payloads. Bump when the blob shape changes. */
export const GUIDE_LOCAL_STORAGE_VERSION = 1 as const

const STORAGE_KEY_PREFIX = 'waraqa:guide:'

export type GuideLocalPersistedState = {
  storageVersion: typeof GUIDE_LOCAL_STORAGE_VERSION
  guideSchemaVersion: string
  transactionKey: string
  transactionId: string
  answers: GuideAnswers
  checkedDocumentKeys: string[]
  stepIndex: number
  showResult: boolean
  updatedAt: string
}

export type GuideLocalRestoreResult = {
  answers: GuideAnswers
  checkedDocumentKeys: string[]
  stepIndex: number
  showResult: boolean
}

const answerValueSchema = z.union([z.string().min(1), z.array(z.string().min(1))])

const persistedPayloadSchema = z.object({
  storageVersion: z.literal(GUIDE_LOCAL_STORAGE_VERSION),
  guideSchemaVersion: z.string().min(1),
  transactionKey: z.string().min(1),
  transactionId: z.union([z.string(), z.number()]).transform(String),
  answers: z.record(z.string(), answerValueSchema),
  checkedDocumentKeys: z.array(z.string().min(1)),
  stepIndex: z.number().int().nonnegative(),
  showResult: z.boolean(),
  updatedAt: z.string().min(1),
})

export function guideLocalStorageKey(transactionKey: string): string {
  return `${STORAGE_KEY_PREFIX}${transactionKey}`
}

/**
 * Deterministic fingerprint of guide structure that affects answer meaning
 * and checklist identity. Derived from the public DTO already loaded via
 * P0-05/P0-06 — not a second CMS version system.
 */
export function computeGuideSchemaVersion(
  guide: Pick<
    PublicGuideDTO,
    'questions' | 'documents' | 'rules' | 'steps' | 'fees' | 'variants' | 'notices'
  >,
): string {
  const qPart = [...guide.questions]
    .map((q) => {
      const opts = [...q.options].map((o) => o.key).sort().join(',')
      return `${q.key}:${q.questionType}:${q.required ? '1' : '0'}:${opts}`
    })
    .sort()
    .join('|')
  const dPart = [...guide.documents]
    .map((d) => `${d.key}:${d.requirementType ?? ''}`)
    .sort()
    .join('|')
  const rPart = [...guide.rules]
    .map((r) => `${r.key}:${r.priority}:${r.active ? '1' : '0'}`)
    .sort()
    .join('|')
  const sPart = [...guide.steps].map((s) => s.key).sort().join('|')
  const fPart = [...guide.fees].map((f) => f.key).sort().join('|')
  const vPart = [...guide.variants].map((v) => v.key).sort().join('|')
  const nPart = [...guide.notices].map((n) => n.key).sort().join('|')
  return `g1;q=${qPart};d=${dPart};r=${rPart};s=${sPart};f=${fPart};v=${vPart};n=${nPart}`
}

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeRemoveItem(key: string): void {
  try {
    if (!isBrowserStorageAvailable()) return
    window.localStorage.removeItem(key)
  } catch {
    // ignore quota / security errors
  }
}

/**
 * Whitelist constrained answer types only (boolean / single / multi).
 * Drops unknown keys and values that are not valid for the current guide.
 */
export function sanitizePersistedAnswers(
  rawAnswers: GuideAnswers,
  questions: GuideQuestion[],
): GuideAnswers {
  const byKey = new Map(questions.map((q) => [q.key, q]))
  const out: GuideAnswers = {}

  for (const [key, value] of Object.entries(rawAnswers)) {
    const question = byKey.get(key)
    if (!question || !question.active) continue

    if (question.questionType === 'boolean') {
      if (value === 'yes' || value === 'no') out[key] = value
      continue
    }

    if (question.questionType === 'single') {
      if (typeof value !== 'string') continue
      if (question.options.some((o) => o.key === value)) out[key] = value
      continue
    }

    if (question.questionType === 'multi') {
      if (!Array.isArray(value)) continue
      const allowed = new Set(question.options.map((o) => o.key))
      const cleaned = [...new Set(value.filter((v) => typeof v === 'string' && allowed.has(v)))]
      if (cleaned.length > 0) out[key] = cleaned
    }
  }

  return out
}

export function sanitizePersistedCheckedKeys(
  keys: Iterable<string>,
  knownDocumentKeys: Iterable<string>,
): string[] {
  const known = new Set(
    [...knownDocumentKeys].filter((k) => typeof k === 'string' && k.length > 0),
  )
  const out: string[] = []
  for (const key of keys) {
    if (typeof key === 'string' && known.has(key) && !out.includes(key)) out.push(key)
  }
  return out
}

export type GuideLocalWriteInput = {
  answers: GuideAnswers
  checkedDocumentKeys: Iterable<string>
  stepIndex: number
  showResult: boolean
}

/** Clamp stepIndex to the current visible question list (fail-safe). */
export function clampGuideStepIndex(stepIndex: number, visibleCount: number): number {
  if (!Number.isFinite(stepIndex)) return 0
  const maxStep = Math.max(0, visibleCount - 1)
  return Math.min(Math.max(0, Math.floor(stepIndex)), maxStep)
}

/**
 * Finalize restored progress against the live guide:
 * - clamp stepIndex to visible questions
 * - refuse showResult when evaluation is incomplete/invalid
 * - reconcile checklist only against a fresh successful evaluation
 */
export function finalizeGuideLocalRestore(
  guide: PublicGuideDTO,
  draft: GuideLocalRestoreResult,
): GuideLocalRestoreResult {
  const answers = sanitizePersistedAnswers(draft.answers, guide.questions)
  const knownDocs = guide.documents.map((d) => d.key)
  let checkedDocumentKeys = sanitizePersistedCheckedKeys(draft.checkedDocumentKeys, knownDocs)

  const visible = visibleQuestions(guide.questions, answers)
  let stepIndex = clampGuideStepIndex(draft.stepIndex, visible.length)
  let showResult = Boolean(draft.showResult)

  if (Object.keys(answers).length === 0) {
    return {
      answers: {},
      checkedDocumentKeys: [],
      stepIndex: 0,
      showResult: false,
    }
  }

  if (showResult) {
    const evaluation = runPublicGuideEvaluation(guide, answers)
    if (!evaluation.ok) {
      showResult = false
      checkedDocumentKeys = []
      stepIndex = clampGuideStepIndex(stepIndex, visible.length)
    } else {
      checkedDocumentKeys = reconcileCheckedKeysWithActiveDocuments(
        checkedDocumentKeys,
        evaluation.documents.map((d) => d.key),
      )
    }
  } else {
    checkedDocumentKeys = sanitizePersistedCheckedKeys(checkedDocumentKeys, knownDocs)
  }

  return {
    answers,
    checkedDocumentKeys,
    stepIndex,
    showResult,
  }
}

/** Build a validated payload for persistence (or null if nothing useful to store). */
export function buildGuideLocalPersistedState(
  guide: PublicGuideDTO,
  input: GuideLocalWriteInput,
): GuideLocalPersistedState | null {
  const answers = sanitizePersistedAnswers(input.answers, guide.questions)
  const knownDocs = guide.documents.map((d) => d.key)
  const checked = sanitizePersistedCheckedKeys(input.checkedDocumentKeys, knownDocs)

  const visible = visibleQuestions(guide.questions, answers)
  const stepIndex = clampGuideStepIndex(input.stepIndex, visible.length)
  const showResult = Boolean(input.showResult)

  const empty =
    Object.keys(answers).length === 0 &&
    checked.length === 0 &&
    stepIndex === 0 &&
    !showResult
  if (empty) return null

  return {
    storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
    guideSchemaVersion: computeGuideSchemaVersion(guide),
    transactionKey: guide.slug,
    transactionId: String(guide.transactionId),
    answers,
    checkedDocumentKeys: checked,
    stepIndex,
    showResult,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Parse + validate raw localStorage JSON against the current guide.
 * Returns null and clears the key on any incompatibility.
 */
export function parseAndValidateGuideLocalState(
  raw: string,
  guide: PublicGuideDTO,
): GuideLocalRestoreResult | null {
  const key = guideLocalStorageKey(guide.slug)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    safeRemoveItem(key)
    return null
  }

  const shape = persistedPayloadSchema.safeParse(parsed)
  if (!shape.success) {
    safeRemoveItem(key)
    return null
  }

  const data = shape.data
  if (data.transactionKey !== guide.slug) {
    safeRemoveItem(key)
    return null
  }
  if (data.transactionId !== String(guide.transactionId)) {
    safeRemoveItem(key)
    return null
  }
  if (data.guideSchemaVersion !== computeGuideSchemaVersion(guide)) {
    safeRemoveItem(key)
    return null
  }

  return finalizeGuideLocalRestore(guide, {
    answers: data.answers,
    checkedDocumentKeys: data.checkedDocumentKeys,
    stepIndex: data.stepIndex,
    showResult: data.showResult,
  })
}

/**
 * After answers are restored and evaluation can run, keep only active result docs.
 * Reuses P9-A prune helper.
 */
export function reconcileCheckedKeysWithActiveDocuments(
  checkedKeys: Iterable<string>,
  activeDocumentKeys: Iterable<string>,
): string[] {
  return [...pruneCheckedDocumentKeys(checkedKeys, activeDocumentKeys)]
}

export function readGuideLocalState(guide: PublicGuideDTO): GuideLocalRestoreResult | null {
  try {
    if (!isBrowserStorageAvailable()) return null
    const raw = window.localStorage.getItem(guideLocalStorageKey(guide.slug))
    if (raw == null || raw === '') return null
    return parseAndValidateGuideLocalState(raw, guide)
  } catch {
    return null
  }
}

export function writeGuideLocalState(guide: PublicGuideDTO, input: GuideLocalWriteInput): boolean {
  try {
    if (!isBrowserStorageAvailable()) return false
    const key = guideLocalStorageKey(guide.slug)
    const payload = buildGuideLocalPersistedState(guide, input)
    if (!payload) {
      window.localStorage.removeItem(key)
      return true
    }
    window.localStorage.setItem(key, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearGuideLocalState(transactionKey: string): void {
  safeRemoveItem(guideLocalStorageKey(transactionKey))
}

/**
 * P11-C — Admin guide preview: sanitize answers + run canonical evaluateGuide.
 * Informational only — never mutates Transaction / workflow / claims.
 */
import type { Payload, PayloadRequest } from 'payload'

import { pruneInapplicableAnswers } from '@/lib/guide/answer-labels'
import { evaluateGuide, evaluateGroupResult, visibleQuestions } from '@/lib/guide/evaluate'
import { sanitizePersistedAnswers } from '@/lib/guide/guide-local-storage'
import {
  mapGuideEngineCatalog,
  type GuideEngineCatalog,
} from '@/lib/guide/public-guide-map'
import type { GuideAnswers } from '@/lib/guide/types'
import { validateGuideData } from '@/lib/guide/validate-guide'

import {
  effectTypeLabelAr,
  type GuidePreviewCatalogResponse,
  type GuidePreviewFiredRule,
  type GuidePreviewQuestion,
  type TransactionGuidePreview,
} from './guide-preview-types'

const MAX_ANSWER_KEYS = 64
const MAX_MULTI_LEN = 32
const MAX_STRING_LEN = 64

/** Coerce untrusted POST body into a bounded GuideAnswers bag (pre-catalog sanitize). */
export function coerceUntrustedGuideAnswers(raw: unknown): GuideAnswers {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: GuideAnswers = {}
  let count = 0
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_ANSWER_KEYS) break
    if (typeof key !== 'string' || key.length < 1 || key.length > MAX_STRING_LEN) continue

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0 && trimmed.length <= MAX_STRING_LEN) {
        out[key] = trimmed
        count += 1
      }
      continue
    }

    if (Array.isArray(value)) {
      const items: string[] = []
      for (const item of value.slice(0, MAX_MULTI_LEN)) {
        if (typeof item !== 'string') continue
        const t = item.trim()
        if (t.length > 0 && t.length <= MAX_STRING_LEN && !items.includes(t)) items.push(t)
      }
      if (items.length > 0) {
        out[key] = items
        count += 1
      }
    }
  }
  return out
}

/** Catalog sanitize + visibility prune (same path as citizen restore). */
export function sanitizePreviewAnswers(
  catalog: GuideEngineCatalog,
  rawAnswers: GuideAnswers,
): GuideAnswers {
  return pruneInapplicableAnswers(
    catalog.questions,
    sanitizePersistedAnswers(rawAnswers, catalog.questions),
  )
}

function mapPreviewQuestions(
  catalog: GuideEngineCatalog,
  answers: GuideAnswers,
): GuidePreviewQuestion[] {
  const visibleKeys = new Set(visibleQuestions(catalog.questions, answers).map((q) => q.key))
  return catalog.questions.map((q) => ({
    key: q.key,
    prompt: q.prompt,
    helpText: q.helpText,
    questionType: q.questionType,
    required: q.required,
    options: q.options.map((o) => ({ key: o.key, label: o.label })),
    visible: visibleKeys.has(q.key),
  }))
}

function buildFiredRules(
  catalog: GuideEngineCatalog,
  firedRuleKeys: string[],
): GuidePreviewFiredRule[] {
  const byKey = new Map(catalog.rules.map((r) => [r.key, r]))
  return firedRuleKeys.map((key) => {
    const rule = byKey.get(key)
    return {
      key,
      explanation: rule?.explanation ?? null,
      status: 'fired' as const,
      effects: (rule?.effects ?? []).map((fx) => ({
        type: fx.type,
        targetKey: fx.targetKey,
        labelAr: `${effectTypeLabelAr(fx.type)} ← ${fx.targetKey}`,
      })),
    }
  })
}

function unknownWhenKeys(catalog: GuideEngineCatalog, answers: GuideAnswers): string[] {
  const keys: string[] = []
  for (const rule of catalog.rules) {
    if (!rule.active) continue
    if (evaluateGroupResult(rule.when, answers) === 'UNKNOWN') keys.push(rule.key)
  }
  return keys
}

function rulesSummaryAr(fired: number, active: number): string {
  return `تم تشغيل ${fired} من أصل ${active} قاعدة`
}

export function resolveAdminGuideCatalog(
  doc: Record<string, unknown>,
):
  | { ok: true; catalog: GuideEngineCatalog; guideEnabled: boolean }
  | { ok: false; guideEnabled: boolean; messageAr: string } {
  const guideEnabled = doc.guideEnabled === true
  const errors = validateGuideData(doc)
  if (errors.length > 0) {
    return {
      ok: false,
      guideEnabled,
      messageAr: errors[0] ?? 'دليل المعاملة غير صالح — احفظ دليلاً صحيحاً قبل المعاينة.',
    }
  }
  const catalog = mapGuideEngineCatalog(doc)
  if (!catalog) {
    return {
      ok: false,
      guideEnabled,
      messageAr: 'لا توجد أسئلة نشطة في الدليل المحفوظ — أضف سؤالاً واحفظ ثم أعد المحاولة.',
    }
  }
  return { ok: true, catalog, guideEnabled }
}

export function buildGuidePreviewCatalogResponse(
  doc: Record<string, unknown>,
): GuidePreviewCatalogResponse {
  const loadedAt = new Date().toISOString()
  const resolved = resolveAdminGuideCatalog(doc)
  if (!resolved.ok) {
    return {
      basedOn: 'last_saved',
      loadedAt,
      guideEnabled: resolved.guideEnabled,
      evaluationState: 'guide_invalid',
      messageAr: resolved.messageAr,
      questions: [],
      activeRuleCount: 0,
      unknownDiagnosticsLimited: true,
    }
  }
  return {
    basedOn: 'last_saved',
    loadedAt,
    guideEnabled: resolved.guideEnabled,
    evaluationState: 'incomplete',
    messageAr: null,
    questions: mapPreviewQuestions(resolved.catalog, {}),
    activeRuleCount: resolved.catalog.rules.filter((r) => r.active).length,
    unknownDiagnosticsLimited: true,
  }
}

export function buildTransactionGuidePreview(
  doc: Record<string, unknown>,
  rawAnswers: unknown,
): TransactionGuidePreview {
  const evaluatedAt = new Date().toISOString()
  const resolved = resolveAdminGuideCatalog(doc)
  if (!resolved.ok) {
    return {
      basedOn: 'last_saved',
      evaluatedAt,
      guideEnabled: resolved.guideEnabled,
      evaluationState: 'guide_invalid',
      messageAr: resolved.messageAr,
      questions: [],
      sanitizedAnswers: {},
      activeRuleCount: 0,
      firedRuleKeys: [],
      firedRules: [],
      unknownWhenRuleKeys: [],
      rulesSummaryAr: rulesSummaryAr(0, 0),
      variant: null,
      documents: [],
      steps: [],
      fees: [],
      notices: [],
      unknownDiagnosticsLimited: true,
    }
  }

  const { catalog, guideEnabled } = resolved
  const activeRuleCount = catalog.rules.filter((r) => r.active).length
  const coerced = coerceUntrustedGuideAnswers(rawAnswers)
  const sanitizedAnswers = sanitizePreviewAnswers(catalog, coerced)
  const evaluation = evaluateGuide({
    questions: catalog.questions,
    variants: catalog.variants,
    notices: catalog.notices,
    rules: catalog.rules,
    documents: catalog.documents,
    steps: catalog.steps,
    fees: catalog.fees,
    answers: sanitizedAnswers,
  })

  const unknownWhenRuleKeys = unknownWhenKeys(catalog, sanitizedAnswers)

  if (!evaluation.ok) {
    const state =
      evaluation.reason === 'incomplete_answers'
        ? 'incomplete'
        : evaluation.reason === 'conflicting_variants'
          ? 'conflict'
          : 'invalid_config'
    return {
      basedOn: 'last_saved',
      evaluatedAt,
      guideEnabled,
      evaluationState: state,
      messageAr: evaluation.message,
      questions: mapPreviewQuestions(catalog, sanitizedAnswers),
      sanitizedAnswers,
      activeRuleCount,
      firedRuleKeys: [],
      firedRules: [],
      unknownWhenRuleKeys,
      rulesSummaryAr: rulesSummaryAr(0, activeRuleCount),
      variant: null,
      documents: [],
      steps: [],
      fees: [],
      notices: [],
      unknownDiagnosticsLimited: true,
    }
  }

  const firedRuleKeys = evaluation.firedRuleKeys
  return {
    basedOn: 'last_saved',
    evaluatedAt,
    guideEnabled,
    evaluationState: 'ready',
    messageAr: null,
    questions: mapPreviewQuestions(catalog, sanitizedAnswers),
    sanitizedAnswers,
    activeRuleCount,
    firedRuleKeys,
    firedRules: buildFiredRules(catalog, firedRuleKeys),
    unknownWhenRuleKeys,
    rulesSummaryAr: rulesSummaryAr(firedRuleKeys.length, activeRuleCount),
    variant: evaluation.variant
      ? {
          key: evaluation.variant.key,
          title: evaluation.variant.title,
          explanation: evaluation.variant.explanation,
        }
      : null,
    documents: evaluation.documents.map((d) => ({
      key: d.key,
      title: d.title,
      detail: d.detail,
      why: d.why,
    })),
    steps: evaluation.steps.map((s) => ({
      key: s.key,
      title: s.title,
      detail: s.detail,
      why: s.why,
    })),
    fees: evaluation.fees.map((f) => ({
      key: f.key,
      title: f.title,
      detail: f.detail,
      why: f.why,
    })),
    notices: evaluation.notices.map((n) => ({
      key: n.key,
      title: n.title,
      detail: n.body,
      why: n.why,
      severity: n.severity,
    })),
    unknownDiagnosticsLimited: true,
  }
}

export async function loadSavedTransactionForGuidePreview(
  payload: Payload,
  id: string | number,
  req?: PayloadRequest,
): Promise<Record<string, unknown> | null> {
  try {
    const doc = await payload.findByID({
      collection: 'transactions',
      id,
      depth: 2,
      draft: true,
      locale: 'ar',
      overrideAccess: true,
      req,
    })
    return doc as unknown as Record<string, unknown>
  } catch {
    return null
  }
}

export async function evaluateTransactionGuidePreview(
  payload: Payload,
  id: string | number,
  rawAnswers: unknown,
  req?: PayloadRequest,
): Promise<TransactionGuidePreview | { error: 'not_found' }> {
  const doc = await loadSavedTransactionForGuidePreview(payload, id, req)
  if (!doc) return { error: 'not_found' }
  return buildTransactionGuidePreview(doc, rawAnswers)
}

export async function loadTransactionGuidePreviewCatalog(
  payload: Payload,
  id: string | number,
  req?: PayloadRequest,
): Promise<GuidePreviewCatalogResponse | { error: 'not_found' }> {
  const doc = await loadSavedTransactionForGuidePreview(payload, id, req)
  if (!doc) return { error: 'not_found' }
  return buildGuidePreviewCatalogResponse(doc)
}

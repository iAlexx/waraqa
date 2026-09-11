import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GUIDE_LOCAL_STORAGE_VERSION,
  buildGuideLocalPersistedState,
  clearGuideLocalState,
  clampGuideStepIndex,
  computeGuideSchemaVersion,
  finalizeGuideLocalRestore,
  guideLocalStorageKey,
  parseAndValidateGuideLocalState,
  readGuideLocalState,
  reconcileCheckedKeysWithActiveDocuments,
  sanitizePersistedAnswers,
  sanitizePersistedCheckedKeys,
  writeGuideLocalState,
} from '@/lib/guide/guide-local-storage'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import type { GuideQuestion } from '@/lib/guide/types'

function buildGuide(overrides?: Partial<PublicGuideDTO>): PublicGuideDTO {
  return {
    transactionId: 42,
    slug: 'tx-p9b-fixture',
    title: 'معاملة',
    summary: 'ملخص',
    lastReviewedLabel: null,
    lastReviewedAt: null,
    demoLabeled: false,
    detailHref: '/transactions/tx-p9b-fixture',
    questions: [
      {
        key: 'needs_guardian',
        questionType: 'boolean',
        prompt: 'هل تحتاج موافقة؟',
        helpText: null,
        required: true,
        active: true,
        options: [],
        visibleWhen: null,
      },
      {
        key: 'issuance',
        questionType: 'single',
        prompt: 'النوع؟',
        helpText: null,
        required: true,
        active: true,
        options: [
          { key: 'first_time', label: 'أول مرة' },
          { key: 'renewal', label: 'تجديد' },
        ],
        visibleWhen: null,
      },
      {
        key: 'extras',
        questionType: 'multi',
        prompt: 'إضافات؟',
        helpText: null,
        required: false,
        active: true,
        options: [
          { key: 'urgent', label: 'مستعجل' },
          { key: 'copy', label: 'نسخة' },
        ],
        visibleWhen: null,
      },
    ],
    variants: [],
    notices: [],
    rules: [],
    documents: [
      { key: 'doc_id', requirementType: 'required', title: 'هوية', detail: null },
      { key: 'doc_guardian', requirementType: 'conditional', title: 'ولي أمر', detail: null },
    ],
    steps: [],
    fees: [],
    sources: [],
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('P9-B guide local storage helpers', () => {
  it('uses deterministic namespaced keys by slug', () => {
    expect(guideLocalStorageKey('tx-p9b-fixture')).toBe('waraqa:guide:tx-p9b-fixture')
  })

  it('computes a stable guideSchemaVersion fingerprint from structure', () => {
    const a = computeGuideSchemaVersion(buildGuide())
    const b = computeGuideSchemaVersion(buildGuide({ title: 'عنوان مختلف' }))
    expect(a).toBe(b)
    const c = computeGuideSchemaVersion(
      buildGuide({
        documents: [{ key: 'doc_new', requirementType: 'required', title: 'جديد', detail: null }],
      }),
    )
    expect(c).not.toBe(a)
  })

  it('sanitizes answers: unknown keys, invalid single/multi, keeps valid boolean no', () => {
    const questions = buildGuide().questions as GuideQuestion[]
    const cleaned = sanitizePersistedAnswers(
      {
        needs_guardian: 'no',
        issuance: 'not-a-real-option',
        extras: ['urgent', 'bogus', 'urgent'],
        ghost: 'x',
        bad_bool: 'maybe',
      } as never,
      questions,
    )
    expect(cleaned).toEqual({
      needs_guardian: 'no',
      extras: ['urgent'],
    })
  })

  it('drops unknown checklist keys and reconciles with active docs', () => {
    expect(sanitizePersistedCheckedKeys(['doc_id', 'doc_ghost'], ['doc_id', 'doc_guardian'])).toEqual([
      'doc_id',
    ])
    expect(
      reconcileCheckedKeysWithActiveDocuments(['doc_id', 'doc_guardian'], ['doc_id']),
    ).toEqual(['doc_id'])
  })

  it('writes and reads a round-trip restore payload', () => {
    const guide = buildGuide()
    const ok = writeGuideLocalState(guide, {
      answers: { needs_guardian: 'yes', issuance: 'first_time', extras: ['copy'] },
      checkedDocumentKeys: ['doc_id', 'doc_ghost'],
      stepIndex: 1,
      showResult: true,
    })
    expect(ok).toBe(true)
    const restored = readGuideLocalState(guide)
    expect(restored).toEqual({
      answers: { needs_guardian: 'yes', issuance: 'first_time', extras: ['copy'] },
      checkedDocumentKeys: ['doc_id'],
      stepIndex: 1,
      showResult: true,
    })
  })

  it('ignores storageVersion mismatch and clears key', () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: 999,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: guide.slug,
        transactionId: String(guide.transactionId),
        answers: { needs_guardian: 'yes' },
        checkedDocumentKeys: ['doc_id'],
        stepIndex: 0,
        showResult: false,
        updatedAt: new Date().toISOString(),
      }),
    )
    expect(readGuideLocalState(guide)).toBeNull()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('ignores guideSchemaVersion mismatch and clears key', () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: 'stale-schema',
        transactionKey: guide.slug,
        transactionId: String(guide.transactionId),
        answers: { needs_guardian: 'yes' },
        checkedDocumentKeys: ['doc_id'],
        stepIndex: 0,
        showResult: false,
        updatedAt: new Date().toISOString(),
      }),
    )
    expect(parseAndValidateGuideLocalState(window.localStorage.getItem(key)!, guide)).toBeNull()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('ignores wrong transaction identity', () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: 'other-slug',
        transactionId: String(guide.transactionId),
        answers: { needs_guardian: 'yes' },
        checkedDocumentKeys: [],
        stepIndex: 0,
        showResult: false,
        updatedAt: new Date().toISOString(),
      }),
    )
    expect(readGuideLocalState(guide)).toBeNull()

    window.localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: guide.slug,
        transactionId: '999',
        answers: { needs_guardian: 'yes' },
        checkedDocumentKeys: [],
        stepIndex: 0,
        showResult: false,
        updatedAt: new Date().toISOString(),
      }),
    )
    expect(readGuideLocalState(guide)).toBeNull()
  })

  it('ignores malformed JSON without throwing', () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(key, '{not-json')
    expect(() => readGuideLocalState(guide)).not.toThrow()
    expect(readGuideLocalState(guide)).toBeNull()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('ignores malformed answer shape', () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(
      key,
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: guide.slug,
        transactionId: String(guide.transactionId),
        answers: 'not-an-object',
        checkedDocumentKeys: [],
        stepIndex: 0,
        showResult: false,
        updatedAt: new Date().toISOString(),
      }),
    )
    expect(readGuideLocalState(guide)).toBeNull()
  })

  it('clearGuideLocalState removes persisted progress', () => {
    const guide = buildGuide()
    writeGuideLocalState(guide, {
      answers: { needs_guardian: 'yes' },
      checkedDocumentKeys: ['doc_id'],
      stepIndex: 0,
      showResult: false,
    })
    clearGuideLocalState(guide.slug)
    expect(window.localStorage.getItem(guideLocalStorageKey(guide.slug))).toBeNull()
  })

  it('survives localStorage write exceptions (in-memory fallback)', () => {
    const guide = buildGuide()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(
      writeGuideLocalState(guide, {
        answers: { needs_guardian: 'yes' },
        checkedDocumentKeys: [],
        stepIndex: 0,
        showResult: false,
      }),
    ).toBe(false)
  })

  it('buildGuideLocalPersistedState returns null for empty progress', () => {
    expect(
      buildGuideLocalPersistedState(buildGuide(), {
        answers: {},
        checkedDocumentKeys: [],
        stepIndex: 0,
        showResult: false,
      }),
    ).toBeNull()
  })

  it('clamps out-of-range stepIndex and refuses invalid showResult', () => {
    expect(clampGuideStepIndex(99, 2)).toBe(1)
    expect(clampGuideStepIndex(-3, 2)).toBe(0)
    expect(clampGuideStepIndex(1.7, 2)).toBe(1)

    const guide = buildGuide()
    const incomplete = finalizeGuideLocalRestore(guide, {
      answers: { needs_guardian: 'yes' }, // missing required issuance
      checkedDocumentKeys: ['doc_id', 'doc_stale'],
      stepIndex: 50,
      showResult: true,
    })
    expect(incomplete.showResult).toBe(false)
    expect(incomplete.checkedDocumentKeys).toEqual([])
    expect(incomplete.stepIndex).toBe(2) // clamped to last visible question
    expect(incomplete.answers).toEqual({ needs_guardian: 'yes' })

    const complete = finalizeGuideLocalRestore(guide, {
      answers: { needs_guardian: 'yes', issuance: 'first_time' },
      checkedDocumentKeys: ['doc_id', 'doc_guardian', 'doc_stale'],
      stepIndex: 99,
      showResult: true,
    })
    expect(complete.showResult).toBe(true)
    expect(complete.stepIndex).toBe(2)
    expect(complete.checkedDocumentKeys).toEqual(['doc_id'])
  })
})

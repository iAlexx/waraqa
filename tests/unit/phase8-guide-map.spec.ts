import { describe, expect, it } from 'vitest'

import {
  mapPublicGuide,
  runPublicGuideEvaluation,
} from '@/lib/guide/public-guide-map'

function baseGuideDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 88,
    _status: 'published',
    active: true,
    markedOutdated: false,
    workflowState: 'published',
    title: 'معاملة دليل تجريبي',
    slug: 'qa-p8-map-tx',
    summary: 'ملخص للدليل العام.',
    lastReviewedAt: '2026-07-01T00:00:00.000Z',
    guideEnabled: true,
    questions: [
      {
        key: 'age_group',
        questionType: 'boolean',
        prompt: 'هل أنت بالغ؟',
        required: true,
        active: true,
        options: [],
      },
      {
        key: 'issuance',
        questionType: 'single',
        prompt: 'نوع المعاملة؟',
        required: true,
        active: true,
        options: [
          { key: 'first_time', label: 'أول مرة' },
          { key: 'renewal', label: 'تجديد' },
        ],
      },
    ],
    variants: [
      {
        key: 'variant_first',
        title: 'إصدار أول مرة',
        explanation: null,
        active: true,
      },
    ],
    notices: [],
    decisionRules: [
      {
        key: 'rule_first',
        priority: 10,
        active: true,
        explanation: 'أول مرة',
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals', value: 'first_time' }],
        },
        effects: [{ type: 'selectVariant', targetKey: 'variant_first' }],
      },
    ],
    requiredDocuments: [
      {
        key: 'doc_id',
        requirementType: 'required',
        document: { id: 1, name: 'هوية', _status: 'published', active: true },
      },
    ],
    steps: [{ key: 'step_prepare', title: 'حضّر', description: 'وصف' }],
    fees: [{ key: 'fee_base', label: 'رسم', amount: 1000, currency: 'SYP' }],
    sources: [
      {
        primary: true,
        source: {
          id: 1,
          title: 'مصدر منشور',
          officialUrl: 'https://example.test/official',
          _status: 'published',
          active: true,
        },
      },
      {
        primary: false,
        source: {
          id: 2,
          title: 'مصدر مسودة',
          officialUrl: 'https://example.test/draft',
          _status: 'draft',
          active: true,
        },
      },
      {
        primary: false,
        source: {
          id: 3,
          title: 'مصدر معطّل',
          officialUrl: 'https://example.test/off',
          _status: 'published',
          active: false,
        },
      },
    ],
    ...overrides,
  }
}

describe('Phase 8 public guide map', () => {
  it('mapPublicGuide strips unpublished sources and requires keys', () => {
    const mapped = mapPublicGuide(baseGuideDoc())
    expect(mapped).toBeTruthy()
    expect(mapped!.sources).toHaveLength(1)
    expect(mapped!.sources[0]?.title).toContain('منشور')
    expect(mapped!.documents[0]?.key).toBe('doc_id')
    expect(mapped!.steps[0]?.key).toBe('step_prepare')
    expect(mapped!.fees[0]?.key).toBe('fee_base')
    expect(mapped!.detailHref).toBe('/transactions/qa-p8-map-tx')

    const missingKeys = mapPublicGuide(
      baseGuideDoc({
        requiredDocuments: [
          {
            requirementType: 'required',
            document: { id: 1, name: 'بدون مفتاح', _status: 'published', active: true },
          },
        ],
        steps: [{ title: 'بدون مفتاح' }],
        fees: [{ label: 'بدون مفتاح' }],
      }),
    )
    expect(missingKeys).toBeTruthy()
    expect(missingKeys!.documents).toEqual([])
    expect(missingKeys!.steps).toEqual([])
    expect(missingKeys!.fees).toEqual([])
  })

  it('returns null when guide unavailable', () => {
    expect(mapPublicGuide(baseGuideDoc({ guideEnabled: false }))).toBeNull()
    expect(
      mapPublicGuide(
        baseGuideDoc({
          questions: [
            {
              key: 'bad key!',
              questionType: 'boolean',
              prompt: 'سؤال',
              required: true,
              active: true,
              options: [],
            },
          ],
        }),
      ),
    ).toBeNull()
    expect(mapPublicGuide(baseGuideDoc({ questions: [] }))).toBeNull()
    expect(mapPublicGuide(baseGuideDoc({ title: '', slug: 'x' }))).toBeNull()
  })

  it('runPublicGuideEvaluation wires answers through the evaluator', () => {
    const guide = mapPublicGuide(baseGuideDoc())
    expect(guide).toBeTruthy()
    const incomplete = runPublicGuideEvaluation(guide!, { age_group: 'yes' })
    expect(incomplete.ok).toBe(false)
    if (incomplete.ok) return
    expect(incomplete.reason).toBe('incomplete_answers')

    const ok = runPublicGuideEvaluation(guide!, {
      age_group: 'yes',
      issuance: 'first_time',
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.variant?.key).toBe('variant_first')
    expect(ok.documents.map((d: { key: string }) => d.key)).toContain('doc_id')
  })
})

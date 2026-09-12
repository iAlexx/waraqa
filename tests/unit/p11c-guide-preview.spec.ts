import { describe, expect, it } from 'vitest'

import {
  buildTransactionGuidePreview,
  coerceUntrustedGuideAnswers,
  sanitizePreviewAnswers,
} from '@/lib/admin/guide-preview'
import { evaluateGuide } from '@/lib/guide/evaluate'
import { mapGuideEngineCatalog } from '@/lib/guide/public-guide-map'

function fixtureDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    guideEnabled: true,
    title: 'معاينة',
    slug: 'preview-tx',
    summary: 'ملخص',
    questions: [
      {
        key: 'age_group',
        questionType: 'boolean',
        prompt: { ar: 'هل أنت بالغ؟' },
        required: true,
        active: true,
        options: [],
      },
      {
        key: 'issuance',
        questionType: 'single',
        prompt: { ar: 'نوع المعاملة؟' },
        required: true,
        active: true,
        options: [
          { key: 'first_time', label: { ar: 'أول مرة' } },
          { key: 'renewal', label: { ar: 'تجديد' } },
        ],
        visibleWhen: {
          all: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }],
        },
      },
      {
        key: 'needs',
        questionType: 'multi',
        prompt: { ar: 'احتياجات إضافية؟' },
        required: false,
        active: true,
        options: [
          { key: 'urgent', label: { ar: 'مستعجل' } },
          { key: 'mail', label: { ar: 'بريد' } },
        ],
      },
    ],
    variants: [
      { key: 'variant_first', title: { ar: 'إصدار أول مرة' }, active: true },
      { key: 'variant_renewal', title: { ar: 'تجديد' }, active: true },
    ],
    notices: [
      {
        key: 'notice_urgent',
        title: { ar: 'مستعجل' },
        body: { ar: 'مسار مستعجل تجريبي.' },
        severity: 'warning',
        active: true,
      },
    ],
    decisionRules: [
      {
        key: 'rule_first',
        priority: 10,
        active: true,
        explanation: { ar: 'لأنك أول مرة' },
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals', value: 'first_time' }],
        },
        effects: [{ type: 'selectVariant', targetKey: 'variant_first' }],
      },
      {
        key: 'rule_renewal',
        priority: 20,
        active: true,
        explanation: { ar: 'لأنك تجديد' },
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals', value: 'renewal' }],
        },
        effects: [{ type: 'selectVariant', targetKey: 'variant_renewal' }],
      },
      {
        key: 'rule_urgent',
        priority: 30,
        active: true,
        explanation: { ar: 'لأنك اخترت مستعجل' },
        when: {
          all: [{ questionKey: 'needs', operator: 'includes', value: 'urgent' }],
        },
        effects: [{ type: 'includeNotice', targetKey: 'notice_urgent' }],
      },
      {
        key: 'rule_minor_hidden',
        priority: 5,
        active: true,
        explanation: { ar: 'قاصر' },
        when: {
          all: [{ questionKey: 'age_group', operator: 'equals', value: 'no' }],
        },
        effects: [{ type: 'includeNotice', targetKey: 'notice_urgent' }],
      },
    ],
    requiredDocuments: [
      {
        key: 'doc_id',
        document: { name: { ar: 'هوية' } },
        requirementType: 'required',
      },
    ],
    steps: [{ key: 'step_prepare', title: { ar: 'حضّر' }, description: { ar: 'وصف' } }],
    fees: [{ key: 'fee_base', label: { ar: 'رسم' }, amount: 10, currency: 'SYP' }],
    ...overrides,
  }
}

describe('P11-C guide preview (server)', () => {
  it('E: boolean scenario can leave issuance UNKNOWN when adult unanswered path', () => {
    const preview = buildTransactionGuidePreview(fixtureDoc(), { age_group: 'no' })
    expect(preview.evaluationState).toBe('ready')
    expect(preview.firedRuleKeys).toContain('rule_minor_hidden')
    expect(preview.firedRuleKeys).not.toContain('rule_first')
  })

  it('F: single-choice fires expected rule', () => {
    const answers = { age_group: 'yes', issuance: 'first_time' }
    const preview = buildTransactionGuidePreview(fixtureDoc(), answers)
    expect(preview.evaluationState).toBe('ready')
    expect(preview.firedRuleKeys).toEqual(
      expect.arrayContaining(['rule_first']),
    )
    expect(preview.variant?.key).toBe('variant_first')
  })

  it('G: multi-choice fires expected rule', () => {
    const preview = buildTransactionGuidePreview(fixtureDoc(), {
      age_group: 'yes',
      issuance: 'renewal',
      needs: ['urgent'],
    })
    expect(preview.firedRuleKeys).toEqual(
      expect.arrayContaining(['rule_renewal', 'rule_urgent']),
    )
    expect(preview.notices.some((n) => n.key === 'notice_urgent')).toBe(true)
  })

  it('H: missing answer → incomplete UNKNOWN-safe', () => {
    const preview = buildTransactionGuidePreview(fixtureDoc(), { age_group: 'yes' })
    expect(preview.evaluationState).toBe('incomplete')
    expect(preview.variant).toBeNull()
    expect(preview.messageAr).toMatch(/الإلزامية|أجب/)
  })

  it('I/J/K: malformed / unknown key / invalid option cannot influence', () => {
    const coerced = coerceUntrustedGuideAnswers({
      age_group: 'yes',
      issuance: 'first_time',
      unknown_q: 'yes',
      issuance_bad: { nested: true },
      needs: ['urgent', 'not_an_option', 12],
    })
    expect(coerced.unknown_q).toBe('yes')
    const catalog = mapGuideEngineCatalog(fixtureDoc())!
    const sanitized = sanitizePreviewAnswers(catalog, coerced)
    expect(sanitized.unknown_q).toBeUndefined()
    expect(sanitized.needs).toEqual(['urgent'])
    expect(sanitized.issuance).toBe('first_time')

    const preview = buildTransactionGuidePreview(fixtureDoc(), {
      age_group: 'yes',
      issuance: 'not_a_real_option',
      hack: 'yes',
    })
    expect(preview.sanitizedAnswers.issuance).toBeUndefined()
    expect(preview.sanitizedAnswers.hack).toBeUndefined()
    expect(preview.evaluationState).toBe('incomplete')
  })

  it('L/M/N: firedRuleKeys / variant / lists match canonical evaluateGuide', () => {
    const doc = fixtureDoc()
    const answers = { age_group: 'yes', issuance: 'first_time', needs: ['mail'] }
    const catalog = mapGuideEngineCatalog(doc)!
    const sanitized = sanitizePreviewAnswers(catalog, answers)
    const canonical = evaluateGuide({ ...catalog, answers: sanitized })
    const preview = buildTransactionGuidePreview(doc, answers)
    expect(canonical.ok).toBe(true)
    if (!canonical.ok) return
    expect(preview.firedRuleKeys).toEqual(canonical.firedRuleKeys)
    expect(preview.variant?.key ?? null).toBe(canonical.variant?.key ?? null)
    expect(preview.documents.map((d) => d.key)).toEqual(canonical.documents.map((d) => d.key))
    expect(preview.steps.map((s) => s.key)).toEqual(canonical.steps.map((s) => s.key))
    expect(preview.fees.map((f) => f.key)).toEqual(canonical.fees.map((f) => f.key))
    expect(preview.notices.map((n) => n.key)).toEqual(canonical.notices.map((n) => n.key))
  })

  it('O: hidden stale answer cannot fire a rule', () => {
    // issuance=first_time would fire rule_first, but age_group=no hides issuance
    const preview = buildTransactionGuidePreview(fixtureDoc(), {
      age_group: 'no',
      issuance: 'first_time',
    })
    expect(preview.sanitizedAnswers.issuance).toBeUndefined()
    expect(preview.firedRuleKeys).not.toContain('rule_first')
    expect(preview.firedRuleKeys).toContain('rule_minor_hidden')
  })

  it('malformed saved guide fails closed', () => {
    const preview = buildTransactionGuidePreview(
      fixtureDoc({
        questions: [{ key: 'BAD KEY', questionType: 'boolean', prompt: { ar: 'س' }, active: true }],
      }),
      { age_group: 'yes' },
    )
    expect(preview.evaluationState).toBe('guide_invalid')
    expect(preview.firedRuleKeys).toEqual([])
  })

  it('basedOn is last_saved and unknown diagnostics are limited', () => {
    const preview = buildTransactionGuidePreview(fixtureDoc(), {
      age_group: 'yes',
      issuance: 'first_time',
    })
    expect(preview.basedOn).toBe('last_saved')
    expect(preview.unknownDiagnosticsLimited).toBe(true)
  })
})

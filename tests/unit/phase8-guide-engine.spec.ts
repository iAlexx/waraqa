import { describe, expect, it } from 'vitest'

import { evaluateGuide, visibleQuestions } from '@/lib/guide/evaluate'
import type {
  GuideAnswers,
  GuideContentRef,
  GuideDecisionRule,
  GuideNotice,
  GuideQuestion,
  GuideVariant,
} from '@/lib/guide/types'
import { isPublicGuideAvailable, validateGuideData } from '@/lib/guide/validate-guide'

function q(partial: Partial<GuideQuestion> & Pick<GuideQuestion, 'key' | 'prompt'>): GuideQuestion {
  return {
    questionType: 'single',
    helpText: null,
    required: true,
    active: true,
    options: [],
    visibleWhen: null,
    ...partial,
  }
}

function rule(
  partial: Partial<GuideDecisionRule> & Pick<GuideDecisionRule, 'key' | 'when' | 'effects'>,
): GuideDecisionRule {
  return {
    priority: 100,
    active: true,
    explanation: null,
    ...partial,
  }
}

const docs: GuideContentRef[] = [
  { key: 'doc_id', title: 'هوية', detail: null, requirementType: 'required' },
  { key: 'doc_guardian', title: 'موافقة ولي الأمر', detail: null, requirementType: 'conditional' },
  { key: 'doc_old_passport', title: 'جواز قديم', detail: null, requirementType: 'conditional' },
]

const steps: GuideContentRef[] = [
  { key: 'step_prepare', title: 'حضّر الوثائق', detail: null },
  { key: 'step_submit', title: 'قدّم الطلب', detail: null },
  { key: 'step_urgent', title: 'مسار مستعجل', detail: null },
]

const fees: GuideContentRef[] = [
  { key: 'fee_base', title: 'رسم أساسي', detail: null },
  { key: 'fee_renewal', title: 'رسم تجديد', detail: null },
]

const variants: GuideVariant[] = [
  { key: 'variant_first', title: 'إصدار أول مرة', explanation: null, active: true },
  { key: 'variant_renewal', title: 'تجديد', explanation: null, active: true },
]

const notices: GuideNotice[] = [
  {
    key: 'notice_minor',
    title: 'قاصر',
    body: 'راجع ولي الأمر.',
    severity: 'warning',
    active: true,
  },
]

const ageQuestion = q({
  key: 'age_group',
  prompt: 'هل أنت بالغ؟',
  questionType: 'boolean',
})

const issuanceQuestion = q({
  key: 'issuance',
  prompt: 'نوع المعاملة؟',
  options: [
    { key: 'first_time', label: 'أول مرة' },
    { key: 'renewal', label: 'تجديد' },
  ],
})

const needsQuestion = q({
  key: 'needs',
  prompt: 'احتياجات إضافية؟',
  questionType: 'multi',
  required: false,
  options: [
    { key: 'urgent', label: 'مستعجل' },
    { key: 'copy', label: 'نسخة إضافية' },
  ],
})

const baseRules: GuideDecisionRule[] = [
  rule({
    key: 'rule_minor',
    priority: 10,
    explanation: 'لأنك قاصر',
    when: { all: [{ questionKey: 'age_group', operator: 'equals', value: 'no' }] },
    effects: [
      { type: 'includeDocument', targetKey: 'doc_guardian' },
      { type: 'includeNotice', targetKey: 'notice_minor' },
    ],
  }),
  rule({
    key: 'rule_first',
    priority: 20,
    explanation: 'إصدار أول مرة',
    when: { all: [{ questionKey: 'issuance', operator: 'equals', value: 'first_time' }] },
    effects: [{ type: 'selectVariant', targetKey: 'variant_first' }],
  }),
  rule({
    key: 'rule_renewal',
    priority: 20,
    explanation: 'تجديد',
    when: { all: [{ questionKey: 'issuance', operator: 'equals', value: 'renewal' }] },
    effects: [
      { type: 'includeDocument', targetKey: 'doc_old_passport' },
      { type: 'includeFee', targetKey: 'fee_renewal' },
      { type: 'selectVariant', targetKey: 'variant_renewal' },
    ],
  }),
  rule({
    key: 'rule_urgent_include',
    priority: 30,
    explanation: 'مسار مستعجل',
    when: { all: [{ questionKey: 'needs', operator: 'includes', value: 'urgent' }] },
    effects: [{ type: 'includeStep', targetKey: 'step_urgent' }],
  }),
  rule({
    key: 'rule_urgent_exclude',
    priority: 40,
    explanation: 'استبعاد المستعجل لاحقاً',
    when: { all: [{ questionKey: 'needs', operator: 'includes', value: 'copy' }] },
    effects: [{ type: 'excludeStep', targetKey: 'step_urgent' }],
  }),
]

function evaluate(answers: GuideAnswers, rules = baseRules) {
  return evaluateGuide({
    questions: [ageQuestion, issuanceQuestion, needsQuestion],
    variants,
    notices,
    rules,
    documents: docs,
    steps,
    fees,
    answers,
  })
}

describe('Phase 8 guide engine', () => {
  it('branches adult vs minor (guardian doc + notice)', () => {
    const adult = evaluate({ age_group: 'yes', issuance: 'first_time' })
    expect(adult.ok).toBe(true)
    if (!adult.ok) return
    expect(adult.documents.map((d) => d.key)).toEqual(['doc_id'])
    expect(adult.notices).toHaveLength(0)
    expect(adult.variant?.key).toBe('variant_first')

    const minor = evaluate({ age_group: 'no', issuance: 'first_time' })
    expect(minor.ok).toBe(true)
    if (!minor.ok) return
    expect(minor.documents.map((d) => d.key)).toEqual(['doc_id', 'doc_guardian'])
    expect(minor.notices.map((n) => n.key)).toEqual(['notice_minor'])
    expect(minor.documents.find((d) => d.key === 'doc_guardian')?.why).toContain('قاصر')
  })

  it('branches first-time vs renewal', () => {
    const first = evaluate({ age_group: 'yes', issuance: 'first_time' })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.variant?.key).toBe('variant_first')
    expect(first.documents.map((d) => d.key)).not.toContain('doc_old_passport')
    expect(first.fees.map((f) => f.key)).toEqual(['fee_base'])

    const renewal = evaluate({ age_group: 'yes', issuance: 'renewal' })
    expect(renewal.ok).toBe(true)
    if (!renewal.ok) return
    expect(renewal.variant?.key).toBe('variant_renewal')
    expect(renewal.documents.map((d) => d.key)).toContain('doc_old_passport')
    expect(renewal.fees.map((f) => f.key)).toEqual(['fee_base', 'fee_renewal'])
  })

  it('include then higher-priority exclude: exclude wins', () => {
    const both = evaluate({
      age_group: 'yes',
      issuance: 'first_time',
      needs: ['urgent', 'copy'],
    })
    expect(both.ok).toBe(true)
    if (!both.ok) return
    expect(both.steps.map((s) => s.key)).toEqual(['step_prepare', 'step_submit'])
    expect(both.firedRuleKeys).toEqual(
      expect.arrayContaining(['rule_urgent_include', 'rule_urgent_exclude']),
    )

    const onlyInclude = evaluate({
      age_group: 'yes',
      issuance: 'first_time',
      needs: ['urgent'],
    })
    expect(onlyInclude.ok).toBe(true)
    if (!onlyInclude.ok) return
    expect(onlyInclude.steps.map((s) => s.key)).toContain('step_urgent')
  })

  it('missing required answer → incomplete_answers', () => {
    const result = evaluate({ age_group: 'yes' })
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'incomplete_answers',
      }),
    )
  })

  it('conflicting selectVariant at runtime → conflicting_variants', () => {
    const conflictRules = [
      rule({
        key: 'pick_a',
        priority: 1,
        when: { all: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }] },
        effects: [{ type: 'selectVariant', targetKey: 'variant_first' }],
      }),
      rule({
        key: 'pick_b',
        priority: 2,
        when: { all: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }] },
        effects: [{ type: 'selectVariant', targetKey: 'variant_renewal' }],
      }),
    ]
    const result = evaluate({ age_group: 'yes', issuance: 'first_time' }, conflictRules)
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'conflicting_variants',
      }),
    )
  })

  it('validateGuideData catches invalid references, duplicate keys, conflicting variants', () => {
    const invalidRef = validateGuideData({
      guideEnabled: true,
      requiredDocuments: [{ key: 'doc_id' }],
      steps: [{ key: 'step_prepare' }],
      fees: [{ key: 'fee_base' }],
      questions: [
        {
          key: 'age_group',
          questionType: 'boolean',
          prompt: 'بالغ؟',
          active: true,
          required: true,
          options: [],
        },
      ],
      variants: [{ key: 'variant_first', title: 'أول مرة', active: true }],
      notices: [],
      decisionRules: [
        {
          key: 'bad_ref',
          priority: 1,
          active: true,
          when: { all: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }] },
          effects: [{ type: 'includeDocument', targetKey: 'missing_doc' }],
        },
      ],
    })
    expect(invalidRef.some((e) => e.includes('missing_doc'))).toBe(true)

    const dupKeys = validateGuideData({
      guideEnabled: false,
      requiredDocuments: [{ key: 'doc_id' }, { key: 'doc_id' }],
      steps: [],
      fees: [],
      questions: [],
      variants: [],
      notices: [],
      decisionRules: [],
    })
    expect(dupKeys.some((e) => e.includes('مكرر'))).toBe(true)

    const conflictVariants = validateGuideData({
      guideEnabled: true,
      requiredDocuments: [{ key: 'doc_id' }],
      steps: [{ key: 'step_a' }],
      fees: [],
      questions: [
        {
          key: 'q1',
          questionType: 'boolean',
          prompt: 'سؤال',
          active: true,
          required: true,
          options: [],
        },
      ],
      variants: [
        { key: 'variant_a', title: 'أ', active: true },
        { key: 'variant_b', title: 'ب', active: true },
      ],
      notices: [],
      decisionRules: [
        {
          key: 'r1',
          priority: 1,
          active: true,
          when: { all: [{ questionKey: 'q1', operator: 'equals', value: 'yes' }] },
          effects: [{ type: 'selectVariant', targetKey: 'variant_a' }],
        },
        {
          key: 'r2',
          priority: 2,
          active: true,
          when: { all: [{ questionKey: 'q1', operator: 'equals', value: 'yes' }] },
          effects: [{ type: 'selectVariant', targetKey: 'variant_b' }],
        },
      ],
    })
    expect(conflictVariants.some((e) => e.includes('تعارض متغيرات'))).toBe(true)
  })

  it('visibleWhen all (AND) and any (OR)', () => {
    const followUp = q({
      key: 'guardian_id',
      prompt: 'هل معك هوية ولي الأمر؟',
      questionType: 'boolean',
      visibleWhen: {
        all: [{ questionKey: 'age_group', operator: 'equals', value: 'no' }],
      },
    })
    const either = q({
      key: 'extra',
      prompt: 'سؤال إضافي',
      questionType: 'boolean',
      required: false,
      visibleWhen: {
        any: [
          { questionKey: 'issuance', operator: 'equals', value: 'renewal' },
          { questionKey: 'needs', operator: 'includes', value: 'urgent' },
        ],
      },
    })

    expect(
      visibleQuestions([ageQuestion, followUp, either], { age_group: 'yes' }).map((x) => x.key),
    ).toEqual(['age_group'])

    expect(
      visibleQuestions([ageQuestion, followUp, either], { age_group: 'no' }).map((x) => x.key),
    ).toEqual(['age_group', 'guardian_id'])

    expect(
      visibleQuestions([issuanceQuestion, needsQuestion, either], {
        issuance: 'first_time',
        needs: ['urgent'],
      }).map((x) => x.key),
    ).toContain('extra')

    expect(
      visibleQuestions([issuanceQuestion, needsQuestion, either], {
        issuance: 'first_time',
        needs: ['copy'],
      }).map((x) => x.key),
    ).not.toContain('extra')
  })

  it('boolean yes/no and multi includes', () => {
    const yes = evaluate({ age_group: 'yes', issuance: 'first_time' })
    expect(yes.ok).toBe(true)

    const multi = evaluate({
      age_group: 'yes',
      issuance: 'first_time',
      needs: ['urgent'],
    })
    expect(multi.ok).toBe(true)
    if (!multi.ok) return
    expect(multi.steps.map((s) => s.key)).toContain('step_urgent')
  })

  it('preserves stable catalog order for documents/steps/fees', () => {
    const result = evaluate({
      age_group: 'no',
      issuance: 'renewal',
      needs: ['urgent'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.documents.map((d) => d.key)).toEqual([
      'doc_id',
      'doc_guardian',
      'doc_old_passport',
    ])
    expect(result.steps.map((s) => s.key)).toEqual([
      'step_prepare',
      'step_submit',
      'step_urgent',
    ])
    expect(result.fees.map((f) => f.key)).toEqual(['fee_base', 'fee_renewal'])
  })

  it('isPublicGuideAvailable is false when guideEnabled false or invalid', () => {
    expect(
      isPublicGuideAvailable({
        guideEnabled: false,
        questions: [
          {
            key: 'q1',
            questionType: 'boolean',
            prompt: 'سؤال',
            active: true,
            required: true,
            options: [],
          },
        ],
      }),
    ).toBe(false)

    expect(
      isPublicGuideAvailable({
        guideEnabled: true,
        questions: [
          {
            key: 'BAD KEY',
            questionType: 'boolean',
            prompt: 'سؤال',
            active: true,
            required: true,
            options: [],
          },
        ],
      }),
    ).toBe(false)

    expect(
      isPublicGuideAvailable({
        guideEnabled: true,
        questions: [
          {
            key: 'q1',
            questionType: 'boolean',
            prompt: 'سؤال',
            active: true,
            required: true,
            options: [],
          },
        ],
        requiredDocuments: [],
        steps: [],
        fees: [],
        variants: [],
        notices: [],
        decisionRules: [],
      }),
    ).toBe(true)
  })
})

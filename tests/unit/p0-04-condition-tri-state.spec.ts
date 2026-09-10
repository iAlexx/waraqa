import { describe, expect, it } from 'vitest'

import {
  evaluateConditionResult,
  evaluateGroupResult,
  evaluateGuide,
} from '@/lib/guide/evaluate'
import type {
  GuideAnswers,
  GuideContentRef,
  GuideDecisionRule,
  GuideNotice,
  GuideQuestion,
  GuideVariant,
} from '@/lib/guide/types'

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
  { key: 'doc_foreign', title: 'وثيقة أجنبية', detail: null, requirementType: 'conditional' },
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
    key: 'notice_foreign',
    title: 'خارج سوريا',
    body: 'راجع القنصلية.',
    severity: 'warning',
    active: true,
  },
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

const countryQuestion = q({
  key: 'country',
  prompt: 'بلد الإقامة؟',
  required: false,
  options: [
    { key: 'SY', label: 'سوريا' },
    { key: 'TR', label: 'تركيا' },
  ],
})

const phase8Rules: GuideDecisionRule[] = [
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

const foreignRule = rule({
  key: 'rule_not_sy',
  priority: 50,
  explanation: 'مقيم خارج سوريا',
  when: { all: [{ questionKey: 'country', operator: 'notEquals', value: 'SY' }] },
  effects: [
    { type: 'includeDocument', targetKey: 'doc_foreign' },
    { type: 'includeNotice', targetKey: 'notice_foreign' },
    { type: 'includeFee', targetKey: 'fee_renewal' },
    { type: 'excludeStep', targetKey: 'step_urgent' },
  ],
})

function evaluatePhase8(answers: GuideAnswers, rules = phase8Rules) {
  return evaluateGuide({
    questions: [ageQuestion, issuanceQuestion, needsQuestion, countryQuestion],
    variants,
    notices,
    rules,
    documents: docs,
    steps,
    fees,
    answers,
  })
}

describe('P0-04 tri-state condition evaluation', () => {
  describe('operators', () => {
    it('A: notEquals + missing answer → UNKNOWN (rule does not fire)', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'notEquals', value: 'SY' },
          {},
        ),
      ).toBe('UNKNOWN')

      const result = evaluatePhase8(
        { age_group: 'yes', issuance: 'first_time' },
        [...phase8Rules, foreignRule],
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).not.toContain('rule_not_sy')
      expect(result.documents.map((d) => d.key)).not.toContain('doc_foreign')
      expect(result.notices.map((n) => n.key)).not.toContain('notice_foreign')
    })

    it('B: notEquals + equal → NO_MATCH', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'notEquals', value: 'SY' },
          { country: 'SY' },
        ),
      ).toBe('NO_MATCH')
    })

    it('C: notEquals + different → MATCH', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'notEquals', value: 'SY' },
          { country: 'TR' },
        ),
      ).toBe('MATCH')
    })

    it('D: equals + missing → UNKNOWN', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'equals', value: 'SY' },
          {},
        ),
      ).toBe('UNKNOWN')
    })

    it('E: includes + missing → UNKNOWN', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'needs', operator: 'includes', value: 'urgent' },
          {},
        ),
      ).toBe('UNKNOWN')
    })

    it('F: false boolean answer is treated as answered (not unanswered)', () => {
      const answers = { flag: false } as unknown as GuideAnswers
      expect(
        evaluateConditionResult({ questionKey: 'flag', operator: 'equals', value: 'false' }, answers),
      ).toBe('MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'flag', operator: 'equals', value: 'true' }, answers),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'flag', operator: 'exists' }, answers),
      ).toBe('MATCH')
    })

    it('G: 0 is treated as answered (not unanswered)', () => {
      const answers = { count: 0 } as unknown as GuideAnswers
      expect(
        evaluateConditionResult({ questionKey: 'count', operator: 'equals', value: '0' }, answers),
      ).toBe('MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'count', operator: 'notEquals', value: '1' }, answers),
      ).toBe('MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'count', operator: 'exists' }, answers),
      ).toBe('MATCH')
    })

    it('H: empty / whitespace string is unanswered → UNKNOWN for compare ops', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'notEquals', value: 'SY' },
          { country: '' },
        ),
      ).toBe('UNKNOWN')
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'equals', value: 'SY' },
          { country: '   ' },
        ),
      ).toBe('UNKNOWN')
    })

    it('I: empty multi-select [] is answered-empty (none selected), not unanswered', () => {
      // UI can persist [] after the citizen toggles options off.
      // includes → NO_MATCH (explicitly does not include the value).
      // exists → NO_MATCH (no usable selected values).
      expect(
        evaluateConditionResult(
          { questionKey: 'needs', operator: 'includes', value: 'urgent' },
          { needs: [] },
        ),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'needs', operator: 'exists' }, { needs: [] }),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult(
          { questionKey: 'needs', operator: 'equals', value: 'urgent' },
          { needs: [] },
        ),
      ).toBe('NO_MATCH')
    })

    it('R: exists semantics — absence/empty is NO_MATCH; usable value is MATCH; malformed UNKNOWN', () => {
      expect(
        evaluateConditionResult({ questionKey: 'country', operator: 'exists' }, {}),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'country', operator: 'exists' }, { country: '' }),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'country', operator: 'exists' }, { country: 'SY' }),
      ).toBe('MATCH')
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'exists' },
          { country: { bad: true } } as unknown as GuideAnswers,
        ),
      ).toBe('UNKNOWN')
    })
  })

  describe('empty condition groups (fail closed)', () => {
    it('1: empty ALL alone → UNKNOWN (does not fire effects)', () => {
      expect(evaluateGroupResult({ all: [] }, {})).toBe('UNKNOWN')
      const emptyAllRule = rule({
        key: 'rule_empty_all',
        when: { all: [] },
        effects: [{ type: 'includeDocument', targetKey: 'doc_foreign' }],
      })
      const result = evaluatePhase8({ age_group: 'yes', issuance: 'first_time' }, [emptyAllRule])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).not.toContain('rule_empty_all')
      expect(result.documents.map((d) => d.key)).not.toContain('doc_foreign')
    })

    it('2: empty ANY alone → UNKNOWN (does not fire effects)', () => {
      expect(evaluateGroupResult({ any: [] }, {})).toBe('UNKNOWN')
      const emptyAnyRule = rule({
        key: 'rule_empty_any',
        when: { any: [] },
        effects: [{ type: 'includeNotice', targetKey: 'notice_foreign' }],
      })
      const result = evaluatePhase8({ age_group: 'yes', issuance: 'first_time' }, [emptyAnyRule])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).not.toContain('rule_empty_any')
      expect(result.notices.map((n) => n.key)).not.toContain('notice_foreign')
    })

    it('3: both ALL and ANY empty → UNKNOWN; null group remains unconstrained MATCH', () => {
      expect(evaluateGroupResult({ all: [], any: [] }, {})).toBe('UNKNOWN')
      expect(evaluateGroupResult({}, {})).toBe('UNKNOWN')
      // No attached constraint (visibleWhen null) stays MATCH — always visible.
      expect(evaluateGroupResult(null, {})).toBe('MATCH')
      expect(evaluateGroupResult(undefined, {})).toBe('MATCH')

      const emptyBothRule = rule({
        key: 'rule_empty_both',
        when: { all: [], any: [] },
        effects: [
          { type: 'includeDocument', targetKey: 'doc_foreign' },
          { type: 'includeFee', targetKey: 'fee_renewal' },
        ],
      })
      const result = evaluatePhase8({ age_group: 'yes', issuance: 'first_time' }, [emptyBothRule])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).toEqual([])
      expect(result.documents.map((d) => d.key)).toEqual(['doc_id'])
      expect(result.fees.map((f) => f.key)).toEqual(['fee_base'])
    })

    it('4: valid non-empty group still behaves as before', () => {
      expect(
        evaluateGroupResult(
          { all: [{ questionKey: 'country', operator: 'notEquals', value: 'SY' }] },
          { country: 'TR' },
        ),
      ).toBe('MATCH')
      expect(
        evaluateGroupResult(
          { all: [{ questionKey: 'country', operator: 'notEquals', value: 'SY' }] },
          { country: 'SY' },
        ),
      ).toBe('NO_MATCH')
      // One empty bucket + one non-empty remains legitimate (vacuous on empty side).
      expect(
        evaluateGroupResult(
          {
            all: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }],
            any: [],
          },
          { age_group: 'yes' },
        ),
      ).toBe('MATCH')
      expect(
        evaluateGroupResult(
          {
            all: [],
            any: [{ questionKey: 'age_group', operator: 'equals', value: 'yes' }],
          },
          { age_group: 'yes' },
        ),
      ).toBe('MATCH')
    })
  })

  describe('answer presence regressions', () => {
    it('multi [] remains answered-empty; exists([]) NO_MATCH; required [] incomplete', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'needs', operator: 'includes', value: 'urgent' },
          { needs: [] },
        ),
      ).toBe('NO_MATCH')
      expect(
        evaluateConditionResult({ questionKey: 'needs', operator: 'exists' }, { needs: [] }),
      ).toBe('NO_MATCH')

      const requiredMulti = q({
        key: 'needs',
        prompt: 'احتياجات؟',
        questionType: 'multi',
        required: true,
        options: [
          { key: 'urgent', label: 'مستعجل' },
          { key: 'copy', label: 'نسخة' },
        ],
      })
      const incomplete = evaluateGuide({
        questions: [requiredMulti],
        variants,
        notices,
        rules: [],
        documents: docs,
        steps,
        fees,
        answers: { needs: [] },
      })
      expect(incomplete).toEqual(
        expect.objectContaining({ ok: false, reason: 'incomplete_answers' }),
      )
    })

    it('false and 0 remain legitimate answered values', () => {
      const falseAnswers = { flag: false } as unknown as GuideAnswers
      const zeroAnswers = { count: 0 } as unknown as GuideAnswers
      expect(
        evaluateConditionResult(
          { questionKey: 'flag', operator: 'equals', value: 'false' },
          falseAnswers,
        ),
      ).toBe('MATCH')
      expect(
        evaluateConditionResult(
          { questionKey: 'count', operator: 'equals', value: '0' },
          zeroAnswers,
        ),
      ).toBe('MATCH')
    })
  })

  describe('ALL / ANY groups', () => {
    it('J: ALL(MATCH, UNKNOWN) → UNKNOWN', () => {
      expect(
        evaluateGroupResult(
          {
            all: [
              { questionKey: 'age_group', operator: 'equals', value: 'yes' },
              { questionKey: 'country', operator: 'notEquals', value: 'SY' },
            ],
          },
          { age_group: 'yes' },
        ),
      ).toBe('UNKNOWN')
    })

    it('K: ALL(NO_MATCH, UNKNOWN) → NO_MATCH', () => {
      expect(
        evaluateGroupResult(
          {
            all: [
              { questionKey: 'age_group', operator: 'equals', value: 'no' },
              { questionKey: 'country', operator: 'notEquals', value: 'SY' },
            ],
          },
          { age_group: 'yes' },
        ),
      ).toBe('NO_MATCH')
    })

    it('L: ANY(MATCH, UNKNOWN) → MATCH', () => {
      expect(
        evaluateGroupResult(
          {
            any: [
              { questionKey: 'age_group', operator: 'equals', value: 'yes' },
              { questionKey: 'country', operator: 'notEquals', value: 'SY' },
            ],
          },
          { age_group: 'yes' },
        ),
      ).toBe('MATCH')
    })

    it('M: ANY(NO_MATCH, UNKNOWN) → UNKNOWN', () => {
      expect(
        evaluateGroupResult(
          {
            any: [
              { questionKey: 'age_group', operator: 'equals', value: 'no' },
              { questionKey: 'country', operator: 'notEquals', value: 'SY' },
            ],
          },
          { age_group: 'yes' },
        ),
      ).toBe('UNKNOWN')
    })
  })

  describe('rule application safety', () => {
    it('N: UNKNOWN rule produces zero conditional effects', () => {
      const result = evaluatePhase8(
        { age_group: 'yes', issuance: 'first_time' },
        [foreignRule],
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).toEqual([])
      expect(result.documents.map((d) => d.key)).toEqual(['doc_id'])
      // Catalog steps are included by default; UNKNOWN must not apply excludeStep either.
      expect(result.steps.map((s) => s.key)).toEqual([
        'step_prepare',
        'step_submit',
        'step_urgent',
      ])
      expect(result.fees.map((f) => f.key)).toEqual(['fee_base'])
      expect(result.notices).toEqual([])
      expect(result.variant).toBeNull()
    })

    it('O: empty answers object cannot activate conditional success paths', () => {
      // No required visible answers answered → incomplete before effects.
      // Even if evaluation skipped incompleteness, notEquals must stay UNKNOWN.
      expect(
        evaluateGroupResult(
          { all: [{ questionKey: 'country', operator: 'notEquals', value: 'SY' }] },
          {},
        ),
      ).toBe('UNKNOWN')

      const result = evaluateGuide({
        questions: [countryQuestion],
        variants,
        notices,
        rules: [foreignRule],
        documents: docs,
        steps,
        fees,
        answers: {},
      })
      // country is optional + only question → evaluation proceeds, rule must not fire
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).toEqual([])
      expect(result.documents.map((d) => d.key)).toEqual(['doc_id'])
      expect(result.notices).toEqual([])
    })

    it('P: fully answered Phase 8 fixtures preserve previous outputs', () => {
      const adult = evaluatePhase8({ age_group: 'yes', issuance: 'first_time' })
      expect(adult.ok).toBe(true)
      if (!adult.ok) return
      expect(adult.documents.map((d) => d.key)).toEqual(['doc_id'])
      expect(adult.notices).toHaveLength(0)
      expect(adult.variant?.key).toBe('variant_first')

      const minor = evaluatePhase8({ age_group: 'no', issuance: 'first_time' })
      expect(minor.ok).toBe(true)
      if (!minor.ok) return
      expect(minor.documents.map((d) => d.key)).toEqual(['doc_id', 'doc_guardian'])
      expect(minor.notices.map((n) => n.key)).toEqual(['notice_minor'])

      const renewal = evaluatePhase8({ age_group: 'yes', issuance: 'renewal' })
      expect(renewal.ok).toBe(true)
      if (!renewal.ok) return
      expect(renewal.variant?.key).toBe('variant_renewal')
      expect(renewal.documents.map((d) => d.key)).toContain('doc_old_passport')
      expect(renewal.fees.map((f) => f.key)).toEqual(['fee_base', 'fee_renewal'])

      const urgent = evaluatePhase8({
        age_group: 'yes',
        issuance: 'first_time',
        needs: ['urgent'],
      })
      expect(urgent.ok).toBe(true)
      if (!urgent.ok) return
      expect(urgent.steps.map((s) => s.key)).toContain('step_urgent')

      const both = evaluatePhase8({
        age_group: 'yes',
        issuance: 'first_time',
        needs: ['urgent', 'copy'],
      })
      expect(both.ok).toBe(true)
      if (!both.ok) return
      expect(both.steps.map((s) => s.key)).toEqual(['step_prepare', 'step_submit'])
    })

    it('Q: malformed data fails closed (UNKNOWN / no effects)', () => {
      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'notEquals', value: 'SY' },
          { country: { nested: 'TR' } } as unknown as GuideAnswers,
        ),
      ).toBe('UNKNOWN')

      expect(
        evaluateConditionResult(
          { questionKey: 'country', operator: 'bogus' as 'equals', value: 'SY' },
          { country: 'SY' },
        ),
      ).toBe('UNKNOWN')

      expect(
        evaluateConditionResult(
          null as unknown as { questionKey: string; operator: 'equals'; value: string },
          { country: 'SY' },
        ),
      ).toBe('UNKNOWN')

      const result = evaluatePhase8(
        {
          age_group: 'yes',
          issuance: 'first_time',
          country: { nested: 'TR' } as unknown as string,
        },
        [foreignRule],
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).not.toContain('rule_not_sy')
    })

    it('notEquals MATCH with answered different country still applies effects', () => {
      const result = evaluatePhase8(
        { age_group: 'yes', issuance: 'first_time', country: 'TR' },
        [...phase8Rules, foreignRule],
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.firedRuleKeys).toContain('rule_not_sy')
      expect(result.documents.map((d) => d.key)).toContain('doc_foreign')
      expect(result.notices.map((n) => n.key)).toContain('notice_foreign')
      expect(result.fees.map((f) => f.key)).toContain('fee_renewal')
      expect(result.steps.map((s) => s.key)).not.toContain('step_urgent')
    })
  })
})

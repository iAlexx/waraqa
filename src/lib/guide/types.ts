/** Phase 8 — typed guide domain (no CMS I/O). */

export const GUIDE_OPERATORS = ['equals', 'notEquals', 'includes', 'exists'] as const
export type GuideOperator = (typeof GUIDE_OPERATORS)[number]

/** Canonical internal condition evaluation result (P0-04). Never coerce UNKNOWN → true. */
export const CONDITION_RESULTS = ['MATCH', 'NO_MATCH', 'UNKNOWN'] as const
export type ConditionResult = (typeof CONDITION_RESULTS)[number]

export const GUIDE_EFFECT_TYPES = [
  'includeDocument',
  'excludeDocument',
  'includeStep',
  'excludeStep',
  'includeFee',
  'excludeFee',
  'includeNotice',
  'excludeNotice',
  'selectVariant',
] as const
export type GuideEffectType = (typeof GUIDE_EFFECT_TYPES)[number]

export const GUIDE_QUESTION_TYPES = ['single', 'multi', 'boolean'] as const
export type GuideQuestionType = (typeof GUIDE_QUESTION_TYPES)[number]

export type GuideCondition = {
  questionKey: string
  operator: GuideOperator
  value?: string | null
}

export type GuideConditionGroup = {
  all?: GuideCondition[]
  any?: GuideCondition[]
}

export type GuideEffect = {
  type: GuideEffectType
  targetKey: string
}

export type GuideQuestionOption = {
  key: string
  label: string
}

export type GuideQuestion = {
  key: string
  questionType: GuideQuestionType
  prompt: string
  helpText: string | null
  required: boolean
  active: boolean
  options: GuideQuestionOption[]
  visibleWhen: GuideConditionGroup | null
}

export type GuideVariant = {
  key: string
  title: string
  explanation: string | null
  active: boolean
}

export type GuideNotice = {
  key: string
  title: string
  body: string
  severity: 'info' | 'warning'
  active: boolean
}

export type GuideDecisionRule = {
  key: string
  priority: number
  active: boolean
  explanation: string | null
  when: GuideConditionGroup
  effects: GuideEffect[]
}

export type GuideContentRef = {
  key: string
  /** required | conditional | alternative — documents only */
  requirementType?: string | null
  title: string
  detail: string | null
}

/** Visitor answers: questionKey → option key | option keys[] | 'yes'|'no' */
export type GuideAnswers = Record<string, string | string[]>

export type ChecklistKind = 'generally_required' | 'required_by_answers' | 'verify_with_authority'

export type GuideChecklistItem = {
  key: string
  kind: ChecklistKind
  title: string
  detail: string | null
  why: string | null
}

export type GuideEvaluationResult = {
  ok: true
  variant: GuideVariant | null
  documents: GuideChecklistItem[]
  steps: GuideChecklistItem[]
  fees: GuideChecklistItem[]
  notices: Array<GuideNotice & { why: string | null }>
  firedRuleKeys: string[]
  visibleQuestionKeys: string[]
}

export type GuideEvaluationFailure = {
  ok: false
  reason: 'invalid_config' | 'conflicting_variants' | 'incomplete_answers'
  message: string
}

export type GuideEvaluationOutput = GuideEvaluationResult | GuideEvaluationFailure

/** Stable key format: starts with letter, then letters/digits/underscore. */
export const STABLE_KEY_RE = /^[a-z][a-z0-9_]{1,63}$/

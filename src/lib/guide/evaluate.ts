import type {
  ConditionResult,
  GuideAnswers,
  GuideChecklistItem,
  GuideCondition,
  GuideConditionGroup,
  GuideContentRef,
  GuideDecisionRule,
  GuideEffect,
  GuideEvaluationOutput,
  GuideNotice,
  GuideOperator,
  GuideQuestion,
  GuideVariant,
} from '@/lib/guide/types'
import { GUIDE_OPERATORS } from '@/lib/guide/types'

function isOperator(value: unknown): value is GuideOperator {
  return typeof value === 'string' && (GUIDE_OPERATORS as readonly string[]).includes(value)
}

/**
 * Unanswered / unusable answer detection (no JS truthiness shortcuts).
 *
 * Unanswered:
 * - missing key, undefined, null
 * - "" or whitespace-only string
 *
 * Answered (including empty multi selection):
 * - [] is a present multi answer meaning “none selected” (UI can write this after toggles)
 * - false / 0 are answered if ever supplied (defensive; normal guide answers are strings)
 *
 * Unusable (malformed): any other non-string / non-array shape → UNKNOWN for compare ops
 */
type AnswerInspection =
  | { kind: 'unanswered' }
  | { kind: 'unusable' }
  | { kind: 'answered'; values: string[] }

function inspectAnswer(answers: GuideAnswers, questionKey: string): AnswerInspection {
  if (!Object.prototype.hasOwnProperty.call(answers, questionKey)) {
    return { kind: 'unanswered' }
  }
  const raw = (answers as Record<string, unknown>)[questionKey]

  if (raw === undefined || raw === null) {
    return { kind: 'unanswered' }
  }

  if (typeof raw === 'boolean') {
    return { kind: 'answered', values: [raw ? 'true' : 'false'] }
  }

  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) return { kind: 'unusable' }
    return { kind: 'answered', values: [String(raw)] }
  }

  if (typeof raw === 'string') {
    if (raw.trim() === '') return { kind: 'unanswered' }
    return { kind: 'answered', values: [raw] }
  }

  if (Array.isArray(raw)) {
    const values: string[] = []
    for (const item of raw) {
      if (typeof item === 'boolean') {
        values.push(item ? 'true' : 'false')
        continue
      }
      if (typeof item === 'number') {
        if (Number.isNaN(item)) return { kind: 'unusable' }
        values.push(String(item))
        continue
      }
      if (typeof item !== 'string') return { kind: 'unusable' }
      if (item.trim() === '') continue
      values.push(item)
    }
    // [] remains answered-empty (explicit none), not unanswered
    return { kind: 'answered', values }
  }

  return { kind: 'unusable' }
}

/** Values used for required-answer completeness (aligned with inspectAnswer). */
function normalizeAnswer(raw: string | string[] | undefined): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'string' ? v : String(v)))
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  }
  const s = String(raw).trim()
  return s ? [s] : []
}

function andResults(a: ConditionResult, b: ConditionResult): ConditionResult {
  if (a === 'NO_MATCH' || b === 'NO_MATCH') return 'NO_MATCH'
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return 'UNKNOWN'
  return 'MATCH'
}

function orResults(a: ConditionResult, b: ConditionResult): ConditionResult {
  if (a === 'MATCH' || b === 'MATCH') return 'MATCH'
  if (a === 'UNKNOWN' || b === 'UNKNOWN') return 'UNKNOWN'
  return 'NO_MATCH'
}

function combineAll(results: ConditionResult[]): ConditionResult {
  let acc: ConditionResult = 'MATCH'
  for (const r of results) acc = andResults(acc, r)
  return acc
}

function combineAny(results: ConditionResult[]): ConditionResult {
  if (results.length === 0) return 'MATCH'
  let acc: ConditionResult = 'NO_MATCH'
  for (const r of results) acc = orResults(acc, r)
  return acc
}

/**
 * Evaluate a single condition to MATCH | NO_MATCH | UNKNOWN.
 *
 * exists: asks whether a usable non-empty answer is present.
 * Missing / empty / whitespace → NO_MATCH (not UNKNOWN).
 * Malformed → UNKNOWN (fail closed; do not claim existence).
 */
export function evaluateConditionResult(
  cond: GuideCondition,
  answers: GuideAnswers,
): ConditionResult {
  if (!cond || typeof cond !== 'object') return 'UNKNOWN'
  if (!isOperator(cond.operator)) return 'UNKNOWN'

  const inspection = inspectAnswer(answers, cond.questionKey)
  const expected = cond.value ?? ''

  switch (cond.operator) {
    case 'exists': {
      if (inspection.kind === 'unusable') return 'UNKNOWN'
      if (inspection.kind === 'unanswered') return 'NO_MATCH'
      return inspection.values.length > 0 ? 'MATCH' : 'NO_MATCH'
    }
    case 'equals': {
      if (inspection.kind !== 'answered') return 'UNKNOWN'
      return inspection.values.length === 1 && inspection.values[0] === expected
        ? 'MATCH'
        : 'NO_MATCH'
    }
    case 'notEquals': {
      if (inspection.kind !== 'answered') return 'UNKNOWN'
      return !(inspection.values.length === 1 && inspection.values[0] === expected)
        ? 'MATCH'
        : 'NO_MATCH'
    }
    case 'includes': {
      if (inspection.kind !== 'answered') return 'UNKNOWN'
      return inspection.values.includes(expected) ? 'MATCH' : 'NO_MATCH'
    }
    default:
      return 'UNKNOWN'
  }
}

/**
 * Flat ALL/ANY group evaluation (no nested trees).
 *
 * - null/undefined group → MATCH (no constraint attached; used by visibleWhen).
 * - Effectively empty group (`{}` / `{ all: [], any: [] }`) → UNKNOWN.
 *   Decision rules can reach the evaluator with empty `when` (schema allows empty
 *   arrays; public map uses `mapConditions(...) ?? { all: [], any: [] }`). Vacuous
 *   MATCH would fire government-service effects unconditionally — refuse that.
 * - One empty bucket + one non-empty: empty bucket is vacuous MATCH; combine with AND.
 */
export function evaluateGroupResult(
  group: GuideConditionGroup | null | undefined,
  answers: GuideAnswers,
): ConditionResult {
  if (!group) return 'MATCH'
  const all = group.all ?? []
  const any = group.any ?? []
  if (all.length === 0 && any.length === 0) return 'UNKNOWN'

  const allResult =
    all.length === 0 ? 'MATCH' : combineAll(all.map((c) => evaluateConditionResult(c, answers)))
  const anyResult =
    any.length === 0 ? 'MATCH' : combineAny(any.map((c) => evaluateConditionResult(c, answers)))

  return andResults(allResult, anyResult)
}

function isMatch(result: ConditionResult): boolean {
  return result === 'MATCH'
}

export function visibleQuestions(
  questions: GuideQuestion[],
  answers: GuideAnswers,
): GuideQuestion[] {
  return questions.filter((q) => {
    if (!q.active) return false
    return isMatch(evaluateGroupResult(q.visibleWhen, answers))
  })
}

function applyEffect(
  effect: GuideEffect,
  state: {
    docs: Set<string>
    steps: Set<string>
    fees: Set<string>
    notices: Set<string>
    variants: string[]
  },
): void {
  const k = effect.targetKey
  switch (effect.type) {
    case 'includeDocument':
      state.docs.add(k)
      break
    case 'excludeDocument':
      state.docs.delete(k)
      break
    case 'includeStep':
      state.steps.add(k)
      break
    case 'excludeStep':
      state.steps.delete(k)
      break
    case 'includeFee':
      state.fees.add(k)
      break
    case 'excludeFee':
      state.fees.delete(k)
      break
    case 'includeNotice':
      state.notices.add(k)
      break
    case 'excludeNotice':
      state.notices.delete(k)
      break
    case 'selectVariant':
      state.variants.push(k)
      break
    default:
      break
  }
}

function buildChecklist(
  keys: Set<string>,
  catalog: GuideContentRef[],
  whyByKey: Map<string, string>,
  defaultKind: GuideChecklistItem['kind'],
): GuideChecklistItem[] {
  const byKey = new Map(catalog.map((c) => [c.key, c]))
  const items: GuideChecklistItem[] = []
  for (const ref of catalog) {
    if (!keys.has(ref.key)) continue
    const why = whyByKey.get(ref.key) ?? null
    let kind = defaultKind
    if (ref.requirementType === 'conditional' || ref.requirementType === 'alternative') {
      kind = why ? 'required_by_answers' : 'verify_with_authority'
    } else if (why) {
      kind = 'required_by_answers'
    }
    items.push({
      key: ref.key,
      kind,
      title: ref.title,
      detail: ref.detail,
      why,
    })
  }
  // Preserve catalog order; ignore unknown keys (fail closed — already filtered)
  void byKey
  return items
}

export type EvaluateGuideInput = {
  questions: GuideQuestion[]
  variants: GuideVariant[]
  notices: GuideNotice[]
  rules: GuideDecisionRule[]
  documents: GuideContentRef[]
  steps: GuideContentRef[]
  fees: GuideContentRef[]
  answers: GuideAnswers
}

/**
 * Pure deterministic guide evaluator.
 * Exclusion overrides inclusion when applied later (higher priority runs after lower).
 * Rules fire only when condition group result === MATCH (never UNKNOWN).
 */
export function evaluateGuide(input: EvaluateGuideInput): GuideEvaluationOutput {
  const visible = visibleQuestions(input.questions, input.answers)
  const visibleKeys = visible.map((q) => q.key)

  for (const q of visible) {
    if (!q.required) continue
    const inspection = inspectAnswer(input.answers, q.key)
    const vals =
      inspection.kind === 'answered'
        ? inspection.values
        : normalizeAnswer(input.answers[q.key])
    if (inspection.kind !== 'answered' || vals.length < 1) {
      return {
        ok: false,
        reason: 'incomplete_answers',
        message: 'أجب على كل الأسئلة الإلزامية الظاهرة قبل عرض النتيجة.',
      }
    }
  }

  const docs = new Set<string>()
  const steps = new Set<string>()
  const fees = new Set<string>()
  const notices = new Set<string>()
  const whyDocs = new Map<string, string>()
  const whySteps = new Map<string, string>()
  const whyFees = new Map<string, string>()
  const whyNotices = new Map<string, string>()

  for (const d of input.documents) {
    if (d.requirementType === 'required' || !d.requirementType) {
      docs.add(d.key)
    }
  }
  for (const s of input.steps) steps.add(s.key)

  const includeOnlyFeeKeys = new Set<string>()
  for (const rule of input.rules) {
    if (rule.active === false) continue
    for (const effect of rule.effects) {
      if (effect.type === 'includeFee') includeOnlyFeeKeys.add(effect.targetKey)
    }
  }
  for (const f of input.fees) {
    if (!includeOnlyFeeKeys.has(f.key)) fees.add(f.key)
  }

  const activeRules = [...input.rules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))

  const fired: string[] = []
  const selectedVariants: string[] = []

  for (const rule of activeRules) {
    if (!isMatch(evaluateGroupResult(rule.when, input.answers))) continue
    fired.push(rule.key)
    const explanation = rule.explanation
    for (const effect of rule.effects) {
      const state = { docs, steps, fees, notices, variants: selectedVariants }
      applyEffect(effect, state)
      if (explanation) {
        if (effect.type === 'includeDocument' || effect.type === 'excludeDocument') {
          whyDocs.set(effect.targetKey, explanation)
        }
        if (effect.type === 'includeStep' || effect.type === 'excludeStep') {
          whySteps.set(effect.targetKey, explanation)
        }
        if (effect.type === 'includeFee' || effect.type === 'excludeFee') {
          whyFees.set(effect.targetKey, explanation)
        }
        if (effect.type === 'includeNotice' || effect.type === 'excludeNotice') {
          whyNotices.set(effect.targetKey, explanation)
        }
      }
    }
  }

  const uniqueVariants = [...new Set(selectedVariants)]
  if (uniqueVariants.length > 1) {
    return {
      ok: false,
      reason: 'conflicting_variants',
      message: 'تعارض في اختيار المتغير — لا يمكن عرض نتيجة موثوقة.',
    }
  }

  const variantKey = uniqueVariants[0] ?? null
  const variant =
    variantKey != null
      ? input.variants.find((v) => v.key === variantKey && v.active) ?? null
      : null
  if (variantKey && !variant) {
    return {
      ok: false,
      reason: 'invalid_config',
      message: 'متغير النتيجة غير متاح.',
    }
  }

  const noticeItems = input.notices
    .filter((n) => n.active && notices.has(n.key))
    .map((n) => ({ ...n, why: whyNotices.get(n.key) ?? null }))

  return {
    ok: true,
    variant,
    documents: buildChecklist(docs, input.documents, whyDocs, 'generally_required'),
    steps: buildChecklist(steps, input.steps, whySteps, 'generally_required'),
    fees: buildChecklist(fees, input.fees, whyFees, 'generally_required'),
    notices: noticeItems,
    firedRuleKeys: fired,
    visibleQuestionKeys: visibleKeys,
  }
}

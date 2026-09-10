import type {
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

function normalizeAnswer(raw: string | string[] | undefined): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  return raw ? [String(raw)] : []
}

function evaluateCondition(cond: GuideCondition, answers: GuideAnswers): boolean {
  if (!isOperator(cond.operator)) return false
  const answered = Object.prototype.hasOwnProperty.call(answers, cond.questionKey)
  const values = normalizeAnswer(answers[cond.questionKey])

  switch (cond.operator) {
    case 'exists':
      return answered && values.length > 0
    case 'equals':
      return values.length === 1 && values[0] === (cond.value ?? '')
    case 'notEquals':
      if (!answered || values.length === 0) return true
      return !(values.length === 1 && values[0] === (cond.value ?? ''))
    case 'includes':
      return values.includes(cond.value ?? '')
    default:
      return false
  }
}

function evaluateGroup(group: GuideConditionGroup | null | undefined, answers: GuideAnswers): boolean {
  if (!group) return true
  const all = group.all ?? []
  const any = group.any ?? []
  if (all.length === 0 && any.length === 0) return true
  const allOk = all.length === 0 || all.every((c) => evaluateCondition(c, answers))
  const anyOk = any.length === 0 || any.some((c) => evaluateCondition(c, answers))
  return allOk && anyOk
}

export function visibleQuestions(
  questions: GuideQuestion[],
  answers: GuideAnswers,
): GuideQuestion[] {
  return questions.filter((q) => {
    if (!q.active) return false
    return evaluateGroup(q.visibleWhen, answers)
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
 */
export function evaluateGuide(input: EvaluateGuideInput): GuideEvaluationOutput {
  const visible = visibleQuestions(input.questions, input.answers)
  const visibleKeys = visible.map((q) => q.key)

  for (const q of visible) {
    if (!q.required) continue
    const vals = normalizeAnswer(input.answers[q.key])
    if (vals.length < 1) {
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
    if (!evaluateGroup(rule.when, input.answers)) continue
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

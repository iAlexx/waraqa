import type { CollectionBeforeValidateHook } from 'payload'

import {
  GUIDE_EFFECT_TYPES,
  GUIDE_OPERATORS,
  GUIDE_QUESTION_TYPES,
  STABLE_KEY_RE,
  type GuideCondition,
  type GuideEffectType,
  type GuideOperator,
  type GuideQuestionType,
} from '@/lib/guide/types'

type Localized = string | Record<string, string | null | undefined> | null | undefined

function loc(value: Localized): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value.ar === 'string' && value.ar.trim()) return value.ar.trim()
  for (const v of Object.values(value)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

function serializeWhen(group: Record<string, unknown> | null | undefined): string {
  if (!group) return '{}'
  return JSON.stringify(group)
}

function pushUnique(errors: string[], msg: string) {
  if (!errors.includes(msg)) errors.push(msg)
}

function validateKey(key: unknown, label: string, used: Set<string>, errors: string[]) {
  if (typeof key !== 'string' || !STABLE_KEY_RE.test(key)) {
    pushUnique(errors, `${label}: مفتاح غير صالح (${String(key)}).`)
    return
  }
  if (used.has(key)) {
    pushUnique(errors, `${label}: مفتاح مكرر «${key}».`)
    return
  }
  used.add(key)
}

function validateConditions(
  group: Record<string, unknown> | null | undefined,
  questionKeys: Set<string>,
  optionKeysByQuestion: Map<string, Set<string>>,
  questionTypes: Map<string, GuideQuestionType>,
  errors: string[],
  ctx: string,
) {
  if (!group) return
  const buckets = [
    ...(Array.isArray(group.all) ? (group.all as GuideCondition[]) : []),
    ...(Array.isArray(group.any) ? (group.any as GuideCondition[]) : []),
  ]
  for (const cond of buckets) {
    if (!cond || typeof cond !== 'object') {
      pushUnique(errors, `${ctx}: شرط غير صالح.`)
      continue
    }
    if (!questionKeys.has(cond.questionKey)) {
      pushUnique(errors, `${ctx}: يشير إلى سؤال غير موجود «${cond.questionKey}».`)
    }
    if (!(GUIDE_OPERATORS as readonly string[]).includes(cond.operator as GuideOperator)) {
      pushUnique(errors, `${ctx}: عامل غير مدعوم.`)
    }
    const op = cond.operator as GuideOperator
    if (op !== 'exists') {
      if (typeof cond.value !== 'string' || !cond.value.trim()) {
        pushUnique(errors, `${ctx}: القيمة مطلوبة للعامل ${op}.`)
      } else {
        const qType = questionTypes.get(cond.questionKey)
        if (qType === 'boolean') {
          if (cond.value !== 'yes' && cond.value !== 'no') {
            pushUnique(errors, `${ctx}: قيمة نعم/لا يجب أن تكون yes أو no.`)
          }
        } else if (qType === 'single' || qType === 'multi') {
          const opts = optionKeysByQuestion.get(cond.questionKey)
          if (opts && !opts.has(cond.value)) {
            pushUnique(errors, `${ctx}: خيار غير معروف «${cond.value}».`)
          }
        }
      }
    }
  }
}

/**
 * Validates guide configuration. Publishing with guideEnabled + invalid guide fails closed.
 * Empty guide (no questions) with guideEnabled=false is OK.
 */
export function validateGuideData(data: Record<string, unknown>): string[] {
  const errors: string[] = []
  const guideEnabled = data.guideEnabled === true
  const questions = asRows(data.questions)
  const variants = asRows(data.variants)
  const notices = asRows(data.notices)
  const rules = asRows(data.decisionRules)
  const documents = asRows(data.requiredDocuments)
  const steps = asRows(data.steps)
  const fees = asRows(data.fees)

  const docKeys = new Set<string>()
  const stepKeys = new Set<string>()
  const feeKeys = new Set<string>()
  const noticeKeys = new Set<string>()
  const variantKeys = new Set<string>()
  const questionKeys = new Set<string>()
  const optionKeysByQuestion = new Map<string, Set<string>>()
  const questionTypes = new Map<string, GuideQuestionType>()

  for (const row of documents) {
    if (row.key) validateKey(row.key, 'وثيقة', docKeys, errors)
  }
  for (const row of steps) {
    if (row.key) validateKey(row.key, 'خطوة', stepKeys, errors)
  }
  for (const row of fees) {
    if (row.key) validateKey(row.key, 'رسم', feeKeys, errors)
  }

  for (const q of questions) {
    validateKey(q.key, 'سؤال', questionKeys, errors)
    const qType = q.questionType as GuideQuestionType
    if (!(GUIDE_QUESTION_TYPES as readonly string[]).includes(qType)) {
      pushUnique(errors, `سؤال «${String(q.key)}»: نوع غير مدعوم.`)
    } else {
      questionTypes.set(String(q.key), qType)
    }
    if (!loc(q.prompt as Localized)) {
      pushUnique(errors, `سؤال «${String(q.key)}»: نص السؤال مطلوب.`)
    }
    const optUsed = new Set<string>()
    const opts = asRows(q.options)
    if (qType === 'single' || qType === 'multi') {
      if (opts.length < 2) {
        pushUnique(errors, `سؤال «${String(q.key)}»: يحتاج خيارين على الأقل.`)
      }
      for (const opt of opts) {
        validateKey(opt.key, `خيار في ${String(q.key)}`, optUsed, errors)
        if (!loc(opt.label as Localized)) {
          pushUnique(errors, `خيار في «${String(q.key)}»: التسمية مطلوبة.`)
        }
      }
    }
    optionKeysByQuestion.set(String(q.key), optUsed)
  }

  for (const q of questions) {
    validateConditions(
      q.visibleWhen as Record<string, unknown>,
      questionKeys,
      optionKeysByQuestion,
      questionTypes,
      errors,
      `ظهور السؤال «${String(q.key)}»`,
    )
  }

  for (const v of variants) {
    validateKey(v.key, 'متغير', variantKeys, errors)
    if (!loc(v.title as Localized)) {
      pushUnique(errors, `متغير «${String(v.key)}»: العنوان مطلوب.`)
    }
  }

  for (const n of notices) {
    validateKey(n.key, 'ملاحظة', noticeKeys, errors)
    if (!loc(n.title as Localized) || !loc(n.body as Localized)) {
      pushUnique(errors, `ملاحظة «${String(n.key)}»: العنوان والنص مطلوبان.`)
    }
  }

  const variantSelectRules: Array<{ ruleKey: string; whenKey: string; target: string }> = []
  const ruleKeys = new Set<string>()

  for (const rule of rules) {
    validateKey(rule.key, 'قاعدة', ruleKeys, errors)
    if (typeof rule.priority !== 'number' || Number.isNaN(rule.priority)) {
      pushUnique(errors, `قاعدة «${String(rule.key)}»: الأولوية مطلوبة.`)
    }
    const when = (rule.when ?? {}) as Record<string, unknown>
    validateConditions(
      when,
      questionKeys,
      optionKeysByQuestion,
      questionTypes,
      errors,
      `قاعدة «${String(rule.key)}»`,
    )
    const effects = asRows(rule.effects)
    if (effects.length < 1) {
      pushUnique(errors, `قاعدة «${String(rule.key)}»: تحتاج تأثيراً واحداً على الأقل.`)
    }
    for (const fx of effects) {
      const type = fx.type as GuideEffectType
      if (!(GUIDE_EFFECT_TYPES as readonly string[]).includes(type)) {
        pushUnique(errors, `قاعدة «${String(rule.key)}»: نوع تأثير غير مدعوم.`)
        continue
      }
      const target = typeof fx.targetKey === 'string' ? fx.targetKey : ''
      if (!STABLE_KEY_RE.test(target)) {
        pushUnique(errors, `قاعدة «${String(rule.key)}»: مفتاح هدف غير صالح.`)
        continue
      }
      if (type === 'includeDocument' || type === 'excludeDocument') {
        if (!docKeys.has(target)) {
          pushUnique(errors, `قاعدة «${String(rule.key)}»: وثيقة غير موجودة «${target}».`)
        }
      } else if (type === 'includeStep' || type === 'excludeStep') {
        if (!stepKeys.has(target)) {
          pushUnique(errors, `قاعدة «${String(rule.key)}»: خطوة غير موجودة «${target}».`)
        }
      } else if (type === 'includeFee' || type === 'excludeFee') {
        if (!feeKeys.has(target)) {
          pushUnique(errors, `قاعدة «${String(rule.key)}»: رسم غير موجود «${target}».`)
        }
      } else if (type === 'includeNotice' || type === 'excludeNotice') {
        if (!noticeKeys.has(target)) {
          pushUnique(errors, `قاعدة «${String(rule.key)}»: ملاحظة غير موجودة «${target}».`)
        }
      } else if (type === 'selectVariant') {
        if (!variantKeys.has(target)) {
          pushUnique(errors, `قاعدة «${String(rule.key)}»: متغير غير موجود «${target}».`)
        }
        variantSelectRules.push({
          ruleKey: String(rule.key),
          whenKey: serializeWhen(when),
          target,
        })
      }
    }
  }

  for (let i = 0; i < variantSelectRules.length; i++) {
    for (let j = i + 1; j < variantSelectRules.length; j++) {
      const a = variantSelectRules[i]!
      const b = variantSelectRules[j]!
      if (a.target !== b.target && a.whenKey === b.whenKey) {
        pushUnique(
          errors,
          `تعارض متغيرات: القواعد «${a.ruleKey}» و«${b.ruleKey}» تشتركان في الشروط وتختار متغيرات مختلفة (${a.target}, ${b.target}).`,
        )
      }
    }
  }

  if (guideEnabled) {
    const activeQuestions = questions.filter((q) => q.active !== false)
    if (activeQuestions.length < 1) {
      pushUnique(errors, 'لتفعيل الدليل يجب إضافة سؤال نشط واحد على الأقل.')
    }
  }

  // Publishing with invalid guide while enabled is blocked by throwing below.
  // When guideEnabled and publishing, any error blocks.
  return errors
}

export const validateGuideOnTransaction: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  const errors = validateGuideData(data as Record<string, unknown>)
  if (errors.length) {
    throw new Error(errors.join(' '))
  }
  return data
}

/** Public eligibility: enabled + at least one active question + no structural errors. */
export function isPublicGuideAvailable(data: Record<string, unknown>): boolean {
  if (data.guideEnabled !== true) return false
  const errors = validateGuideData(data)
  if (errors.length) return false
  const questions = asRows(data.questions).filter((q) => q.active !== false)
  return questions.length > 0
}

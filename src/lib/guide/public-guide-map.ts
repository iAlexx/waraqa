import { localizedString, type LocalizedLike } from '@/lib/public/localized'
import { isPublicGuideAvailable } from '@/lib/guide/validate-guide'
import type {
  GuideAnswers,
  GuideCondition,
  GuideConditionGroup,
  GuideContentRef,
  GuideDecisionRule,
  GuideEffect,
  GuideNotice,
  GuideQuestion,
  GuideQuestionType,
  GuideVariant,
} from '@/lib/guide/types'
import { GUIDE_EFFECT_TYPES, GUIDE_OPERATORS, GUIDE_QUESTION_TYPES } from '@/lib/guide/types'
import { toSafePublicLink, type SafePublicUrl } from '@/lib/public/safe-url'
import { formatPublicDate } from '@/lib/public/transaction-labels'
import { evaluateGuide } from '@/lib/guide/evaluate'
import type { GuideEvaluationOutput } from '@/lib/guide/types'

export type PublicGuideDTO = {
  transactionId: number | string
  slug: string
  title: string
  summary: string
  lastReviewedLabel: string | null
  lastReviewedAt: string | null
  demoLabeled: boolean
  questions: GuideQuestion[]
  variants: GuideVariant[]
  notices: GuideNotice[]
  rules: GuideDecisionRule[]
  documents: GuideContentRef[]
  steps: GuideContentRef[]
  fees: GuideContentRef[]
  sources: Array<{
    title: string
    primary: boolean
    officialLink: SafePublicUrl | null
  }>
  detailHref: string
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

function mapConditions(group: unknown): GuideConditionGroup | null {
  if (!group || typeof group !== 'object') return null
  const g = group as Record<string, unknown>
  const mapRow = (row: unknown): GuideCondition | null => {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    const operator = r.operator
    if (typeof r.questionKey !== 'string') return null
    if (typeof operator !== 'string' || !(GUIDE_OPERATORS as readonly string[]).includes(operator)) {
      return null
    }
    return {
      questionKey: r.questionKey,
      operator: operator as GuideCondition['operator'],
      value: typeof r.value === 'string' ? r.value : null,
    }
  }
  const all = asRows(g.all).map(mapRow).filter(Boolean) as GuideCondition[]
  const any = asRows(g.any).map(mapRow).filter(Boolean) as GuideCondition[]
  if (all.length === 0 && any.length === 0) return null
  return { all, any }
}

function mapQuestions(raw: unknown): GuideQuestion[] {
  return asRows(raw)
    .map((q) => {
      const questionType = q.questionType as GuideQuestionType
      if (
        typeof q.key !== 'string' ||
        !(GUIDE_QUESTION_TYPES as readonly string[]).includes(questionType)
      ) {
        return null
      }
      const prompt = localizedString(q.prompt as LocalizedLike)
      if (!prompt) return null
      return {
        key: q.key,
        questionType,
        prompt,
        helpText: localizedString(q.helpText as LocalizedLike) || null,
        required: q.required !== false,
        active: q.active !== false,
        options: asRows(q.options)
          .map((o) => {
            if (typeof o.key !== 'string') return null
            const label = localizedString(o.label as LocalizedLike)
            if (!label) return null
            return { key: o.key, label }
          })
          .filter(Boolean) as GuideQuestion['options'],
        visibleWhen: mapConditions(q.visibleWhen),
      } satisfies GuideQuestion
    })
    .filter(Boolean) as GuideQuestion[]
}

/**
 * Map a publicly eligible transaction document (depth ≥ 1) to a public guide DTO.
 * Returns null if guide is unavailable or invalid.
 */
export function mapPublicGuide(doc: Record<string, unknown>): PublicGuideDTO | null {
  if (!isPublicGuideAvailable(doc)) return null

  const title = localizedString(doc.title as LocalizedLike)
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  const summary = localizedString(doc.summary as LocalizedLike)
  if (!title || !slug) return null

  const questions = mapQuestions(doc.questions).filter((q) => q.active)
  if (questions.length < 1) return null

  const variants = asRows(doc.variants)
    .map((v) => {
      if (typeof v.key !== 'string' || v.active === false) return null
      const vTitle = localizedString(v.title as LocalizedLike)
      if (!vTitle) return null
      return {
        key: v.key,
        title: vTitle,
        explanation: localizedString(v.explanation as LocalizedLike) || null,
        active: true,
      } satisfies GuideVariant
    })
    .filter(Boolean) as GuideVariant[]

  const notices = asRows(doc.notices)
    .map((n) => {
      if (typeof n.key !== 'string' || n.active === false) return null
      const nTitle = localizedString(n.title as LocalizedLike)
      const body = localizedString(n.body as LocalizedLike)
      if (!nTitle || !body) return null
      return {
        key: n.key,
        title: nTitle,
        body,
        severity: n.severity === 'warning' ? 'warning' : 'info',
        active: true,
      } satisfies GuideNotice
    })
    .filter(Boolean) as GuideNotice[]

  const rules = asRows(doc.decisionRules)
    .map((r) => {
      if (typeof r.key !== 'string' || r.active === false) return null
      const effects = asRows(r.effects)
        .map((fx) => {
          if (
            typeof fx.type !== 'string' ||
            !(GUIDE_EFFECT_TYPES as readonly string[]).includes(fx.type) ||
            typeof fx.targetKey !== 'string'
          ) {
            return null
          }
          return { type: fx.type as GuideEffect['type'], targetKey: fx.targetKey }
        })
        .filter(Boolean) as GuideEffect[]
      if (effects.length < 1) return null
      return {
        key: r.key,
        priority: typeof r.priority === 'number' ? r.priority : 100,
        active: true,
        explanation: localizedString(r.explanation as LocalizedLike) || null,
        when: mapConditions(r.when) ?? { all: [], any: [] },
        effects,
      } satisfies GuideDecisionRule
    })
    .filter(Boolean) as GuideDecisionRule[]

  const documents: GuideContentRef[] = asRows(doc.requiredDocuments)
    .map((row) => {
      if (typeof row.key !== 'string') return null
      const docRel = row.document
      const name =
        docRel && typeof docRel === 'object'
          ? localizedString((docRel as { name?: LocalizedLike }).name)
          : ''
      if (!name) return null
      return {
        key: row.key,
        requirementType: typeof row.requirementType === 'string' ? row.requirementType : null,
        title: name,
        detail: localizedString(row.notes as LocalizedLike) || null,
      }
    })
    .filter(Boolean) as GuideContentRef[]

  const steps: GuideContentRef[] = asRows(doc.steps)
    .map((row) => {
      if (typeof row.key !== 'string') return null
      const stepTitle = localizedString(row.title as LocalizedLike)
      if (!stepTitle) return null
      return {
        key: row.key,
        title: stepTitle,
        detail: localizedString(row.description as LocalizedLike) || null,
      }
    })
    .filter(Boolean) as GuideContentRef[]

  const fees: GuideContentRef[] = asRows(doc.fees)
    .map((row) => {
      if (typeof row.key !== 'string') return null
      const label = localizedString(row.label as LocalizedLike)
      if (!label) return null
      const amountText = localizedString(row.amountText as LocalizedLike)
      const amount =
        typeof row.amount === 'number' ? `${row.amount}${row.currency ? ` ${row.currency}` : ''}` : ''
      const notes = localizedString(row.notes as LocalizedLike)
      return {
        key: row.key,
        title: label,
        detail: [amount || amountText, notes].filter(Boolean).join(' — ') || null,
      }
    })
    .filter(Boolean) as GuideContentRef[]

  const lastReviewedAt = typeof doc.lastReviewedAt === 'string' ? doc.lastReviewedAt : null

  const sources = asRows(doc.sources)
    .map((row) => {
      const src = row.source
      if (!src || typeof src !== 'object') return null
      const s = src as Record<string, unknown>
      if (s._status != null && s._status !== 'published') return null
      if (s.active === false) return null
      const sTitle = localizedString(s.title as LocalizedLike)
      if (!sTitle) return null
      return {
        title: sTitle,
        primary: Boolean(row.primary),
        officialLink: toSafePublicLink(
          typeof s.officialUrl === 'string' ? s.officialUrl : null,
          sTitle,
        ),
      }
    })
    .filter(Boolean) as PublicGuideDTO['sources']

  return {
    transactionId: doc.id as number | string,
    slug,
    title,
    summary,
    lastReviewedLabel: formatPublicDate(lastReviewedAt),
    lastReviewedAt,
    demoLabeled: doc.contentClass === 'DEMO',
    questions,
    variants,
    notices,
    rules,
    documents,
    steps,
    fees,
    sources,
    detailHref: `/transactions/${encodeURIComponent(slug)}`,
  }
}

export function runPublicGuideEvaluation(
  guide: PublicGuideDTO,
  answers: GuideAnswers,
): GuideEvaluationOutput {
  return evaluateGuide({
    questions: guide.questions,
    variants: guide.variants,
    notices: guide.notices,
    rules: guide.rules,
    documents: guide.documents,
    steps: guide.steps,
    fees: guide.fees,
    answers,
  })
}

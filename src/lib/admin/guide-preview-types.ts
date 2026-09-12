/**
 * P11-C — Admin guide decision-rule preview read model (informational only).
 * Does not authorize publication; firedRuleKeys are diagnostic.
 */

import type { ConditionResult, GuideAnswers, GuideQuestionType } from '@/lib/guide/types'

export type GuidePreviewQuestionOption = {
  key: string
  label: string
}

export type GuidePreviewQuestion = {
  key: string
  prompt: string
  helpText: string | null
  questionType: GuideQuestionType
  required: boolean
  options: GuidePreviewQuestionOption[]
  /** Currently visible given sanitized answers (MATCH visibility only). */
  visible: boolean
}

export type GuidePreviewEffectRow = {
  type: string
  targetKey: string
  labelAr: string
}

export type GuidePreviewFiredRule = {
  key: string
  explanation: string | null
  status: 'fired'
  effects: GuidePreviewEffectRow[]
}

export type GuidePreviewResultItem = {
  key: string
  title: string
  detail: string | null
  why: string | null
}

export type GuidePreviewEvaluationState =
  | 'ready'
  | 'incomplete'
  | 'conflict'
  | 'invalid_config'
  | 'guide_invalid'

export type TransactionGuidePreview = {
  basedOn: 'last_saved'
  evaluatedAt: string
  guideEnabled: boolean
  evaluationState: GuidePreviewEvaluationState
  messageAr: string | null
  questions: GuidePreviewQuestion[]
  /** Answers after coerce + catalog sanitize + visibility prune. */
  sanitizedAnswers: GuideAnswers
  activeRuleCount: number
  firedRuleKeys: string[]
  firedRules: GuidePreviewFiredRule[]
  /** Active rules whose `when` group is UNKNOWN (existing tri-state; not a new engine). */
  unknownWhenRuleKeys: string[]
  rulesSummaryAr: string
  variant: { key: string; title: string; explanation: string | null } | null
  documents: GuidePreviewResultItem[]
  steps: GuidePreviewResultItem[]
  fees: GuidePreviewResultItem[]
  notices: Array<GuidePreviewResultItem & { severity: 'info' | 'warning' }>
  /** Deeper per-condition diagnostics deferred — overall UNKNOWN rule keys only. */
  unknownDiagnosticsLimited: true
}

export type GuidePreviewCatalogResponse = {
  basedOn: 'last_saved'
  loadedAt: string
  guideEnabled: boolean
  evaluationState: GuidePreviewEvaluationState
  messageAr: string | null
  questions: GuidePreviewQuestion[]
  activeRuleCount: number
  unknownDiagnosticsLimited: true
}

export function effectTypeLabelAr(type: string): string {
  switch (type) {
    case 'includeDocument':
      return 'تضمين وثيقة'
    case 'excludeDocument':
      return 'استبعاد وثيقة'
    case 'includeStep':
      return 'تضمين خطوة'
    case 'excludeStep':
      return 'استبعاد خطوة'
    case 'includeFee':
      return 'تضمين رسم'
    case 'excludeFee':
      return 'استبعاد رسم'
    case 'includeNotice':
      return 'تضمين ملاحظة'
    case 'excludeNotice':
      return 'استبعاد ملاحظة'
    case 'selectVariant':
      return 'اختيار متغير'
    default:
      return type
  }
}

export function conditionResultLabelAr(result: ConditionResult): string {
  if (result === 'MATCH') return 'مطابقة'
  if (result === 'NO_MATCH') return 'غير مطابقة'
  return 'غير مؤكد'
}

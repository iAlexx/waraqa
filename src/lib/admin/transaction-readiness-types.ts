/**
 * P11-B — Transaction Admin readiness status model (informational only).
 * Does not invent publication rules; codes map to existing server checks.
 */

export const READINESS_STATUSES = ['READY', 'WARNING', 'BLOCKED', 'UNKNOWN'] as const
export type ReadinessStatus = (typeof READINESS_STATUSES)[number]

export const READINESS_SEVERITIES = ['blocker', 'warning', 'info'] as const
export type ReadinessSeverity = (typeof READINESS_SEVERITIES)[number]

/** Stable machine codes for Admin UX + tests. Only codes backed by current rules. */
export const READINESS_ISSUE_CODES = [
  'PROCEDURE_INCOMPLETE',
  'SOURCE_NOT_TRUSTED',
  'SOURCE_COVERAGE',
  'CLAIM_MISSING',
  'CLAIM_MALFORMED',
  'CLAIM_NOT_AUTHORITATIVE',
  'CLAIM_WARNING_ONLY',
  'CONTENT_CLASS_QA_TEST',
  'CONTENT_CLASS_DEMO_MODE',
  'CONTENT_CLASS_NOT_PUBLIC',
  'STORED_TRUST_FALSE',
  'STORED_TRUST_STALE',
  'TRANSACTION_INACTIVE',
  'NOT_CMS_PUBLISHED',
  'MARKED_OUTDATED',
  'WORKFLOW_ARCHIVED',
  'WORKFLOW_TRANSITION_BLOCKED',
  'APPROVAL_HASH_MISMATCH',
  'EVALUATION_FAILED',
] as const

export type ReadinessIssueCode = (typeof READINESS_ISSUE_CODES)[number]

export type ReadinessIssue = {
  code: ReadinessIssueCode
  severity: ReadinessSeverity
  messageAr: string
  claimKey?: string
  claimStatus?: string
  publicationPermission?: string
  trustLevel?: string
  section?: string
}

export type ClaimReadinessDetail = {
  claimKey: string
  status: string
  publicationPermission: string
  level: string
  reasons: string[]
  outcomeAr: string
}

export type ReadinessAxis = {
  status: ReadinessStatus
  labelAr: string
  issues: ReadinessIssue[]
}

export type TransactionAdminReadiness = {
  /** Always last-saved server document — never unsaved form state. */
  basedOn: 'last_saved'
  evaluatedAt: string
  workflow: ReadinessAxis
  publicEligibility: ReadinessAxis & {
    contentClassNoteAr: string
    publicContentMode: 'production' | 'demo'
    storedClaimTrustOk: boolean | null
    liveClaimTrustOk: boolean | null
  }
  claimDetails: ClaimReadinessDetail[]
  /** Aggregate problems needing editor/reviewer action (blockers + warnings). */
  actionItems: ReadinessIssue[]
}

export function readinessStatusLabelAr(status: ReadinessStatus): string {
  switch (status) {
    case 'READY':
      return 'جاهز'
    case 'WARNING':
      return 'تحذير'
    case 'BLOCKED':
      return 'محظور'
    case 'UNKNOWN':
      return 'غير مؤكد'
    default:
      return 'غير مؤكد'
  }
}

export function contentClassReadinessNoteAr(contentClass: unknown): string {
  if (contentClass === 'PRODUCTION') {
    return 'تصنيف إنتاجي، وليس دليلاً على صحة المعلومات.'
  }
  if (contentClass === 'DEMO') {
    return 'بيانات تجريبية وتظهر للعامة فقط ضمن وضع العرض المسموح.'
  }
  if (contentClass === 'QA_TEST') {
    return 'مخصص للاختبار ولا يظهر للعامة.'
  }
  return 'تصنيف محتوى غير معروف أو مفقود — لا يُفترض الظهور للعامة.'
}

export function claimTrustOutcomeAr(level: string): string {
  if (level === 'AUTHORITATIVE') return 'مؤهلة للاستخدام العام الموثوق'
  if (level === 'WARNING_ONLY') return 'مسموح مع تحذير — لا تكفي لربط مطلوب في الاعتماد/النشر'
  return 'غير مؤهلة للاستخدام العام'
}

export function aggregateReadinessStatus(issues: ReadinessIssue[]): ReadinessStatus {
  if (issues.some((i) => i.code === 'EVALUATION_FAILED')) return 'UNKNOWN'
  if (issues.some((i) => i.severity === 'blocker')) return 'BLOCKED'
  if (issues.some((i) => i.severity === 'warning')) return 'WARNING'
  return 'READY'
}

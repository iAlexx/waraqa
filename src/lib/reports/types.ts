/** Phase 10 — User report domain types (server + shared constants). */

export const REPORT_SECTIONS = [
  'documents',
  'fees',
  'steps',
  'location',
  'duration',
  'source',
  'other',
] as const satisfies readonly [string, ...string[]]

export type ReportSection = (typeof REPORT_SECTIONS)[number]

export const REPORT_STATUSES = [
  'open',
  'in_review',
  'resolved',
  'rejected',
  'spam',
] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_SECTION_LABELS_AR: Record<ReportSection, string> = {
  documents: 'الوثائق',
  fees: 'الرسوم',
  steps: 'الخطوات',
  location: 'الموقع / المركز',
  duration: 'المدة',
  source: 'المصدر',
  other: 'أخرى',
}

export const REPORT_STATUS_LABELS_AR: Record<ReportStatus, string> = {
  open: 'مفتوح',
  in_review: 'قيد المراجعة',
  resolved: 'تم الحل',
  rejected: 'مرفوض',
  spam: 'بريد مزعج',
}

/** Allowed status transitions for triage (admin/reviewer). */
export const REPORT_STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  open: ['in_review', 'resolved', 'rejected', 'spam'],
  in_review: ['open', 'resolved', 'rejected', 'spam'],
  resolved: ['open', 'in_review'],
  rejected: ['open', 'in_review'],
  spam: ['open'],
}

export const REPORT_LIMITS = {
  messageMin: 12,
  messageMax: 2000,
  encounteredMin: 8,
  encounteredMax: 2000,
  contactEmailMax: 254,
  contactPhoneMax: 40,
  sourceUrlMax: 500,
  resolutionNoteMin: 4,
  resolutionNoteMax: 1000,
  reviewNotesMax: 2000,
  /** Max raw JSON body for public report POST (bytes). */
  maxRequestBytes: 32 * 1024,
} as const

/** Rate limit: max submissions per IP-derived identity hash per window. */
export const REPORT_RATE_LIMIT = {
  maxHits: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  /** Retain bucket rows this long, then cleanup may delete. */
  retainMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const

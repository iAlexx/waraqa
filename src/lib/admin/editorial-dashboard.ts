/**
 * Phase 11 — cheap Admin dashboard counts (no Claim graph / readiness walks).
 * Indexed Payload finds only.
 */

import type { Payload, PayloadRequest } from 'payload'

export type EditorialDashboardCard = {
  key: string
  labelAr: string
  count: number
  href: string
  hintAr?: string
}

export type EditorialDashboardStats = {
  generatedAt: string
  cards: EditorialDashboardCard[]
}

function listHref(collection: string, query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  return `/admin/collections/${collection}?${params.toString()}`
}

async function countCollection(
  payload: Payload,
  collection: 'transactions' | 'user-reports',
  where: Record<string, unknown>,
  req?: PayloadRequest,
): Promise<number> {
  const result = await payload.count({
    collection,
    where: where as never,
    overrideAccess: false,
    req,
  })
  return result.totalDocs
}

/**
 * Build operational dashboard cards for active admin/reviewer.
 * Caller must enforce auth before invoking.
 */
export async function loadEditorialDashboardStats(
  payload: Payload,
  opts?: { req?: PayloadRequest; now?: Date; currentUserId?: number | string | null },
): Promise<EditorialDashboardStats> {
  const now = opts?.now ?? new Date()
  const nowIso = now.toISOString()
  const req = opts?.req

  const waitingReview = await countCollection(
    payload,
    'transactions',
    { workflowState: { equals: 'in_review' } },
    req,
  )

  const reviewDue = await countCollection(
    payload,
    'transactions',
    {
      and: [
        { reviewDueAt: { exists: true } },
        { reviewDueAt: { less_than_equal: nowIso } },
        { workflowState: { not_equals: 'archived' } },
        { markedOutdated: { not_equals: true } },
      ],
    },
    req,
  )

  const openReports = await countCollection(
    payload,
    'user-reports',
    { status: { equals: 'open' } },
    req,
  )

  const inReviewReports = await countCollection(
    payload,
    'user-reports',
    { status: { equals: 'in_review' } },
    req,
  )

  const changesRequested = await countCollection(
    payload,
    'transactions',
    { workflowState: { equals: 'changes_requested' } },
    req,
  )

  const cards: EditorialDashboardCard[] = [
    {
      key: 'tx_in_review',
      labelAr: 'معاملات بانتظار المراجعة',
      count: waitingReview,
      href: listHref('transactions', {
        'where[workflowState][equals]': 'in_review',
      }),
      hintAr: 'حالة سير العمل: قيد المراجعة',
    },
    {
      key: 'tx_review_due',
      labelAr: 'معاملات حان موعد مراجعتها',
      count: reviewDue,
      href: listHref('transactions', {
        'where[and][0][reviewDueAt][less_than_equal]': nowIso,
        'where[and][1][workflowState][not_equals]': 'archived',
      }),
      hintAr: 'موعد المراجعة ≤ الآن (منفصل عن جاهزية النشر)',
    },
    {
      key: 'reports_open',
      labelAr: 'بلاغات مفتوحة',
      count: openReports,
      href: listHref('user-reports', {
        'where[status][equals]': 'open',
      }),
    },
    {
      key: 'reports_in_review',
      labelAr: 'بلاغات قيد المراجعة',
      count: inReviewReports,
      href: listHref('user-reports', {
        'where[status][equals]': 'in_review',
      }),
    },
    {
      key: 'tx_changes_requested',
      labelAr: 'معاملات طُلب فيها تعديلات',
      count: changesRequested,
      href: listHref('transactions', {
        'where[workflowState][equals]': 'changes_requested',
      }),
    },
  ]

  const uid = opts?.currentUserId
  if (uid != null && uid !== '') {
    const assignedToMe = await countCollection(
      payload,
      'user-reports',
      {
        and: [
          { assignedTo: { equals: uid } },
          { status: { in: ['open', 'in_review'] } },
        ],
      },
      req,
    )
    cards.push({
      key: 'reports_assigned_to_me',
      labelAr: 'بلاغات معيَّنة لي',
      count: assignedToMe,
      href: listHref('user-reports', {
        'where[and][0][assignedTo][equals]': String(uid),
        'where[and][1][status][in][0]': 'open',
        'where[and][1][status][in][1]': 'in_review',
      }),
    })
  }

  return { generatedAt: nowIso, cards }
}

/** Classify reviewDueAt for list cell display (not publication readiness). */
export type ReviewDueBucket = 'missing' | 'overdue' | 'due_soon' | 'future'

export function classifyReviewDueAt(
  reviewDueAt: string | Date | null | undefined,
  now: Date = new Date(),
  soonDays = 7,
): ReviewDueBucket {
  if (reviewDueAt == null || reviewDueAt === '') return 'missing'
  const due = new Date(reviewDueAt)
  if (Number.isNaN(due.getTime())) return 'missing'
  const ms = due.getTime() - now.getTime()
  if (ms <= 0) return 'overdue'
  if (ms <= soonDays * 24 * 60 * 60 * 1000) return 'due_soon'
  return 'future'
}

export function reviewDueBucketLabelAr(bucket: ReviewDueBucket): string {
  switch (bucket) {
    case 'overdue':
      return 'متأخر'
    case 'due_soon':
      return 'قريب'
    case 'future':
      return 'قادم'
    case 'missing':
    default:
      return '—'
  }
}

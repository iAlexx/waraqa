import type { VerificationHealth } from './types'

export function addDays(isoDate: string | Date, days: number): Date {
  const d = typeof isoDate === 'string' ? new Date(isoDate) : new Date(isoDate.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function calculateReviewDueAt(opts: {
  lastReviewedAt?: string | Date | null
  reviewIntervalDays?: number | null
  verificationPolicyDays: number
}): Date | null {
  if (!opts.lastReviewedAt) return null
  const days =
    typeof opts.reviewIntervalDays === 'number' && opts.reviewIntervalDays > 0
      ? opts.reviewIntervalDays
      : opts.verificationPolicyDays
  return addDays(opts.lastReviewedAt, days)
}

export function computeVerificationHealth(opts: {
  markedOutdated?: boolean | null
  lastReviewedAt?: string | Date | null
  reviewDueAt?: string | Date | null
  now?: Date
}): VerificationHealth {
  if (opts.markedOutdated) return 'outdated'
  if (!opts.lastReviewedAt) return 'unverified'
  const due = opts.reviewDueAt ? new Date(opts.reviewDueAt) : null
  if (!due) return 'unverified'
  const now = opts.now ?? new Date()
  if (due.getTime() <= now.getTime()) return 'review_due'
  return 'current'
}

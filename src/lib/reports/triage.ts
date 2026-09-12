import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { canReviewContent } from '@/access'
import { hasActiveRole, type UserLike } from '@/access/roles'
import { writeAuditEvent } from '@/lib/workflow/audit'

import { sanitizeResolutionNote } from './sanitize'
import {
  REPORT_LIMITS,
  REPORT_STATUS_TRANSITIONS,
  type ReportStatus,
} from './types'

function asStatus(v: unknown): ReportStatus | null {
  if (
    v === 'open' ||
    v === 'in_review' ||
    v === 'resolved' ||
    v === 'rejected' ||
    v === 'spam'
  ) {
    return v
  }
  return null
}

function relationId(v: unknown): number | string | null {
  if (typeof v === 'number' || typeof v === 'string') return v
  if (v && typeof v === 'object' && 'id' in v) {
    const id = (v as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * Enforce triage transitions and stamp resolution metadata.
 * Public creates use context.publicReportSubmit and skip triage checks.
 */
export const enforceUserReportTriage: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  if (context?.publicReportSubmit === true) {
    return data
  }

  if (operation === 'create') {
    // Only server public path may create; block Admin/API creates unless admin seeding.
    if (context?.seed === true) return data
    throw new Error('لا يمكن إنشاء البلاغات إلا عبر مسار الإرسال العام.')
  }

  const user = req.user as UserLike
  if (!canReviewContent({ req: { user } } as never)) {
    throw new Error('غير مصرّح بتحديث البلاغات.')
  }

  const prev = asStatus(originalDoc?.status) ?? 'open'
  const next = asStatus(data.status) ?? prev

  // Preserve protected contact as submitted — triage must not rewrite it casually.
  if (originalDoc) {
    data.contactEmail = originalDoc.contactEmail
    data.contactPhone = originalDoc.contactPhone
    data.message = originalDoc.message
    data.section = originalDoc.section
    data.sourceUrl = originalDoc.sourceUrl
    data.consentAccepted = originalDoc.consentAccepted
    data.transaction = originalDoc.transaction
  }

  if (next !== prev) {
    const allowed = REPORT_STATUS_TRANSITIONS[prev]
    if (!allowed.includes(next)) {
      throw new Error('انتقال حالة البلاغ غير مسموح.')
    }
  }

  // Strip client-controlled stamps; set server-side.
  if (next === 'resolved' || next === 'rejected') {
    const note = sanitizeResolutionNote(
      data.resolutionSummary ?? originalDoc?.resolutionSummary,
    )
    if (note.length < REPORT_LIMITS.resolutionNoteMin) {
      throw new Error('ملاحظة الحل مطلوبة عند الإغلاق أو الرفض.')
    }
    data.resolutionSummary = note
    data.resolvedAt = new Date().toISOString()
    const uid = user && typeof user === 'object' && user.id != null ? user.id : null
    if (uid != null) data.resolvedBy = Number(uid)
  } else if (next === 'open' || next === 'in_review') {
    if (prev === 'resolved' || prev === 'rejected' || prev === 'spam') {
      data.resolvedAt = null
      data.resolvedBy = null
    }
  }

  // Never allow researchers/viewers via this path (already gated).
  if (hasActiveRole(user, 'researcher', 'viewer')) {
    throw new Error('غير مصرّح بتحديث البلاغات.')
  }

  ;(req as PayloadRequest & { context: Record<string, unknown> }).context = {
    ...((req.context as Record<string, unknown>) || {}),
    reportStatusFrom: prev,
    reportStatusTo: next,
  }

  return data
}

export async function writeUserReportStatusAudit(opts: {
  req: PayloadRequest
  reportId: number | string
  transactionId: number | string | null
  fromStatus: ReportStatus
  toStatus: ReportStatus
  resolutionNote?: string | null
}): Promise<void> {
  if (opts.fromStatus === opts.toStatus) return

  let action:
    | 'report_in_review'
    | 'report_resolved'
    | 'report_rejected'
    | 'report_marked_spam'
    | 'report_status_changed' = 'report_status_changed'

  if (opts.toStatus === 'in_review') action = 'report_in_review'
  else if (opts.toStatus === 'resolved') action = 'report_resolved'
  else if (opts.toStatus === 'rejected') action = 'report_rejected'
  else if (opts.toStatus === 'spam') action = 'report_marked_spam'

  const user = opts.req.user as UserLike
  await writeAuditEvent(opts.req.payload, {
    req: opts.req,
    actorId: user && typeof user === 'object' ? user.id : null,
    action,
    entityType: 'user-reports',
    entityId: opts.reportId,
    transactionId: opts.transactionId,
    summary:
      opts.toStatus === 'resolved'
        ? 'إغلاق بلاغ'
        : opts.toStatus === 'rejected'
          ? 'رفض بلاغ'
          : opts.toStatus === 'spam'
            ? 'وسم بلاغ كمزعج'
            : opts.toStatus === 'in_review'
              ? 'بدء مراجعة بلاغ'
              : 'تغيير حالة بلاغ',
    metadata: {
      fromState: opts.fromStatus,
      toState: opts.toStatus,
      reasonLength: opts.resolutionNote ? opts.resolutionNote.length : 0,
    },
  })
}

export { relationId }

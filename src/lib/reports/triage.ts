import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

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

function isClosed(s: ReportStatus): boolean {
  return s === 'resolved' || s === 'rejected'
}

/**
 * Enforce triage transitions and stamp resolution metadata.
 * Public creates use context.publicReportSubmit and skip triage checks.
 *
 * Resolution stamps (`resolvedAt` / `resolvedBy` / authoritative
 * `resolutionSummary`) are applied ONLY on transitions INTO resolved|rejected.
 * Same-state edits on a closed report do not re-stamp.
 * On reopen, stamps clear but `lastResolutionSummary` preserves the prior reason
 * (immutable audit-events also retain the reason text).
 *
 * Editorial status transitions write audit-events here (before persist).
 * If audit write fails, the update is aborted — no silent unlogged terminal state.
 * Citizen `report_received` remains resilient in submit.ts (documented separately).
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
    if (context?.seed === true) return data
    throw new APIError('لا يمكن إنشاء البلاغات إلا عبر مسار الإرسال العام.', 403)
  }

  const user = req.user as UserLike
  if (!canReviewContent({ req: { user } } as never)) {
    throw new APIError('غير مصرّح بتحديث البلاغات.', 403)
  }
  if (hasActiveRole(user, 'researcher', 'viewer')) {
    throw new APIError('غير مصرّح بتحديث البلاغات.', 403)
  }

  const prev = asStatus(originalDoc?.status) ?? 'open'
  const next = asStatus(data.status) ?? prev
  const statusChanged = next !== prev

  // Preserve citizen-submitted fields — triage must not rewrite them.
  if (originalDoc) {
    data.contactEmail = originalDoc.contactEmail
    data.contactPhone = originalDoc.contactPhone
    data.message = originalDoc.message
    data.encountered = originalDoc.encountered
    data.section = originalDoc.section
    data.sourceUrl = originalDoc.sourceUrl
    data.serviceCenter = originalDoc.serviceCenter
    data.consentAccepted = originalDoc.consentAccepted
    data.transaction = originalDoc.transaction
  }

  if (statusChanged) {
    const allowed = REPORT_STATUS_TRANSITIONS[prev]
    if (!allowed.includes(next)) {
      throw new APIError('انتقال حالة البلاغ غير مسموح.', 422)
    }
  }

  const enteringClosed = statusChanged && isClosed(next)
  const stayingClosed = !statusChanged && isClosed(prev)
  const reopening = statusChanged && isClosed(prev) && !isClosed(next)

  if (enteringClosed) {
    const note = sanitizeResolutionNote(data.resolutionSummary)
    if (note.length < REPORT_LIMITS.resolutionNoteMin) {
      throw new APIError('ملاحظة الحل مطلوبة عند الإغلاق أو الرفض.', 422)
    }
    data.resolutionSummary = note
    data.lastResolutionSummary = note
    data.resolvedAt = new Date().toISOString()
    const uid = user && typeof user === 'object' && user.id != null ? user.id : null
    if (uid != null) data.resolvedBy = Number(uid)
  } else if (stayingClosed) {
    // Ordinary edits while closed: never re-stamp or silently rewrite closing reason.
    data.resolvedAt = originalDoc?.resolvedAt ?? null
    data.resolvedBy = originalDoc?.resolvedBy ?? null
    data.resolutionSummary = originalDoc?.resolutionSummary ?? null
    data.lastResolutionSummary =
      originalDoc?.lastResolutionSummary ?? originalDoc?.resolutionSummary ?? null
  } else if (reopening) {
    // Clear live stamps; keep lastResolutionSummary for editorial continuity.
    const prior =
      sanitizeResolutionNote(originalDoc?.resolutionSummary) ||
      sanitizeResolutionNote(originalDoc?.lastResolutionSummary)
    data.lastResolutionSummary = prior || originalDoc?.lastResolutionSummary || null
    data.resolvedAt = null
    data.resolvedBy = null
    // Keep resolutionSummary visible as historical last reason until next close.
    data.resolutionSummary = prior || originalDoc?.resolutionSummary || null
  } else {
    // open <-> in_review and similar: never invent resolution stamps.
    if (!isClosed(next)) {
      data.resolvedAt = originalDoc?.resolvedAt ?? null
      data.resolvedBy = originalDoc?.resolvedBy ?? null
      if (!statusChanged) {
        // allow editing reviewNotes only; leave resolution fields alone
        data.resolutionSummary = originalDoc?.resolutionSummary ?? data.resolutionSummary
        data.lastResolutionSummary =
          originalDoc?.lastResolutionSummary ?? data.lastResolutionSummary
      }
    }
  }

  if (statusChanged) {
    const noteForAudit = enteringClosed
      ? sanitizeResolutionNote(data.resolutionSummary)
      : sanitizeResolutionNote(originalDoc?.resolutionSummary)

    try {
      await writeUserReportStatusAudit({
        req,
        reportId: originalDoc?.id ?? 'unknown',
        transactionId: relationId(data.transaction ?? originalDoc?.transaction),
        fromStatus: prev,
        toStatus: next,
        resolutionNote: isClosed(next) || isClosed(prev) ? noteForAudit : null,
      })
    } catch {
      throw new APIError('تعذّر تسجيل حدث التدقيق — لم يُحفظ تغيير الحالة.', 503)
    }
  }

  ;(req as PayloadRequest & { context: Record<string, unknown> }).context = {
    ...((req.context as Record<string, unknown>) || {}),
    reportStatusFrom: prev,
    reportStatusTo: next,
    reportAuditWritten: statusChanged,
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
  const reason =
    opts.resolutionNote && opts.resolutionNote.length > 0
      ? opts.resolutionNote.slice(0, 500)
      : undefined

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
      reasonLength: reason ? reason.length : 0,
      ...(reason ? { resolutionReason: reason } : {}),
    },
  })
}

export { relationId, asStatus, isClosed }

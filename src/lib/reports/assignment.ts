import type { Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { writeAuditEvent } from '@/lib/workflow/audit'

function relationId(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  if (v && typeof v === 'object' && 'id' in v) {
    const id = (v as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id)
  }
  return null
}

/**
 * Only active admin/reviewer users may be assigned to report triage.
 * Returns null for clear/unassign.
 */
export async function assertAssignableReportUser(
  payload: Payload,
  assigneeRaw: unknown,
  req?: PayloadRequest,
): Promise<number | null> {
  if (assigneeRaw == null || assigneeRaw === '') return null

  const id = relationId(assigneeRaw)
  if (id == null) {
    throw new APIError('تعيين البلاغ غير صالح.', 422)
  }

  const user = await payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const u = user as { role?: string; isActive?: boolean | null }
  if (!u || u.isActive !== true) {
    throw new APIError('لا يمكن تعيين مستخدم غير نشط للبلاغ.', 422)
  }
  if (u.role !== 'admin' && u.role !== 'reviewer') {
    throw new APIError('يُسمح بتعيين المدير أو المراجع النشط فقط — الباحث غير قابل للتعيين.', 422)
  }

  return id
}

export async function writeReportAssignmentAudit(opts: {
  req: PayloadRequest
  reportId: number | string
  transactionId: number | string | null
  fromAssigneeId: number | null
  toAssigneeId: number | null
}): Promise<void> {
  if (opts.fromAssigneeId === opts.toAssigneeId) return

  const user = opts.req.user as UserLike
  const actorId = user && typeof user === 'object' && user.id != null ? user.id : null

  await writeAuditEvent(opts.req.payload, {
    req: opts.req,
    actorId,
    action: 'report_assigned',
    entityType: 'user-reports',
    entityId: opts.reportId,
    transactionId: opts.transactionId,
    summary:
      opts.toAssigneeId == null
        ? 'إلغاء تعيين بلاغ مواطن'
        : opts.fromAssigneeId == null
          ? 'تعيين بلاغ مواطن'
          : 'إعادة تعيين بلاغ مواطن',
    metadata: {
      fromAssigneeId: opts.fromAssigneeId ?? undefined,
      toAssigneeId: opts.toAssigneeId ?? undefined,
    },
  })
}

export { relationId as reportRelationId }

export function canAssignReports(user: UserLike): boolean {
  return hasActiveRole(user, 'admin', 'reviewer')
}

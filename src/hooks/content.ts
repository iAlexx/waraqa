import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { allowSeedBypass } from '@/lib/qa-seed-guard'
import { writeAuditEvent } from '@/lib/workflow/audit'
import { maybeInvalidateApproval } from '@/lib/workflow/transaction-workflow'

type StatusData = {
  _status?: 'draft' | 'published' | null
  publishedAt?: string | null
  publishedBy?: number | string | null
  createdBy?: number | string | null
  lastUpdatedBy?: number | string | null
  workflowState?: string | null
  [key: string]: unknown
}

function userId(user: UserLike): number | string | undefined {
  if (!user || typeof user !== 'object') return undefined
  return user.id
}

function isWorkflowContext(req: { context?: Record<string, unknown> }): boolean {
  return typeof req.context?.workflowAction === 'string'
}

/** Populate audit fields; stamp publish metadata when transitioning to published. */
export const populateAuditFields: CollectionBeforeChangeHook = ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const next = { ...(data as StatusData) }
  const user = req.user as UserLike
  const uid = userId(user)

  if (operation === 'create' && uid != null) {
    next.createdBy = next.createdBy ?? uid
    if (!next.workflowState) next.workflowState = 'draft'
  }
  if (uid != null) {
    next.lastUpdatedBy = uid
  }

  const wasPublished = (originalDoc as StatusData | undefined)?._status === 'published'
  const willPublish = next._status === 'published'

  if (willPublish && !wasPublished) {
    next.publishedAt = next.publishedAt ?? new Date().toISOString()
    if (uid != null) next.publishedBy = uid
  }

  return next
}

/**
 * Server-side publish enforcement.
 * Transactions: publish/unpublish only via workflow service context.
 * Other collections: admin/reviewer may still publish directly (Phase 3 behavior).
 */
export const enforcePublishAuthorization: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
  collection,
}) => {
  if (allowSeedBypass(req)) {
    return data
  }

  const next = data as StatusData
  const user = req.user as UserLike
  const wasPublished = (originalDoc as StatusData | undefined)?._status === 'published'
  const willPublish = next._status === 'published'
  const willUnpublish = wasPublished && next._status === 'draft'
  const isTx = collection?.slug === 'transactions'

  if ((willPublish && !wasPublished) || willUnpublish) {
    if (isTx && !isWorkflowContext(req)) {
      throw new APIError(
        'النشر وإلغاء النشر يتمان عبر إجراءات سير العمل فقط.',
        403,
      )
    }
    if (!hasActiveRole(user, 'admin', 'reviewer')) {
      throw new APIError(
        'غير مصرّح: النشر وإلغاء النشر مسموحان فقط لدورَي المدير والمراجع.',
        403,
      )
    }
  }

  return data
}

/** Block raw workflowState spoofing outside workflow service. */
export const enforceWorkflowFieldGuard: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (allowSeedBypass(req) || isWorkflowContext(req) || req.context?.claimTrustRecompute === true) {
    return data
  }

  const next = { ...(data as StatusData) }
  const prev = originalDoc as StatusData | undefined

  if (operation === 'create') {
    next.workflowState = 'draft'
    next.claimTrustOk = false
    return next
  }

  if (
    next.workflowState != null &&
    prev?.workflowState != null &&
    next.workflowState !== prev.workflowState
  ) {
    throw new APIError('لا يمكن تغيير حالة سير العمل مباشرة عبر واجهة برمجة التطبيقات.', 403)
  }

  // Strip protected technical fields from raw updates
  delete next.approvedContentHash
  delete next.approvedVersionId
  delete next.approvedAt
  delete next.approvedBy
  delete next.submittedForReviewAt
  delete next.submittedForReviewBy
  delete next.changeRequestedAt
  delete next.changeRequestedBy
  delete next.archivedAt
  delete next.archivedBy
  delete next.reviewDueAt
  delete next.markedOutdated
  delete next.claimTrustOk

  return next
}

/** Invalidate approval when critical content changes. */
export const invalidateApprovalOnCriticalEdit: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update' || !originalDoc) return data
  if (allowSeedBypass(req) || isWorkflowContext(req) || req.context?.claimTrustRecompute === true) {
    return data
  }

  const next = { ...(data as StatusData) }
  const { invalidate, patch } = maybeInvalidateApproval({
    originalDoc: originalDoc as Record<string, unknown>,
    nextData: next,
  })

  if (!invalidate) return next

  Object.assign(next, patch)

  const user = req.user as UserLike
  try {
    await writeAuditEvent(req.payload, {
      req,
      actorId: userId(user),
      action: 'approval_invalidated',
      entityType: 'transactions',
      entityId: (originalDoc as { id: number | string }).id,
      transactionId: (originalDoc as { id: number | string }).id,
      summary: 'إبطال الاعتماد بسبب تعديل محتوى حرج',
      metadata: {
        fromState: String((originalDoc as StatusData).workflowState ?? ''),
        toState: 'draft',
      },
    })
  } catch {
    // Do not block save if audit write fails on invalidation — still clear approval
  }

  return next
}

export const preventSelfParent: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const parent = (data as { parent?: number | string | { id?: number | string } | null })
    ?.parent
  const selfId = originalDoc?.id
  if (parent == null || selfId == null) return data

  const parentId =
    typeof parent === 'object' && parent !== null ? parent.id : parent

  if (parentId != null && String(parentId) === String(selfId)) {
    throw new Error('لا يمكن أن يكون التصنيف أباً لنفسه.')
  }
  return data
}

export const preventSelfPrerequisite: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
  const prereqs = (
    data as {
      prerequisiteProcedures?: Array<number | string | { id?: number | string }> | null
    }
  )?.prerequisiteProcedures
  const selfId = originalDoc?.id
  if (!prereqs?.length || selfId == null) return data

  for (const item of prereqs) {
    const id = typeof item === 'object' && item !== null ? item.id : item
    if (id != null && String(id) === String(selfId)) {
      throw new Error('لا يمكن أن تكون المعاملة شرطاً مسبقاً لنفسها.')
    }
  }
  return data
}

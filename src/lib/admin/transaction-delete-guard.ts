import type { CollectionBeforeDeleteHook, Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { allowSeedBypass } from '@/lib/qa-seed-guard'

/** Immutable workflow actions that mean the Transaction was ever approved/published/archived. */
export const HISTORICAL_HARD_DELETE_BLOCK_ACTIONS = [
  'approved',
  'published',
  'archived',
] as const

export type HistoricalHardDeleteBlockAction =
  (typeof HISTORICAL_HARD_DELETE_BLOCK_ACTIONS)[number]

/**
 * True when audit-events record that this Transaction was historically
 * approved, published, or archived — even if restoreRevision reset the live row
 * to look like a never-published draft.
 */
export async function transactionHasHistoricalPublicationAudit(
  payload: Payload,
  transactionId: number | string,
  req?: PayloadRequest,
): Promise<boolean> {
  const found = await payload.find({
    collection: 'audit-events',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      and: [
        { entityType: { equals: 'transactions' } },
        { entityId: { equals: String(transactionId) } },
        { action: { in: [...HISTORICAL_HARD_DELETE_BLOCK_ACTIONS] } },
      ],
    },
  })
  return found.totalDocs > 0
}

function looksPreviouslyPublishedFromRow(doc: Record<string, unknown>): boolean {
  const workflowState = typeof doc.workflowState === 'string' ? doc.workflowState : ''
  const status = typeof doc._status === 'string' ? doc._status : ''
  return (
    Boolean(doc.publishedAt) ||
    Boolean(doc.archivedAt) ||
    status === 'published' ||
    workflowState === 'published' ||
    workflowState === 'archived' ||
    workflowState === 'approved'
  )
}

/**
 * Phase 11 — server-enforced Transaction hard-delete policy.
 *
 * - Prefer archive for published / previously published / archived content.
 * - Immutable audit history blocks delete after restoreRevision wiped live markers.
 * - Never-published drafts (no historical approved/published/archived audit) may hard-delete.
 * - Seed/test cleanup may bypass only via allowSeedBypass (context.seed + non-prod).
 * - Reports FK RESTRICT remains authoritative; we fail early with Arabic message.
 */
export const preventUnsafeTransactionHardDelete: CollectionBeforeDeleteHook = async ({
  req,
  id,
}) => {
  if (allowSeedBypass(req)) return

  const reportCount = await req.payload.count({
    collection: 'user-reports',
    where: { transaction: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (reportCount.totalDocs > 0) {
    throw new APIError(
      'لا يمكن حذف هذه المعاملة لوجود بلاغات مرتبطة. عالج البلاغات أولاً، أو استخدم الأرشفة بدل الحذف النهائي.',
      409,
    )
  }

  let doc: Record<string, unknown>
  try {
    doc = (await req.payload.findByID({
      collection: 'transactions',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>
  } catch {
    return
  }

  const historical = await transactionHasHistoricalPublicationAudit(req.payload, id, req)
  if (historical || looksPreviouslyPublishedFromRow(doc)) {
    throw new APIError(
      'لا يمكن حذف معاملة نُشرت أو اعتُمدت أو أُرشفت سابقاً. استخدم إجراء الأرشفة من سير العمل بدل الحذف النهائي.',
      403,
    )
  }
}

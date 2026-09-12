import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

import { allowSeedBypass } from '@/lib/qa-seed-guard'

/**
 * Phase 11 — server-enforced Transaction hard-delete policy.
 *
 * - Prefer archive for published / previously published / archived content.
 * - Never-published drafts may still be hard-deleted by admin.
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

  const workflowState = typeof doc.workflowState === 'string' ? doc.workflowState : ''
  const status = typeof doc._status === 'string' ? doc._status : ''
  const publishedAt = doc.publishedAt
  const archivedAt = doc.archivedAt

  const previouslyPublished =
    Boolean(publishedAt) ||
    Boolean(archivedAt) ||
    status === 'published' ||
    workflowState === 'published' ||
    workflowState === 'archived' ||
    workflowState === 'approved'

  if (previouslyPublished) {
    throw new APIError(
      'لا يمكن حذف معاملة نُشرت أو اعتُمدت أو أُرشفت سابقاً. استخدم إجراء الأرشفة من سير العمل بدل الحذف النهائي.',
      403,
    )
  }
}

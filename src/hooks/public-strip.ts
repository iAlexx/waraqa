import type { CollectionAfterReadHook } from 'payload'

import { getActiveUserRole, hasActiveRole, type UserLike } from '@/access/roles'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'

const WORKFLOW_PRIVATE = [
  'internalNotes',
  'notes',
  'createdBy',
  'lastUpdatedBy',
  'publishedBy',
  'changeRequestComment',
  'approvedContentHash',
  'approvedVersionId',
  'reviewDueOverrideReason',
  'archiveReason',
  'submittedForReviewBy',
  'changeRequestedBy',
  'approvedBy',
  'archivedBy',
  'searchText',
] as const

/** Strip editorial-only / workflow-private fields from anonymous / viewer responses.
 *
 * Primary public exclusion of archived / outdated / draft / inactive transactions is
 * enforced by `publicTransactionRead` / `publicTransactionWhere` at the query layer.
 *
 * Final public trust authority: live Claim/Source evaluation. `claimTrustOk` is only a
 * prefilter/cache — anonymous/viewer reads fail closed when live trust fails.
 * Editorial roles skip live enforcement (CMS can inspect stale/unsafe rows).
 */
export const stripPrivateEditorialFields: CollectionAfterReadHook = async ({ doc, req }) => {
  const user = req.user as UserLike
  const role = getActiveUserRole(user)
  const editorial = hasActiveRole(user, 'admin', 'reviewer', 'researcher')

  if (editorial) {
    if (role === 'researcher') {
      const next = { ...doc } as Record<string, unknown>
      delete next.approvedContentHash
      delete next.approvedVersionId
      return next
    }
    return doc
  }

  // Defense in depth only — access Where must already exclude these from list/totalDocs.
  if (
    doc?.markedOutdated === true ||
    doc?.workflowState === 'archived' ||
    doc?.claimTrustOk !== true
  ) {
    return null
  }

  const liveOk = await liveEvaluatePublicTransactionClaimTrust(req.payload, doc, req)
  if (!liveOk) return null

  const next = { ...doc } as Record<string, unknown>
  for (const key of WORKFLOW_PRIVATE) {
    delete next[key]
  }

  if (Array.isArray(next.prerequisiteProcedures)) {
    const kept: unknown[] = []
    for (const item of next.prerequisiteProcedures) {
      if (!item || typeof item !== 'object') continue
      const rel = item as Record<string, unknown>
      if (rel._status !== 'published') continue
      if (rel.active !== true) continue
      if (rel.markedOutdated === true) continue
      if (rel.workflowState === 'archived') continue
      if (rel.claimTrustOk !== true) continue
      if (!(await liveEvaluatePublicTransactionClaimTrust(req.payload, rel, req))) continue
      kept.push(item)
    }
    next.prerequisiteProcedures = kept
  }

  return next
}

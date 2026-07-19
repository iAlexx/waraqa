import type { CollectionAfterReadHook } from 'payload'

import { getUserRole, isUserActive, type UserLike } from '@/access/roles'

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
 * Returning `null` here for archived/outdated is defense in depth only.
 * Filtering `prerequisiteProcedures` removes raw IDs left when populate is denied
 * (Payload keeps the ID — that must not leak related restricted records).
 */
export const stripPrivateEditorialFields: CollectionAfterReadHook = ({ doc, req }) => {
  const user = req.user as UserLike
  const role = getUserRole(user)
  const editorial =
    isUserActive(user) &&
    (role === 'admin' || role === 'reviewer' || role === 'researcher')

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
  if (doc?.markedOutdated === true || doc?.workflowState === 'archived') {
    return null
  }

  const next = { ...doc } as Record<string, unknown>
  for (const key of WORKFLOW_PRIVATE) {
    delete next[key]
  }

  // Sanitize related transactions: keep only populated docs that would pass public Where.
  // Drop raw IDs (populate denied) so relationship IDs of hidden docs never leak.
  if (Array.isArray(next.prerequisiteProcedures)) {
    next.prerequisiteProcedures = next.prerequisiteProcedures.filter((item) => {
      if (!item || typeof item !== 'object') return false
      const rel = item as Record<string, unknown>
      if (rel._status !== 'published') return false
      if (rel.active !== true) return false
      if (rel.markedOutdated === true) return false
      if (rel.workflowState === 'archived') return false
      return true
    })
  }

  return next
}

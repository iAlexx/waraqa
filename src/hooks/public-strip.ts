import type { CollectionAfterReadHook } from 'payload'

import { getUserRole, isUserActive, type UserLike } from '@/access/roles'

/** Strip editorial-only fields from anonymous / viewer responses. */
export const stripPrivateEditorialFields: CollectionAfterReadHook = ({ doc, req }) => {
  const user = req.user as UserLike
  const role = getUserRole(user)
  const editorial =
    isUserActive(user) &&
    (role === 'admin' || role === 'reviewer' || role === 'researcher')

  if (editorial) return doc

  const next = { ...doc } as Record<string, unknown>
  delete next.internalNotes
  delete next.notes
  delete next.createdBy
  delete next.lastUpdatedBy
  delete next.publishedBy
  return next
}

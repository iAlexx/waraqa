import type { CollectionAfterReadHook } from 'payload'

import { publicationStatusLabelAr } from '@/lib/workflow/admin-actions'

/** Attach Arabic publication status for Admin list/edit (virtual field). */
export const attachPublicationStatusLabel: CollectionAfterReadHook = ({ doc }) => {
  if (!doc || typeof doc !== 'object') return doc
  const status = (doc as { _status?: string })._status
  const publishedAt = (doc as { publishedAt?: string | null }).publishedAt
  ;(doc as { publicationStatus?: string }).publicationStatus = publicationStatusLabelAr({
    status,
    // Retained publishedAt after unpublish ⇒ draft with a published version.
    hasPublishedVersion: status === 'draft' && Boolean(publishedAt),
  })
  return doc
}

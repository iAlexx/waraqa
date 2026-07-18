import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

import { getUserRole, isUserActive, type UserLike } from '@/access/roles'
import { allowSeedBypass } from '@/lib/qa-seed-guard'

type StatusData = {
  _status?: 'draft' | 'published' | null
  publishedAt?: string | null
  publishedBy?: number | string | null
  createdBy?: number | string | null
  lastUpdatedBy?: number | string | null
  [key: string]: unknown
}

function userId(user: UserLike): number | string | undefined {
  if (!user || typeof user !== 'object') return undefined
  return user.id
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
 * Server-side publish enforcement: only admin/reviewer may set _status=published.
 * Researchers cannot bypass Admin UI restrictions via REST/Local API.
 */
export const enforcePublishAuthorization: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
}) => {
  if (allowSeedBypass(req)) {
    return data
  }

  const next = data as StatusData
  const user = req.user as UserLike
  const role = getUserRole(user)
  const wasPublished = (originalDoc as StatusData | undefined)?._status === 'published'
  const willPublish = next._status === 'published'
  const willUnpublish = wasPublished && next._status === 'draft'

  if ((willPublish && !wasPublished) || willUnpublish) {
    if (!isUserActive(user) || (role !== 'admin' && role !== 'reviewer')) {
      throw new APIError(
        'غير مصرّح: النشر وإلغاء النشر مسموحان فقط لدورَي المدير والمراجع.',
        403,
      )
    }
  }

  return data
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

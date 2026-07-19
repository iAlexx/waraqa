import type { Access, AccessArgs, Where } from 'payload'

import { getUserRole, isUserActive, type UserLike, type WaraqaRole } from './roles'

type Args = AccessArgs

/** Published + active — used by content collections without workflow fields. */
export const publishedActiveWhere: Where = {
  and: [{ _status: { equals: 'published' } }, { active: { equals: true } }],
}

/**
 * Anonymous / viewer public read for `transactions`.
 * Query-layer exclusion (primary): published + active + not archived + not manually outdated.
 * `afterRead` may still strip private fields / null-out as defense in depth only.
 */
export const publicTransactionWhere: Where = {
  and: [
    { _status: { equals: 'published' } },
    { active: { equals: true } },
    // Checkbox may be null/false — exclude only explicit true (owner gate).
    { markedOutdated: { not_equals: true } },
    // Public must never list archived.
    { workflowState: { not_equals: 'archived' } },
  ],
}

export const isAuthenticated: Access = ({ req: { user } }: Args) => {
  return Boolean(user && isUserActive(user as UserLike))
}

export const isAdmin: Access = ({ req: { user } }: Args) => {
  return isUserActive(user as UserLike) && getUserRole(user as UserLike) === 'admin'
}

export function hasRole(...roles: WaraqaRole[]): Access {
  return ({ req: { user } }: Args) => {
    if (!isUserActive(user as UserLike)) return false
    const role = getUserRole(user as UserLike)
    return role !== null && roles.includes(role)
  }
}

/** Create/update drafts: admin, reviewer, researcher. */
export const canEditContent: Access = hasRole('admin', 'reviewer', 'researcher')

/** Reviewer + admin editorial read/update. */
export const canReviewContent: Access = hasRole('admin', 'reviewer')

/** Publish / unpublish: admin and reviewer (roadmap reviewer “per policy”). */
export const canPublishContent: Access = hasRole('admin', 'reviewer')

export function isEditorialUser(user: UserLike): boolean {
  if (!isUserActive(user)) return false
  const role = getUserRole(user)
  return role === 'admin' || role === 'reviewer' || role === 'researcher'
}

/**
 * Anonymous: published + active only (categories, agencies, sources, documents, centers).
 * Editorial roles: full read. Viewer: same as anonymous.
 */
export const publicPublishedRead: Access = ({ req: { user } }: Args) => {
  if (!user || !isUserActive(user as UserLike)) {
    return publishedActiveWhere
  }

  const role = getUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer' || role === 'researcher') {
    return true
  }

  return publishedActiveWhere
}

/**
 * Transactions public read — includes archived / outdated exclusion at the Where layer.
 */
export const publicTransactionRead: Access = ({ req: { user } }: Args) => {
  if (!user || !isUserActive(user as UserLike)) {
    return publicTransactionWhere
  }

  const role = getUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer' || role === 'researcher') {
    return true
  }

  return publicTransactionWhere
}

export const authenticatedEditorialRead: Access = ({ req: { user } }: Args) => {
  return isEditorialUser(user as UserLike)
}

/** Field-level boolean access for editorial-only fields. */
export const editorialFieldAccess = ({ req: { user } }: { req: { user?: unknown } }) =>
  isEditorialUser(user as UserLike)

/**
 * Update access: publishers can update anything;
 * researchers may only touch non-published docs (blocks Publish in Admin UI).
 */
export const contentUpdateAccess: Access = ({ req: { user } }: Args) => {
  if (!isUserActive(user as UserLike)) return false
  const role = getUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer') return true
  if (role === 'researcher') {
    return {
      _status: { not_equals: 'published' },
    } satisfies Where
  }
  return false
}

export const adminOnlyDelete: Access = isAdmin

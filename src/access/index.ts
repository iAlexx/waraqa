import type { Access, AccessArgs, Where } from 'payload'

import {
  getActiveUserRole,
  hasActiveRole,
  isUserActive,
  type UserLike,
  type WaraqaRole,
} from './roles'
import { getPubliclyAllowedContentClasses } from '@/lib/content-class/public-content-policy'

type Args = AccessArgs

/** Published + active — used by content collections without workflow/contentClass. */
export const publishedActiveWhere: Where = {
  and: [{ _status: { equals: 'published' } }, { active: { equals: true } }],
}

/**
 * Anonymous / viewer public read for `transactions`.
 * Includes contentClass filter from WARAQA_PUBLIC_CONTENT_MODE (P0-06).
 * Prefer `getPublicTransactionWhere()` — the static export is production-mode snapshot for tests.
 */
export function getPublicTransactionWhere(): Where {
  return {
    and: [
      { _status: { equals: 'published' } },
      { active: { equals: true } },
      { markedOutdated: { not_equals: true } },
      { workflowState: { not_equals: 'archived' } },
      { claimTrustOk: { equals: true } },
      { contentClass: { in: getPubliclyAllowedContentClasses() } },
    ],
  }
}

/** @deprecated Prefer getPublicTransactionWhere() for mode-aware filtering. */
export const publicTransactionWhere: Where = {
  and: [
    { _status: { equals: 'published' } },
    { active: { equals: true } },
    { markedOutdated: { not_equals: true } },
    { workflowState: { not_equals: 'archived' } },
    { claimTrustOk: { equals: true } },
    { contentClass: { in: ['PRODUCTION'] } },
  ],
}

/** Sources (and similar) public read with content-class isolation. */
export function getPublicPublishedContentWhere(): Where {
  return {
    and: [
      { _status: { equals: 'published' } },
      { active: { equals: true } },
      { contentClass: { in: getPubliclyAllowedContentClasses() } },
    ],
  }
}

export const isAuthenticated: Access = ({ req: { user } }: Args) => {
  return Boolean(user && isUserActive(user as UserLike))
}

export const isAdmin: Access = ({ req: { user } }: Args) => {
  return hasActiveRole(user as UserLike, 'admin')
}

export function hasRole(...roles: WaraqaRole[]): Access {
  return ({ req: { user } }: Args) => {
    return hasActiveRole(user as UserLike, ...roles)
  }
}

/** Create/update drafts: admin, reviewer, researcher. */
export const canEditContent: Access = hasRole('admin', 'reviewer', 'researcher')

/** Reviewer + admin editorial read/update. */
export const canReviewContent: Access = hasRole('admin', 'reviewer')

/** Publish / unpublish: admin and reviewer (roadmap reviewer “per policy”). */
export const canPublishContent: Access = hasRole('admin', 'reviewer')

export function isEditorialUser(user: UserLike): boolean {
  return hasActiveRole(user, 'admin', 'reviewer', 'researcher')
}

/**
 * Anonymous: published + active only (categories, agencies, documents, centers).
 * Editorial roles: full read. Viewer: same as anonymous.
 */
export const publicPublishedRead: Access = ({ req: { user } }: Args) => {
  if (!user || !isUserActive(user as UserLike)) {
    return publishedActiveWhere
  }

  const role = getActiveUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer' || role === 'researcher') {
    return true
  }

  return publishedActiveWhere
}

/** Sources: published + active + contentClass allowed for public mode. */
export const publicSourceRead: Access = ({ req: { user } }: Args) => {
  if (!user || !isUserActive(user as UserLike)) {
    return getPublicPublishedContentWhere()
  }
  const role = getActiveUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer' || role === 'researcher') {
    return true
  }
  return getPublicPublishedContentWhere()
}

/**
 * Transactions public read — includes archived / outdated / contentClass exclusion.
 */
export const publicTransactionRead: Access = ({ req: { user } }: Args) => {
  if (!user || !isUserActive(user as UserLike)) {
    return getPublicTransactionWhere()
  }

  const role = getActiveUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer' || role === 'researcher') {
    return true
  }

  return getPublicTransactionWhere()
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
  const role = getActiveUserRole(user as UserLike)
  if (role === 'admin' || role === 'reviewer') return true
  if (role === 'researcher') {
    return {
      _status: { not_equals: 'published' },
    } satisfies Where
  }
  return false
}

export const adminOnlyDelete: Access = isAdmin

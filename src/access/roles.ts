export type WaraqaRole = 'admin' | 'reviewer' | 'researcher' | 'viewer'

export const WARAQA_ROLES: WaraqaRole[] = [
  'admin',
  'reviewer',
  'researcher',
  'viewer',
]

export type UserLike = {
  id?: number | string
  role?: WaraqaRole | null
  isActive?: boolean | null
} | null
  | undefined

export function getUserRole(user: UserLike): WaraqaRole | null {
  if (!user || typeof user !== 'object') return null
  const role = user.role
  if (role === 'admin' || role === 'reviewer' || role === 'researcher' || role === 'viewer') {
    return role
  }
  return null
}

export function isUserActive(user: UserLike): boolean {
  // Fail closed: missing, null, or non-boolean active state is not privileged.
  return Boolean(user && typeof user === 'object' && user.isActive === true)
}

/** Resolve a role only for an explicitly active user. */
export function getActiveUserRole(user: UserLike): WaraqaRole | null {
  if (!isUserActive(user)) return null
  return getUserRole(user)
}

/** Shared fail-closed role predicate for server and Admin UI authorization. */
export function hasActiveRole(user: UserLike, ...roles: WaraqaRole[]): boolean {
  const role = getActiveUserRole(user)
  return role !== null && roles.includes(role)
}

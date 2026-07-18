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
  if (!user) return false
  return user.isActive !== false
}

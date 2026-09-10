import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { canEditContent, canPublishContent, canReviewContent, publicTransactionRead } from '@/access'
import { getActiveUserRole, hasActiveRole, isUserActive, type UserLike } from '@/access/roles'
import { rejectInactiveUserLogin, revokeSessionsOnDeactivation, Users } from '@/collections/Users'

const user = (role: 'admin' | 'reviewer' | 'researcher' | 'viewer', isActive: unknown) =>
  ({ id: 42, role, isActive, collection: 'users' }) as UserLike

async function runUserAccess(
  operation: 'admin' | 'create' | 'delete' | 'read' | 'update',
  actor: UserLike,
) {
  const rule = Users.access?.[operation] as Access
  return rule({ req: { user: actor } } as never)
}

function userFieldUpdateAccess(name: 'isActive' | 'role', actor: UserLike): boolean {
  const field = Users.fields.find((candidate) => 'name' in candidate && candidate.name === name) as
    { access?: { update?: (args: unknown) => boolean } } | undefined
  return Boolean(field?.access?.update?.({ req: { user: actor } }))
}

describe('P0-03 active-user authorization', () => {
  it('fails closed when active state is absent or invalid', () => {
    for (const candidate of [
      { id: 1, role: 'admin' },
      { id: 1, role: 'admin', isActive: null },
      { id: 1, role: 'admin', isActive: 'true' },
      null,
    ]) {
      expect(isUserActive(candidate as UserLike)).toBe(false)
      expect(getActiveUserRole(candidate as UserLike)).toBe(null)
      expect(hasActiveRole(candidate as UserLike, 'admin')).toBe(false)
      expect(canEditContent({ req: { user: candidate } } as never)).toBe(false)
    }
  })

  it('denies inactive admins across Admin and user-management access', async () => {
    const inactiveAdmin = user('admin', false)
    for (const operation of ['admin', 'create', 'delete', 'read', 'update'] as const) {
      expect(await runUserAccess(operation, inactiveAdmin)).toBe(false)
    }
    expect(userFieldUpdateAccess('role', inactiveAdmin)).toBe(false)
    expect(userFieldUpdateAccess('isActive', inactiveAdmin)).toBe(false)
  })

  it('denies inactive reviewer and researcher permissions', async () => {
    for (const role of ['reviewer', 'researcher'] as const) {
      const inactive = user(role, false)
      expect(canEditContent({ req: { user: inactive } } as never)).toBe(false)
      expect(canReviewContent({ req: { user: inactive } } as never)).toBe(false)
      expect(await runUserAccess('read', inactive)).toBe(false)
      expect(await runUserAccess('update', inactive)).toBe(false)
      expect(await runUserAccess('delete', inactive)).toBe(false)
    }
  })

  it('preserves expected permissions for explicitly active users', async () => {
    const admin = user('admin', true)
    const reviewer = user('reviewer', true)
    const researcher = user('researcher', true)

    expect(await runUserAccess('admin', admin)).toBe(true)
    expect(await runUserAccess('create', admin)).toBe(true)
    expect(await runUserAccess('delete', admin)).toBe(true)
    expect(userFieldUpdateAccess('role', admin)).toBe(true)
    expect(userFieldUpdateAccess('isActive', admin)).toBe(true)
    expect(canReviewContent({ req: { user: reviewer } } as never)).toBe(true)
    expect(canEditContent({ req: { user: researcher } } as never)).toBe(true)
    expect(canPublishContent({ req: { user: reviewer } } as never)).toBe(true)
    expect(canPublishContent({ req: { user: admin } } as never)).toBe(true)
  })

  it('does not grant editorial query access to inactive admins', () => {
    const inactiveAdmin = user('admin', false)
    expect(publicTransactionRead({ req: { user: inactiveAdmin } } as never)).toEqual(
      expect.objectContaining({
        and: expect.arrayContaining([{ _status: { equals: 'published' } }]),
      }),
    )
    expect(canPublishContent({ req: { user: inactiveAdmin } } as never)).toBe(false)
  })

  it('rejects inactive login and accepts explicitly active login', async () => {
    expect(() =>
      rejectInactiveUserLogin({
        req: {},
        user: user('admin', false),
      } as never),
    ).toThrow(expect.objectContaining({ status: 401 }))

    const active = user('admin', true)
    expect(await rejectInactiveUserLogin({ req: {}, user: active } as never)).toBe(active)
  })

  it('clears sessions only for an active-to-inactive transition', async () => {
    const sessions = [
      { id: 'session-1', createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() },
    ]
    const deactivated = (await revokeSessionsOnDeactivation({
      operation: 'update',
      originalDoc: { isActive: true, sessions },
      data: { isActive: false, sessions },
    } as never)) as Record<string, unknown>
    expect(deactivated.sessions).toEqual([])

    const unrelated = { displayName: 'Updated', sessions }
    expect(
      await revokeSessionsOnDeactivation({
        operation: 'update',
        originalDoc: { isActive: true, sessions },
        data: unrelated,
      } as never),
    ).toEqual(unrelated)
  })
})

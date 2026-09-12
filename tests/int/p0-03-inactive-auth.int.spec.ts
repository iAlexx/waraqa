import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
const createdUserIDs: Array<number | string> = []
const seedContext = { seed: true as const }

async function createUser(
  label: string,
  role: 'admin' | 'reviewer' | 'researcher' = 'admin',
) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const doc = await payload.create({
    collection: 'users',
    data: {
      email: `p0-03-${label}-${stamp}@example.test`,
      password: 'P0-03-Test-Passphrase!',
      name: `P0-03 ${label}`,
      role,
      isActive: true,
    },
    overrideAccess: true,
    context: seedContext,
  })
  createdUserIDs.push(doc.id)
  return doc
}

async function persistedSessions(id: number | string) {
  const doc = await payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return doc.sessions ?? []
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  for (const id of createdUserIDs.reverse()) {
    try {
      await payload.delete({
        collection: 'users',
        id,
        overrideAccess: true,
        context: { seed: true },
      })
    } catch {
      // Best-effort cleanup in the disposable integration database.
    }
  }
})

describe('P0-03 inactive-user sessions', () => {
  it('revokes an active admin session on deactivation and denies reuse/login', async () => {
    const admin = await createUser('revoke')
    const login = await payload.login({
      collection: 'users',
      data: { email: admin.email, password: 'P0-03-Test-Passphrase!' },
    })
    expect(login.token).toBeTruthy()

    const headers = new Headers({ authorization: `Bearer ${login.token}` })
    const authenticated = await payload.auth({ headers })
    expect(authenticated.user?.id).toBe(admin.id)
    expect(await persistedSessions(admin.id)).toHaveLength(1)

    const privilegedRead = await payload.find({
      collection: 'users',
      limit: 10,
      depth: 0,
      user: authenticated.user ?? undefined,
      overrideAccess: false,
    })
    expect(privilegedRead.totalDocs).toBeGreaterThanOrEqual(1)

    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { isActive: false },
      overrideAccess: true,
      context: { seed: true },
    })

    expect(await persistedSessions(admin.id)).toHaveLength(0)
    const afterDeactivation = await payload.auth({ headers })
    expect(afterDeactivation.user).toBeNull()
    await expect(
      payload.find({
        collection: 'users',
        limit: 10,
        depth: 0,
        user: afterDeactivation.user ?? undefined,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: admin.email, password: 'P0-03-Test-Passphrase!' },
      }),
    ).rejects.toMatchObject({ status: 401 })
    expect(await persistedSessions(admin.id)).toHaveLength(0)
  })

  it('preserves sessions when an unrelated field changes while active', async () => {
    const admin = await createUser('preserve')
    const login = await payload.login({
      collection: 'users',
      data: { email: admin.email, password: 'P0-03-Test-Passphrase!' },
    })
    expect(login.token).toBeTruthy()
    const before = await persistedSessions(admin.id)
    expect(before).toHaveLength(1)

    await payload.update({
      collection: 'users',
      id: admin.id,
      data: { displayName: 'P0-03 updated display' },
      overrideAccess: true,
      context: { seed: true },
    })

    const after = await persistedSessions(admin.id)
    expect(after.map((session) => session.id)).toEqual(before.map((session) => session.id))
    const authenticated = await payload.auth({
      headers: new Headers({ authorization: `Bearer ${login.token}` }),
    })
    expect(authenticated.user?.id).toBe(admin.id)
  })

  it('denies inactive reviewer and researcher Local API access', async () => {
    const reviewer = await createUser('reviewer', 'reviewer')
    const researcher = await createUser('researcher', 'researcher')

    await payload.update({
      collection: 'users',
      id: reviewer.id,
      data: { isActive: false },
      overrideAccess: true,
      context: { seed: true },
    })
    await payload.update({
      collection: 'users',
      id: researcher.id,
      data: { isActive: false },
      overrideAccess: true,
      context: { seed: true },
    })

    const inactiveReviewer = await payload.findByID({
      collection: 'users',
      id: reviewer.id,
      depth: 0,
      overrideAccess: true,
      context: { seed: true },
    })
    const inactiveResearcher = await payload.findByID({
      collection: 'users',
      id: researcher.id,
      depth: 0,
      overrideAccess: true,
      context: { seed: true },
    })

    await expect(
      payload.find({
        collection: 'users',
        limit: 10,
        depth: 0,
        user: inactiveReviewer,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.find({
        collection: 'users',
        limit: 10,
        depth: 0,
        user: inactiveResearcher,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.login({
        collection: 'users',
        data: { email: reviewer.email, password: 'P0-03-Test-Passphrase!' },
      }),
    ).rejects.toMatchObject({ status: 401 })
  })
})

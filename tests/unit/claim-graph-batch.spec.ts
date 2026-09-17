/**
 * Unit coverage for batched Claim/Source graph resolution (Phase 13 perf).
 * Proves unique IDs are fetched once; missing claim/source fail-closed;
 * contentClass / required semantics unchanged; no findByID on batch path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createClaimGraphBatchStats,
  resolveClaimGraphBatch,
} from '@/lib/claims/claim-graph-batch'
import {
  createLivePublicTrustBatchStats,
  liveEvaluatePublicTransactionsClaimTrust,
} from '@/lib/claims/public-claim-trust'
import { evaluateTransactionClaimTrustOk } from '@/lib/claims/validate-claim-publication'

function authoritativeClaim(id: string, sourceIds: string[], contentClass = 'PRODUCTION') {
  return {
    id,
    _status: 'published',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    contentClass,
    reviewedBy: 1,
    verifiedAt: '2026-07-01T12:00:00.000Z',
    evidence: sourceIds.map((source) => ({ source, relationType: 'SUPPORTS' })),
    active: true,
  }
}

function authoritativeSource(id: string, contentClass = 'PRODUCTION') {
  return {
    id,
    active: true,
    verificationStatus: 'verified',
    officialUrl: 'https://example.test/official',
    contentClass,
    _status: 'published',
  }
}

describe('resolveClaimGraphBatch', () => {
  const find = vi.fn()
  const findByID = vi.fn()
  const payload = { find, findByID }

  beforeEach(() => {
    find.mockReset()
    findByID.mockReset()
  })

  it('fetches duplicate claim IDs across transactions once', async () => {
    const sharedClaim = authoritativeClaim('c1', ['s1'])
    const otherClaim = authoritativeClaim('c2', ['s1'])
    const source = authoritativeSource('s1')

    find.mockImplementation(async (args: { collection: string; where: { and: Array<{ id?: { in: unknown[] } }> } }) => {
      const ids = (args.where.and.find((c) => c.id)?.id?.in ?? []).map(String)
      if (args.collection === 'claims') {
        return {
          docs: [sharedClaim, otherClaim].filter((c) => ids.includes(String(c.id))),
        }
      }
      return {
        docs: [source].filter((s) => ids.includes(String(s.id))),
      }
    })

    const stats = createClaimGraphBatchStats()
    const { claims, sources } = await resolveClaimGraphBatch(
      payload as never,
      [
        [{ claim: 'c1', required: true }],
        [{ claim: 'c1', required: true }, { claim: 'c2', required: true }],
        [{ claim: 'c2', required: true }],
      ],
      undefined,
      stats,
    )

    expect(findByID).not.toHaveBeenCalled()
    expect(stats.claimQueries).toBe(1)
    expect(stats.sourceQueries).toBe(1)
    expect(stats.uniqueClaimIds).toBe(2)
    expect(stats.uniqueSourceIds).toBe(1)
    expect(stats.claimFindByIdCalls).toBe(0)
    expect(claims.size).toBe(2)
    expect(sources.size).toBe(1)

    const claimInCalls = find.mock.calls.filter((c) => c[0].collection === 'claims')
    expect(claimInCalls).toHaveLength(1)
    expect(new Set(claimInCalls[0][0].where.and.find((x: { id?: unknown }) => x.id).id.in.map(String))).toEqual(
      new Set(['c1', 'c2']),
    )
  })

  it('fetches duplicate source IDs once', async () => {
    find.mockImplementation(async (args: { collection: string; where: { and: Array<{ id?: { in: unknown[] } }> } }) => {
      const ids = (args.where.and.find((c) => c.id)?.id?.in ?? []).map(String)
      if (args.collection === 'claims') {
        return {
          docs: [
            authoritativeClaim('c1', ['sShared', 's2']),
            authoritativeClaim('c2', ['sShared']),
          ].filter((c) => ids.includes(String(c.id))),
        }
      }
      return {
        docs: [authoritativeSource('sShared'), authoritativeSource('s2')].filter((s) =>
          ids.includes(String(s.id)),
        ),
      }
    })

    const stats = createClaimGraphBatchStats()
    await resolveClaimGraphBatch(
      payload as never,
      [[{ claim: 'c1' }], [{ claim: 'c2' }]],
      undefined,
      stats,
    )

    expect(stats.uniqueSourceIds).toBe(2)
    expect(stats.sourceQueries).toBe(1)
    const sourceCall = find.mock.calls.find((c) => c[0].collection === 'sources')
    expect(
      new Set(sourceCall![0].where.and.find((x: { id?: unknown }) => x.id).id.in.map(String)),
    ).toEqual(new Set(['sShared', 's2']))
  })

  it('missing claim fails trust (fail-closed)', async () => {
    find.mockResolvedValue({ docs: [] })
    const { claims, sources } = await resolveClaimGraphBatch(payload as never, [
      [{ claim: 'missing', required: true }],
    ])
    expect(
      evaluateTransactionClaimTrustOk([{ claim: 'missing', required: true }], claims, sources, {
        transactionContentClass: 'PRODUCTION',
      }),
    ).toBe(false)
  })

  it('missing source fails trust (fail-closed)', async () => {
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'claims') {
        return { docs: [authoritativeClaim('c1', ['gone'])] }
      }
      return { docs: [] }
    })

    const { claims, sources } = await resolveClaimGraphBatch(payload as never, [
      [{ claim: 'c1', required: true }],
    ])
    expect(
      evaluateTransactionClaimTrustOk([{ claim: 'c1', required: true }], claims, sources, {
        transactionContentClass: 'PRODUCTION',
      }),
    ).toBe(false)
  })

  it('required claim semantics remain unchanged (WARNING_ONLY fails)', async () => {
    find.mockImplementation(async (args: { collection: string }) => {
      if (args.collection === 'claims') {
        return {
          docs: [
            {
              ...authoritativeClaim('c1', ['s1']),
              publicationPermission: 'PUBLIC_WITH_WARNING',
            },
          ],
        }
      }
      return { docs: [authoritativeSource('s1')] }
    })

    const { claims, sources } = await resolveClaimGraphBatch(payload as never, [
      [{ claim: 'c1', required: true }],
    ])
    expect(
      evaluateTransactionClaimTrustOk([{ claim: 'c1', required: true }], claims, sources, {
        transactionContentClass: 'PRODUCTION',
      }),
    ).toBe(false)
  })
})

describe('liveEvaluatePublicTransactionsClaimTrust batch gates', () => {
  const prevMode = process.env.WARAQA_PUBLIC_CONTENT_MODE

  beforeEach(() => {
    process.env.WARAQA_PUBLIC_CONTENT_MODE = 'demo'
  })

  afterEach(() => {
    if (prevMode === undefined) delete process.env.WARAQA_PUBLIC_CONTENT_MODE
    else process.env.WARAQA_PUBLIC_CONTENT_MODE = prevMode
  })

  it('contentClass isolation: DEMO tx fails in production mode', async () => {
    process.env.WARAQA_PUBLIC_CONTENT_MODE = 'production'
    const find = vi.fn()
    const payload = { find, findByID: vi.fn() }

    const flags = await liveEvaluatePublicTransactionsClaimTrust(payload as never, [
      {
        id: 1,
        claimTrustOk: true,
        contentClass: 'DEMO',
        claimBindings: [{ claim: 'c1', required: true }],
      },
    ])

    expect(flags).toEqual([false])
    expect(find).not.toHaveBeenCalled()
  })

  it('DEMO/PRODUCTION isolation: QA_TEST never trusted', async () => {
    const find = vi.fn()
    const payload = { find, findByID: vi.fn() }
    const flags = await liveEvaluatePublicTransactionsClaimTrust(payload as never, [
      {
        id: 1,
        claimTrustOk: true,
        contentClass: 'QA_TEST',
        claimBindings: [{ claim: 'c1', required: true }],
      },
    ])
    expect(flags).toEqual([false])
    expect(find).not.toHaveBeenCalled()
  })

  it('trusted DEMO docs share one claim+source query under demo mode', async () => {
    const find = vi.fn(async (args: { collection: string }) => {
      if (args.collection === 'claims') {
        return { docs: [authoritativeClaim('c1', ['s1'], 'DEMO')] }
      }
      return { docs: [authoritativeSource('s1', 'DEMO')] }
    })
    const payload = { find, findByID: vi.fn() }
    const stats = createLivePublicTrustBatchStats()

    const flags = await liveEvaluatePublicTransactionsClaimTrust(
      payload as never,
      [
        {
          id: 1,
          claimTrustOk: true,
          contentClass: 'DEMO',
          claimBindings: [{ claim: 'c1', required: true }],
        },
        {
          id: 2,
          claimTrustOk: true,
          contentClass: 'DEMO',
          claimBindings: [{ claim: 'c1', required: true }],
        },
      ],
      undefined,
      stats,
    )

    expect(flags).toEqual([true, true])
    expect(stats.claimQueries).toBe(1)
    expect(stats.sourceQueries).toBe(1)
    expect(stats.uniqueClaimIds).toBe(1)
    expect(stats.trustedDocs).toBe(2)
    expect(payload.findByID).not.toHaveBeenCalled()
  })
})

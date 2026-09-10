import { describe, expect, it } from 'vitest'

import { evaluateClaimTrust } from '@/lib/claims/claim-trust'
import { evaluateSourceTrust } from '@/lib/claims/source-trust'
import { validateClaimBindingsForPublication } from '@/lib/claims/validate-claim-publication'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

function source(partial: Partial<SourceDocLike> & { id: number }): SourceDocLike {
  return {
    active: true,
    verificationStatus: 'verified',
    officialUrl: 'https://example.test/official',
    ...partial,
  }
}

function baseVerifiedClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: 'claim_fee_required',
    active: true,
    _status: 'published' as const,
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    reviewedBy: 9,
    verifiedAt: '2026-07-01T00:00:00.000Z',
    evidence: [{ source: 10, relationType: 'SUPPORTS' as const }],
    ...overrides,
  }
}

describe('P0-05B1 claim trust policy', () => {
  const sources = new Map<string, SourceDocLike>([[ '10', source({ id: 10 }) ]])

  it('A: VERIFIED + PUBLIC + valid evidence → AUTHORITATIVE', () => {
    expect(evaluateClaimTrust(baseVerifiedClaim(), sources).level).toBe('AUTHORITATIVE')
  })

  it('B: VERIFIED + PUBLIC but supporting Source unverified → BLOCKED', () => {
    const bad = new Map([[ '10', source({ id: 10, verificationStatus: 'needs_review' }) ]])
    expect(evaluateClaimTrust(baseVerifiedClaim(), bad).level).toBe('BLOCKED')
  })

  it('C: UNKNOWN + PUBLIC_WITH_WARNING → WARNING_ONLY', () => {
    expect(
      evaluateClaimTrust(
        baseVerifiedClaim({
          status: 'UNKNOWN',
          publicationPermission: 'PUBLIC_WITH_WARNING',
          reviewedBy: null,
          verifiedAt: null,
          evidence: [],
        }),
        sources,
      ).level,
    ).toBe('WARNING_ONLY')
  })

  it('D: CONFLICTED + PUBLIC_WITH_WARNING → WARNING_ONLY', () => {
    expect(
      evaluateClaimTrust(
        baseVerifiedClaim({
          status: 'CONFLICTED',
          publicationPermission: 'PUBLIC_WITH_WARNING',
          evidence: [
            { source: 10, relationType: 'SUPPORTS' },
            { source: 11, relationType: 'CONTRADICTS' },
          ],
        }),
        new Map([
          ['10', source({ id: 10 })],
          ['11', source({ id: 11 })],
        ]),
      ).level,
    ).toBe('WARNING_ONLY')
  })

  it('E: NEEDS_OFFICIAL_CONFIRMATION + PUBLIC_WITH_WARNING → WARNING_ONLY', () => {
    expect(
      evaluateClaimTrust(
        baseVerifiedClaim({
          status: 'NEEDS_OFFICIAL_CONFIRMATION',
          publicationPermission: 'PUBLIC_WITH_WARNING',
          evidence: [],
        }),
        sources,
      ).level,
    ).toBe('WARNING_ONLY')
  })

  it('F–K: unsafe statuses/permissions → BLOCKED', () => {
    for (const status of ['DRAFT', 'OUTDATED', 'SUPERSEDED', 'REJECTED'] as const) {
      expect(evaluateClaimTrust(baseVerifiedClaim({ status }), sources).level).toBe('BLOCKED')
    }
    expect(
      evaluateClaimTrust(baseVerifiedClaim({ publicationPermission: 'BLOCKED' }), sources).level,
    ).toBe('BLOCKED')
    expect(
      evaluateClaimTrust(baseVerifiedClaim({ publicationPermission: 'INTERNAL_ONLY' }), sources)
        .level,
    ).toBe('BLOCKED')
  })

  it('L: invalid/unrecognized state → fail closed BLOCKED', () => {
    expect(
      evaluateClaimTrust(baseVerifiedClaim({ status: 'verified' }), sources).level,
    ).toBe('BLOCKED')
    expect(
      evaluateClaimTrust(baseVerifiedClaim({ publicationPermission: 'public' }), sources).level,
    ).toBe('BLOCKED')
  })

  it('UNKNOWN never becomes AUTHORITATIVE', () => {
    expect(
      evaluateClaimTrust(
        baseVerifiedClaim({
          status: 'UNKNOWN',
          publicationPermission: 'PUBLIC',
        }),
        sources,
      ).level,
    ).toBe('BLOCKED')
  })

  it('source trust rejects outdated/unverified', () => {
    expect(evaluateSourceTrust(source({ id: 1, verificationStatus: 'outdated' })).ok).toBe(false)
    expect(evaluateSourceTrust(source({ id: 1, verificationStatus: 'verified' })).ok).toBe(true)
  })

  it('M/N: publication gate requires AUTHORITATIVE bindings', () => {
    const claims = new Map([[ '1', baseVerifiedClaim() ]])
    const ok = validateClaimBindingsForPublication(
      [{ claim: 1, required: true }],
      claims,
      sources,
    )
    expect(ok.ok).toBe(true)

    const blocked = validateClaimBindingsForPublication(
      [{ claim: 1, required: true }],
      new Map([[ '1', baseVerifiedClaim({ status: 'DRAFT' }) ]]),
      sources,
    )
    expect(blocked.ok).toBe(false)
    expect(blocked.errors[0]).toContain('claim_fee_required')

    const unbound = validateClaimBindingsForPublication([], claims, sources)
    expect(unbound.ok).toBe(false)
    expect(unbound.errors[0]).toContain('ربط ادعاء')

    const warningOnly = validateClaimBindingsForPublication(
      [{ claim: 1, required: true }],
      new Map([
        [
          '1',
          baseVerifiedClaim({
            status: 'UNKNOWN',
            publicationPermission: 'PUBLIC_WITH_WARNING',
            evidence: [],
          }),
        ],
      ]),
      sources,
    )
    expect(warningOnly.ok).toBe(false)
    expect(warningOnly.evaluations[0]?.level).toBe('WARNING_ONLY')
  })
})

describe('P0-05B1 live public claim trust gate', () => {
  it('stored claimTrustOk false never passes live public gate', async () => {
    const { liveEvaluatePublicTransactionClaimTrust } = await import(
      '@/lib/claims/public-claim-trust'
    )
    const payload = {
      findByID: async () => {
        throw new Error('should not resolve graph when stored gate is false')
      },
    }
    await expect(
      liveEvaluatePublicTransactionClaimTrust(payload as never, {
        claimTrustOk: false,
        claimBindings: [{ claim: 1, required: true }],
      }),
    ).resolves.toBe(false)
  })
})

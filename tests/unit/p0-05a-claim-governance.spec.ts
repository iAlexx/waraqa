import { describe, expect, it } from 'vitest'

import { applyClaimGovernance } from '@/lib/claims/claim-governance'

const researcher = { id: 11, role: 'researcher' as const, isActive: true }
const reviewer = { id: 22, role: 'reviewer' as const, isActive: true }
const admin = { id: 33, role: 'admin' as const, isActive: true }
const inactiveReviewer = { id: 44, role: 'reviewer' as const, isActive: false }

describe('P0-05A claim governance', () => {
  it('allows researcher DRAFT research-stage edits', () => {
    const result = applyClaimGovernance({
      operation: 'create',
      user: researcher,
      data: {
        key: 'draft_ok',
        statement: 'مسودة',
        status: 'DRAFT',
        publicationPermission: 'INTERNAL_ONLY',
        evidence: [{ source: 1, relationType: 'SUPPORTS' }],
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.status).toBe('DRAFT')
    expect(result.data.reviewedBy).toBeUndefined()
    expect(result.data.verifiedAt).toBeUndefined()
  })

  it('blocks researcher self-verify and forged verification metadata', () => {
    const verified = applyClaimGovernance({
      operation: 'update',
      user: researcher,
      originalDoc: { status: 'DRAFT', publicationPermission: 'INTERNAL_ONLY' },
      data: {
        status: 'VERIFIED',
        reviewedBy: 99,
        verifiedAt: '2020-01-01T00:00:00.000Z',
        evidence: [{ source: 1, relationType: 'SUPPORTS' }],
      },
    })
    expect(verified.ok).toBe(false)

    const forgeMeta = applyClaimGovernance({
      operation: 'update',
      user: researcher,
      originalDoc: { status: 'NEEDS_REVIEW', publicationPermission: 'INTERNAL_ONLY' },
      data: {
        status: 'NEEDS_REVIEW',
        statement: 'تحديث',
        reviewedBy: 99,
        verifiedAt: '2020-01-01T00:00:00.000Z',
      },
    })
    expect(forgeMeta.ok).toBe(true)
    if (!forgeMeta.ok) return
    expect(forgeMeta.data.reviewedBy).toBeUndefined()
    expect(forgeMeta.data.verifiedAt).toBeUndefined()
  })

  it('blocks researcher PUBLIC / PUBLIC_WITH_WARNING / BLOCKED', () => {
    for (const publicationPermission of ['PUBLIC', 'PUBLIC_WITH_WARNING', 'BLOCKED'] as const) {
      const result = applyClaimGovernance({
        operation: 'create',
        user: researcher,
        data: {
          status: 'DRAFT',
          publicationPermission,
        },
      })
      expect(result.ok).toBe(false)
    }
  })

  it('stamps reviewer identity and server time on VERIFIED transition', () => {
    const result = applyClaimGovernance({
      operation: 'update',
      user: reviewer,
      originalDoc: { status: 'NEEDS_REVIEW', publicationPermission: 'INTERNAL_ONLY' },
      now: () => '2026-09-10T12:00:00.000Z',
      data: {
        status: 'VERIFIED',
        reviewedBy: 999,
        verifiedAt: '1999-01-01T00:00:00.000Z',
        publicationPermission: 'PUBLIC',
        evidence: [{ source: 1, relationType: 'SUPPORTS' }],
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.reviewedBy).toBe(22)
    expect(result.data.verifiedAt).toBe('2026-09-10T12:00:00.000Z')
  })

  it('preserves verification metadata when already VERIFIED', () => {
    const result = applyClaimGovernance({
      operation: 'update',
      user: admin,
      originalDoc: {
        status: 'VERIFIED',
        reviewedBy: 22,
        verifiedAt: '2026-07-01T00:00:00.000Z',
        publicationPermission: 'PUBLIC',
      },
      data: {
        status: 'VERIFIED',
        statement: 'تعديل صياغة',
        reviewedBy: 999,
        verifiedAt: '1999-01-01T00:00:00.000Z',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.reviewedBy).toBe(22)
    expect(result.data.verifiedAt).toBe('2026-07-01T00:00:00.000Z')
  })

  it('blocks inactive reviewer from verification / public grant', () => {
    const result = applyClaimGovernance({
      operation: 'update',
      user: inactiveReviewer,
      originalDoc: { status: 'DRAFT' },
      data: { status: 'VERIFIED', publicationPermission: 'PUBLIC' },
    })
    expect(result.ok).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import {
  CLAIM_EVIDENCE_RELATIONS,
  CLAIM_PUBLICATION_PERMISSIONS,
  CLAIM_STATUSES,
} from '@/lib/claims/types'
import { validateClaimData } from '@/lib/claims/validate-claim'

describe('P0-05A claim validation', () => {
  it('A: accepts a minimal DRAFT claim', () => {
    expect(
      validateClaimData({
        key: 'fee_amount_unknown_demo',
        statement: 'مبلغ الرسم غير معروف حالياً.',
        status: 'DRAFT',
        publicationPermission: 'INTERNAL_ONLY',
      }),
    ).toEqual([])
  })

  it('B: VERIFIED requires reviewer, verifiedAt, and supporting evidence', () => {
    expect(
      validateClaimData({
        key: 'req_secondary_cert',
        statement: 'شهادة الثانوية الأصلية مطلوبة.',
        status: 'VERIFIED',
        publicationPermission: 'PUBLIC',
        reviewedBy: 1,
        verifiedAt: '2026-07-01T00:00:00.000Z',
        evidence: [{ source: 10, relationType: 'SUPPORTS' }],
      }),
    ).toEqual([])

    const missing = validateClaimData({
      key: 'req_secondary_cert',
      statement: 'شهادة الثانوية الأصلية مطلوبة.',
      status: 'VERIFIED',
      publicationPermission: 'PUBLIC',
      evidence: [],
    })
    expect(missing.some((e) => e.includes('مراجعاً'))).toBe(true)
    expect(missing.some((e) => e.includes('تاريخ توثيق'))).toBe(true)
    expect(missing.some((e) => e.includes('دليلاً داعماً'))).toBe(true)
  })

  it('C: UNKNOWN needs no fabricated evidence or value', () => {
    expect(
      validateClaimData({
        key: 'fee_unknown',
        statement: 'مبلغ الرسم غير معروف.',
        status: 'UNKNOWN',
        publicationPermission: 'PUBLIC_WITH_WARNING',
      }),
    ).toEqual([])
  })

  it('D: CONFLICTED requires supporting and contradicting evidence', () => {
    expect(
      validateClaimData({
        key: 'attestation_order_conflict',
        statement: 'المصادر الرسمية تختلف على ترتيب التصديق.',
        status: 'CONFLICTED',
        publicationPermission: 'BLOCKED',
        evidence: [
          { source: 1, relationType: 'SUPPORTS' },
          { source: 2, relationType: 'CONTRADICTS' },
        ],
      }),
    ).toEqual([])

    const incomplete = validateClaimData({
      key: 'attestation_order_conflict',
      statement: 'المصادر الرسمية تختلف على ترتيب التصديق.',
      status: 'CONFLICTED',
      publicationPermission: 'BLOCKED',
      evidence: [{ source: 1, relationType: 'SUPPORTS' }],
    })
    expect(incomplete.some((e) => e.includes('مناقضاً'))).toBe(true)
  })

  it('E/F: all publication permissions and evidence relations are recognized', () => {
    for (const publicationPermission of CLAIM_PUBLICATION_PERMISSIONS) {
      expect(
        validateClaimData({
          key: `pub_${publicationPermission.toLowerCase()}`,
          statement: 'تحقق صلاحية النشر.',
          status: 'DRAFT',
          publicationPermission,
        }),
      ).toEqual([])
    }
    for (const relationType of CLAIM_EVIDENCE_RELATIONS) {
      expect(
        validateClaimData({
          key: `rel_${relationType.toLowerCase()}`,
          statement: 'تحقق نوع العلاقة.',
          status: 'DRAFT',
          publicationPermission: 'INTERNAL_ONLY',
          evidence: [{ source: 3, relationType }],
        }),
      ).toEqual([])
    }
  })

  it('I: invalid enums and duplicate sources fail closed', () => {
    const badStatus = validateClaimData({
      key: 'bad_status',
      statement: 'نص',
      status: 'verified',
      publicationPermission: 'INTERNAL_ONLY',
    })
    expect(badStatus.some((e) => e.includes('حالة'))).toBe(true)

    const badPub = validateClaimData({
      key: 'bad_pub',
      statement: 'نص',
      status: 'DRAFT',
      publicationPermission: 'public',
    })
    expect(badPub.some((e) => e.includes('صلاحية النشر'))).toBe(true)

    const dup = validateClaimData({
      key: 'dup_source',
      statement: 'نص',
      status: 'DRAFT',
      publicationPermission: 'INTERNAL_ONLY',
      evidence: [
        { source: 9, relationType: 'SUPPORTS' },
        { source: 9, relationType: 'CONTEXT_ONLY' },
      ],
    })
    expect(dup.some((e) => e.includes('مكرر'))).toBe(true)
  })

  it('rejects contradictory validity window', () => {
    const errors = validateClaimData({
      key: 'bad_window',
      statement: 'نص',
      status: 'DRAFT',
      publicationPermission: 'INTERNAL_ONLY',
      validFrom: '2026-08-01',
      validUntil: '2026-07-01',
    })
    expect(errors.some((e) => e.includes('نهاية الصلاحية'))).toBe(true)
  })

  it('exposes canonical status set without boolean collapse', () => {
    expect(CLAIM_STATUSES).toContain('UNKNOWN')
    expect(CLAIM_STATUSES).toContain('CONFLICTED')
    expect(CLAIM_STATUSES).not.toContain('verified')
  })
})

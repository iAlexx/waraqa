/**
 * Phase 13 — claim validFrom/validUntil window (fee-date-applicability analog).
 */
import { describe, expect, it } from 'vitest'

import { validateClaimData } from '@/lib/claims/validate-claim'

const base = {
  key: 'p13_fee_window_demo',
  statement: 'الرسم يسري ضمن نافذة الصلاحية المحددة.',
  status: 'DRAFT' as const,
  publicationPermission: 'INTERNAL_ONLY' as const,
}

describe('Phase 13 claim validity window', () => {
  it('accepts a valid from/until range', () => {
    expect(
      validateClaimData({
        ...base,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
      }),
    ).toEqual([])
  })

  it('accepts open-ended windows (from-only or until-only)', () => {
    expect(
      validateClaimData({
        ...base,
        validFrom: '2026-06-01',
      }),
    ).toEqual([])
    expect(
      validateClaimData({
        ...base,
        validUntil: '2026-06-01',
      }),
    ).toEqual([])
  })

  it('fails when until is before from', () => {
    const errors = validateClaimData({
      ...base,
      validFrom: '2026-08-01T00:00:00.000Z',
      validUntil: '2026-07-01T00:00:00.000Z',
    })
    expect(errors.some((e) => e.includes('تاريخ نهاية الصلاحية قبل بدايتها'))).toBe(true)
  })

  it('fails on invalid from / until dates', () => {
    const badFrom = validateClaimData({
      ...base,
      validFrom: 'not-a-date',
    })
    expect(badFrom.some((e) => e.includes('تاريخ بداية الصلاحية غير صالح'))).toBe(true)

    const badUntil = validateClaimData({
      ...base,
      validUntil: '32/13/9999',
    })
    expect(badUntil.some((e) => e.includes('تاريخ نهاية الصلاحية غير صالح'))).toBe(true)
  })
})

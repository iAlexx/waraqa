import { describe, expect, it } from 'vitest'

import { sanitizePublicHttpUrl, toSafePublicLink } from '@/lib/public/safe-url'
import {
  formatEstimatedDuration,
  formatPublicDate,
  labelAudience,
} from '@/lib/public/transaction-labels'
import {
  PUBLIC_DETAIL_FORBIDDEN_KEYS,
  mapPublicTransactionDetail,
} from '@/lib/public/transaction-detail-map'

function baseDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42,
    _status: 'published',
    active: true,
    markedOutdated: false,
    workflowState: 'published',
    claimTrustOk: true,
    contentClass: 'PRODUCTION',
    title: 'إخراج قيد تجريبي',
    slug: 'qa-p7-civil',
    summary: 'ملخص قصير للعرض العام.',
    lastReviewedAt: '2026-07-01T00:00:00.000Z',
    category: { id: 1, name: 'أحوال', slug: 'civil', _status: 'published', active: true },
    agency: { id: 2, name: 'السجل', slug: 'registry', _status: 'published', active: true },
    steps: [{ title: 'خطوة أولى', description: 'وصف الخطوة' }],
    sources: [],
    ...overrides,
  }
}

describe('safe public URLs', () => {
  it('allows http(s) only', () => {
    expect(sanitizePublicHttpUrl('https://example.gov.sy/path')).toContain('https://')
    expect(sanitizePublicHttpUrl('http://example.test')).toBeTruthy()
    expect(sanitizePublicHttpUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizePublicHttpUrl('ftp://x')).toBeNull()
    expect(sanitizePublicHttpUrl('')).toBeNull()
  })

  it('builds labeled safe links', () => {
    const link = toSafePublicLink('https://example.test/a', 'مصدر رسمي')
    expect(link).toEqual({ href: 'https://example.test/a', label: 'مصدر رسمي' })
  })
})

describe('transaction labels', () => {
  it('formats duration and audiences', () => {
    expect(labelAudience('citizen')).toBe('مواطن')
    expect(
      formatEstimatedDuration({ minimum: 2, maximum: 5, unit: 'business_days', note: 'تقريباً' }),
    ).toContain('2–5')
    expect(formatPublicDate('2026-07-01T00:00:00.000Z')).toBeTruthy()
  })
})

describe('mapPublicTransactionDetail', () => {
  it('maps eligible docs and omits empty optional sections as empty arrays/null', () => {
    const mapped = mapPublicTransactionDetail(baseDoc())
    expect(mapped).toBeTruthy()
    expect(mapped!.title).toContain('إخراج قيد')
    expect(mapped!.steps).toHaveLength(1)
    expect(mapped!.requiredDocuments).toEqual([])
    expect(mapped!.fees).toEqual([])
    expect(mapped!.serviceCenters).toEqual([])
    expect(mapped!.eligibility).toBeNull()
    for (const key of PUBLIC_DETAIL_FORBIDDEN_KEYS) {
      expect(mapped).not.toHaveProperty(key)
    }
  })

  it('rejects draft / archived / outdated / inactive', () => {
    expect(mapPublicTransactionDetail(baseDoc({ _status: 'draft' }))).toBeNull()
    expect(mapPublicTransactionDetail(baseDoc({ active: false }))).toBeNull()
    expect(mapPublicTransactionDetail(baseDoc({ workflowState: 'archived' }))).toBeNull()
    expect(mapPublicTransactionDetail(baseDoc({ markedOutdated: true }))).toBeNull()
    expect(mapPublicTransactionDetail(baseDoc({ claimTrustOk: false }))).toBeNull()
    expect(mapPublicTransactionDetail(baseDoc({ claimTrustOk: undefined }))).toBeNull()
  })

  it('preserves document/step/fee order and drops unpublished relations', () => {
    const mapped = mapPublicTransactionDetail(
      baseDoc({
        steps: [
          { title: 'أ', description: '١' },
          { title: 'ب', description: '٢' },
        ],
        requiredDocuments: [
          {
            document: { id: 1, name: 'هوية', _status: 'published', active: true },
            requirementType: 'required',
          },
          {
            document: { id: 2, name: 'مخفي', _status: 'draft', active: true },
            requirementType: 'required',
          },
        ],
        fees: [
          { label: 'رسم ١', amount: 1000, currency: 'SYP' },
          { label: 'رسم ٢', amountText: 'حسب الحالة' },
        ],
        sources: [
          {
            primary: true,
            source: {
              id: 9,
              title: 'مصدر',
              officialUrl: 'https://example.test/src',
              _status: 'published',
              active: true,
            },
          },
          {
            source: {
              id: 10,
              title: 'مسودة مصدر',
              officialUrl: 'https://example.test/draft',
              _status: 'draft',
              active: true,
            },
          },
        ],
        prerequisiteProcedures: [
          {
            id: 3,
            title: 'سابقة',
            slug: 'prev',
            _status: 'published',
            active: true,
            markedOutdated: false,
            workflowState: 'published',
            claimTrustOk: true,
            contentClass: 'PRODUCTION',
          },
          99,
        ],
        serviceCenters: [
          {
            id: 5,
            name: 'مركز',
            slug: 'c1',
            city: 'دمشق',
            governorate: 'damascus',
            _status: 'published',
            active: true,
          },
        ],
      }),
    )
    expect(mapped!.steps.map((s) => s.title)).toEqual(['أ', 'ب'])
    expect(mapped!.requiredDocuments.map((d) => d.name)).toEqual(['هوية'])
    expect(mapped!.fees.map((f) => f.label)).toEqual(['رسم ١', 'رسم ٢'])
    expect(mapped!.sources).toHaveLength(1)
    expect(mapped!.sources[0]!.officialLink?.href).toContain('https://')
    expect(mapped!.prerequisites).toHaveLength(1)
    expect(mapped!.prerequisites[0]!.href).toBe('/transactions/prev')
    expect(mapped!.serviceCenters).toHaveLength(1)
  })

  it('rejects unsafe source protocols', () => {
    const mapped = mapPublicTransactionDetail(
      baseDoc({
        sources: [
          {
            source: {
              id: 1,
              title: 'خطر',
              officialUrl: 'javascript:alert(1)',
              _status: 'published',
              active: true,
            },
          },
        ],
      }),
    )
    expect(mapped!.sources[0]!.officialLink).toBeNull()
  })
})

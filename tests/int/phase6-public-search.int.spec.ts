/**
 * Phase 6 public search — eligibility, ranking, filters (PostgreSQL).
 * Fictional QA data only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { parseSearchParams } from '@/lib/search/params'
import { runPublicSearch } from '@/lib/search/run-search'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }
const stamp = Date.now()

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  const category = await track(
    'categories',
    await payload.create({
      collection: 'categories',
      locale: 'ar',
      draft: false,
      data: {
        name: 'تصنيف بحث تجريبي',
        slug: `qa-p6-cat-${stamp}`,
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const agency = await track(
    'agencies',
    await payload.create({
      collection: 'agencies',
      locale: 'ar',
      draft: false,
      data: {
        name: 'جهة بحث تجريبية',
        slug: `qa-p6-agency-${stamp}`,
        type: 'other',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const center = await track(
    'service-centers',
    await payload.create({
      collection: 'service-centers',
      locale: 'ar',
      draft: false,
      data: {
        name: 'مركز خدمة بحث تجريبي',
        slug: `qa-p6-center-${stamp}`,
        agency: agency.id,
        governorate: 'damascus',
        city: 'دمشق',
        address: 'عنوان تجريبي للاختبار فقط',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const source = await track(
    'sources',
    await payload.create({
      collection: 'sources',
      locale: 'ar',
      draft: false,
      data: {
        title: 'مصدر بحث تجريبي',
        slug: `qa-p6-src-${stamp}`,
        sourceType: 'official_webpage',
        officialUrl: 'https://example.test/qa-p6',
        verificationStatus: 'verified',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const baseTx = {
    category: category.id,
    agency: agency.id,
    serviceCenters: [center.id],
    steps: [{ title: 'خطوة', description: 'وصف' }],
    sources: [
      {
        source: source.id,
        primary: true,
        coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
      },
    ],
    lastReviewedAt: new Date().toISOString(),
  }

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: `إخراج قيد نفوس تجريبي ${stamp}`,
        slug: `qa-p6-exact-title-${stamp}`,
        summary: 'ملخص إخراج قيد للبحث التجريبي فقط.',
        aliases: [{ value: `غير محكوم بديل ${stamp}` }],
        active: true,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: `سجل عدلي تجريبي ${stamp}`,
        slug: `qa-p6-alias-target-${stamp}`,
        summary: 'ملخص سجل عدلي.',
        aliases: [{ value: `لا حكم عليه ${stamp}` }],
        active: true,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: 'مسودة بحث تجريبية',
        slug: `qa-p6-draft-${stamp}`,
        summary: 'يجب أن تُخفى.',
        active: true,
        workflowState: 'draft',
        markedOutdated: false,
        _status: 'draft',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: 'معطّلة بحث تجريبية',
        slug: `qa-p6-inactive-${stamp}`,
        summary: 'يجب أن تُخفى.',
        active: false,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: 'مؤرشفة بحث تجريبية',
        slug: `qa-p6-archived-${stamp}`,
        summary: 'يجب أن تُخفى.',
        active: true,
        workflowState: 'archived',
        markedOutdated: false,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...baseTx,
        title: 'قديمة بحث تجريبية',
        slug: `qa-p6-outdated-${stamp}`,
        summary: 'يجب أن تُخفى.',
        active: true,
        workflowState: 'published',
        markedOutdated: true,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // Extra published rows for pagination
  for (let i = 0; i < 12; i++) {
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          ...baseTx,
          title: `معاملة ترقيم تجريبية ${String(i).padStart(2, '0')}`,
          slug: `qa-p6-page-${i}-${stamp}`,
          summary: `ملخص ترقيم ${i}`,
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }
})

afterAll(async () => {
  for (const row of [...created].reverse()) {
    try {
      await payload.delete({
        collection: row.collection as 'transactions',
        id: row.id,
        overrideAccess: true,
      })
    } catch {
      // ignore
    }
  }
})

describe('Phase 6 public search (int)', () => {
  it('finds published eligible transaction and hides draft/inactive/archived/outdated', async () => {
    const result = await runPublicSearch(parseSearchParams({ q: 'إخراج قيد' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const slugs = result.results.map((r) => r.slug)
    expect(slugs.some((s) => s.includes('qa-p6-exact-title'))).toBe(true)
    expect(slugs.some((s) => s.includes('qa-p6-draft'))).toBe(false)
    expect(slugs.some((s) => s.includes('qa-p6-inactive'))).toBe(false)
    expect(slugs.some((s) => s.includes('qa-p6-archived'))).toBe(false)
    expect(slugs.some((s) => s.includes('qa-p6-outdated'))).toBe(false)

    for (const card of result.results) {
      const raw = card as unknown as Record<string, unknown>
      expect(raw).not.toHaveProperty('internalNotes')
      expect(raw).not.toHaveProperty('searchText')
      expect(raw).not.toHaveProperty('approvedContentHash')
      expect(raw).not.toHaveProperty('workflowState')
    }
  })

  it('matches alias لا حكم عليه', async () => {
    const result = await runPublicSearch(parseSearchParams({ q: `لا حكم عليه ${stamp}` }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.results.some((r) => r.slug.includes('qa-p6-alias-target'))).toBe(true)
  })

  it('matches Arabic normalized Alef variants', async () => {
    const result = await runPublicSearch(
      parseSearchParams({ q: `اخراج قيد نفوس تجريبي ${stamp}` }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.results[0]?.slug).toContain(`qa-p6-exact-title-${stamp}`)
  })

  it('exact title outranks weaker matches', async () => {
    const result = await runPublicSearch(
      parseSearchParams({ q: `إخراج قيد نفوس تجريبي ${stamp}` }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.results[0]?.slug).toContain(`qa-p6-exact-title-${stamp}`)
    expect(result.results[0]?.title).toContain('إخراج قيد')
  })

  it('filters by category, agency, and service center', async () => {
    const cat = await runPublicSearch(
      parseSearchParams({ q: 'تجريبي', category: `qa-p6-cat-${stamp}` }),
    )
    expect(cat.ok).toBe(true)
    if (!cat.ok) return
    expect(cat.total).toBeGreaterThan(0)
    expect(cat.filters.category).toBe(`qa-p6-cat-${stamp}`)

    const agency = await runPublicSearch(
      parseSearchParams({ q: 'تجريبي', agency: `qa-p6-agency-${stamp}` }),
    )
    expect(agency.ok).toBe(true)
    if (!agency.ok) return
    expect(agency.filters.agency).toBe(`qa-p6-agency-${stamp}`)

    const center = await runPublicSearch(
      parseSearchParams({ q: 'تجريبي', center: `qa-p6-center-${stamp}` }),
    )
    expect(center.ok).toBe(true)
    if (!center.ok) return
    expect(center.filters.center).toBe(`qa-p6-center-${stamp}`)
  })

  it('pagination is stable', async () => {
    const page1 = await runPublicSearch(
      parseSearchParams({ q: 'معاملة ترقيم تجريبية', page: '1' }),
    )
    const page2 = await runPublicSearch(
      parseSearchParams({ q: 'معاملة ترقيم تجريبية', page: '2' }),
    )
    expect(page1.ok && page2.ok).toBe(true)
    if (!page1.ok || !page2.ok) return
    expect(page1.total).toBeGreaterThanOrEqual(12)
    expect(page1.results.length).toBe(10)
    expect(page2.results.length).toBeGreaterThan(0)
    const ids1 = new Set(page1.results.map((r) => String(r.id)))
    for (const r of page2.results) {
      expect(ids1.has(String(r.id))).toBe(false)
    }
    expect(page1.pagination.nextHref).toContain('page=2')
  })

  it('does not leak raw inaccessible relationship ids on cards', async () => {
    const result = await runPublicSearch(parseSearchParams({ q: 'سجل عدلي تجريبي' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const card of result.results) {
      expect(typeof card.categoryName === 'string' || card.categoryName === null).toBe(true)
      expect(card).not.toHaveProperty('category')
      expect(card).not.toHaveProperty('agency')
      expect(card).not.toHaveProperty('serviceCenters')
    }
  })
})

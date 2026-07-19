/**
 * Phase 6 — fixture idempotency + unique search IDs / pagination.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { cleanupPhase6QaFixture, countPhase6QaPublishedEligible } from '@/lib/search/qa-fixture-cleanup'
import { PHASE6_QA_STABLE } from '@/lib/search/qa-fixture-markers'
import { parseSearchParams } from '@/lib/search/params'
import { formatSearchResultCount } from '@/lib/search/result-count'
import { runPublicSearch } from '@/lib/search/run-search'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

function nextStamp(): string {
  return `uniq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function seedMinimalSupport(stamp = nextStamp()) {
  const category = await track(
    'categories',
    await payload.create({
      collection: 'categories',
      locale: 'ar',
      draft: false,
      data: {
        name: 'تصنيف فريد تجريبي',
        slug: `qa-p6-uniq-cat-${stamp}`,
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
        name: 'جهة فريدة تجريبية',
        slug: `qa-p6-uniq-agency-${stamp}`,
        type: 'other',
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
        title: 'مصدر فريد تجريبي',
        slug: `qa-p6-uniq-src-${stamp}`,
        sourceType: 'official_webpage',
        officialUrl: 'https://example.test/qa-p6-uniq',
        verificationStatus: 'verified',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )
  return { category, agency, source, stamp }
}

async function createPublishedTx(
  base: Record<string, unknown>,
  title: string,
  slug: string,
) {
  return track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...base,
        title,
        slug,
        summary: `ملخص ${title}`,
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

async function seedStablePublishedSet() {
  const cat = await track(
    'categories',
    await payload.create({
      collection: 'categories',
      locale: 'ar',
      draft: false,
      data: {
        name: 'أحوال مدنية تجريبي',
        slug: PHASE6_QA_STABLE.categorySlug,
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )
  const ag = await track(
    'agencies',
    await payload.create({
      collection: 'agencies',
      locale: 'ar',
      draft: false,
      data: {
        name: 'السجل المدني تجريبي',
        slug: PHASE6_QA_STABLE.agencySlug,
        type: 'other',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )
  const src = await track(
    'sources',
    await payload.create({
      collection: 'sources',
      locale: 'ar',
      draft: false,
      data: {
        title: 'مصدر',
        slug: PHASE6_QA_STABLE.sourceSlug,
        sourceType: 'official_webpage',
        officialUrl: 'https://example.test/qa-p6-r1',
        verificationStatus: 'verified',
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
        name: 'مركز',
        slug: PHASE6_QA_STABLE.centerSlug,
        agency: ag.id,
        governorate: 'damascus',
        city: 'دمشق',
        address: 'عنوان',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const txBase = {
    category: cat.id,
    agency: ag.id,
    serviceCenters: [center.id],
    steps: [{ title: 'خطوة', description: 'وصف' }],
    sources: [
      {
        source: src.id,
        primary: true,
        coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
      },
    ],
    lastReviewedAt: new Date().toISOString(),
    active: true,
    workflowState: 'published' as const,
    markedOutdated: false,
    _status: 'published' as const,
  }

  const named = [
    PHASE6_QA_STABLE.transactions.civilExtract,
    PHASE6_QA_STABLE.transactions.criminalRecord,
    PHASE6_QA_STABLE.transactions.passportRenew,
  ]
  for (const slug of named) {
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          ...txBase,
          title: `عنوان ${slug}`,
          slug,
          summary: 'ملخص',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }
  for (let i = 0; i < 11; i++) {
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          ...txBase,
          title: `معاملة ترقيم بحث تجريبية ${String(i).padStart(2, '0')}`,
          slug: PHASE6_QA_STABLE.pageSlug(i),
          summary: `ملخص ${i}`,
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
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
  try {
    await cleanupPhase6QaFixture(payload)
  } catch {
    // ignore
  }
})

describe('Phase 6 search uniqueness + fixture cleanup (int)', () => {
  it(
    'cleanup + stable reseed produces the same published eligible count twice',
    async () => {
      const { category, agency, source } = await seedMinimalSupport()
      const base = {
        category: category.id,
        agency: agency.id,
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

      const staleStamp = nextStamp()
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          ...base,
          title: 'معاملة ترقيم بحث تجريبية 00',
          slug: `qa-p6-r1-page-00-stale-${staleStamp}`,
          summary: 'stale',
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      })
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: 'ستيل',
          slug: `qa-p6-r1-cat-stale-${staleStamp}`,
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      })

      const firstClean = await cleanupPhase6QaFixture(payload)
      expect(firstClean.deleted).toBeGreaterThan(0)

      await seedStablePublishedSet()
      const countA = await countPhase6QaPublishedEligible(payload)
      expect(countA).toBe(PHASE6_QA_STABLE.publishedEligibleCount)

      await cleanupPhase6QaFixture(payload)
      await seedStablePublishedSet()

      const countB = await countPhase6QaPublishedEligible(payload)
      expect(countB).toBe(countA)
      expect(countB).toBe(PHASE6_QA_STABLE.publishedEligibleCount)

      const search = await runPublicSearch(
        parseSearchParams({ q: 'معاملة ترقيم بحث تجريبية' }),
      )
      expect(search.ok).toBe(true)
      if (!search.ok) return
      expect(search.total).toBe(11)
      expect(formatSearchResultCount(search.total)).toBe('11 نتيجة')
      const ids = search.results.map((r) => String(r.id))
      expect(new Set(ids).size).toBe(ids.length)

      await cleanupPhase6QaFixture(payload)
    },
    120_000,
  )

  it('search results have unique document IDs and non-overlapping pages', async () => {
    const { category, agency, source, stamp } = await seedMinimalSupport()
    const base = {
      category: category.id,
      agency: agency.id,
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

    for (let i = 0; i < 12; i++) {
      await createPublishedTx(
        base,
        `فريد ترقيم تجريبي ${String(i).padStart(2, '0')} ${stamp}`,
        `qa-p6-uniq-page-${i}-${stamp}`,
      )
    }

    const q = `فريد ترقيم تجريبي ${stamp}`
    const page1 = await runPublicSearch(parseSearchParams({ q, page: '1' }))
    const page2 = await runPublicSearch(parseSearchParams({ q, page: '2' }))
    expect(page1.ok && page2.ok).toBe(true)
    if (!page1.ok || !page2.ok) return

    const ids1 = page1.results.map((r) => String(r.id))
    const ids2 = page2.results.map((r) => String(r.id))
    expect(new Set(ids1).size).toBe(ids1.length)
    expect(new Set(ids2).size).toBe(ids2.length)
    for (const id of ids2) expect(ids1.includes(id)).toBe(false)
    expect(page1.total).toBe(page2.total)
    expect(page1.total).toBeGreaterThanOrEqual(12)
  }, 60_000)

  it('two different transactions with the same title both appear', async () => {
    const { category, agency, source, stamp } = await seedMinimalSupport()
    const base = {
      category: category.id,
      agency: agency.id,
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
    const sharedTitle = `عنوان مكرر فريد تجريبي ${stamp}`
    const a = await createPublishedTx(base, sharedTitle, `qa-p6-uniq-same-a-${stamp}`)
    const b = await createPublishedTx(base, sharedTitle, `qa-p6-uniq-same-b-${stamp}`)

    const result = await runPublicSearch(parseSearchParams({ q: sharedTitle }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const ids = result.results.map((r) => String(r.id))
    expect(ids).toContain(String(a.id))
    expect(ids).toContain(String(b.id))
    expect(result.total).toBeGreaterThanOrEqual(2)
  }, 60_000)
})

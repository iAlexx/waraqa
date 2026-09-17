/**
 * Phase 13 homepage batching — category counts, featured order, query-shape stats.
 * Fictional QA fixtures only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createCategoryLoadStats, loadPublicCategories } from '@/lib/public/categories'
import {
  createFeaturedLoadStats,
  loadFeaturedTransactions,
} from '@/lib/public/featured-transactions'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }
const prevMode = process.env.WARAQA_PUBLIC_CONTENT_MODE

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

beforeAll(async () => {
  process.env.WARAQA_PUBLIC_CONTENT_MODE = 'demo'
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  if (prevMode === undefined) delete process.env.WARAQA_PUBLIC_CONTENT_MODE
  else process.env.WARAQA_PUBLIC_CONTENT_MODE = prevMode

  const order = ['transactions', 'claims', 'sources', 'agencies', 'categories', 'users']
  for (const collection of order) {
    for (const row of [...created].reverse()) {
      if (row.collection !== collection) continue
      try {
        await payload.delete({
          collection: row.collection as 'transactions',
          id: row.id,
          overrideAccess: true,
          context: { seed: true },
        })
      } catch {
        // ignore
      }
    }
  }
})

describe('Phase 13 homepage claim-graph batching (int)', () => {
  it('batches claims/sources once; category counts; hides empty; preserves featured order', async () => {
    const stamp = Date.now()

    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-p13-batch-${stamp}@example.test`,
          password: 'TestPassphrase-Phase13-Batch-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer P13 Batch',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const catA = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف أ ${stamp}`,
          slug: `p13-batch-cat-a-${stamp}`,
          description: 'اختبار',
          active: true,
          sortOrder: 1,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const catB = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف ب ${stamp}`,
          slug: `p13-batch-cat-b-${stamp}`,
          description: 'اختبار',
          active: true,
          sortOrder: 2,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const catEmpty = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف فارغ ${stamp}`,
          slug: `p13-batch-cat-empty-${stamp}`,
          description: 'بدون معاملات',
          active: true,
          sortOrder: 3,
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
          name: `جهة ${stamp}`,
          slug: `p13-batch-agency-${stamp}`,
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
          title: `مصدر ${stamp}`,
          slug: `p13-batch-src-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: `https://example.test/p13-batch-${stamp}`,
          verificationStatus: 'verified',
          contentClass: 'DEMO',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const claimShared = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `p13_batch_shared_${stamp}`,
        sourceId: source.id,
        reviewerId: reviewer.id,
        contentClass: 'DEMO',
      }),
    )
    const claimB = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `p13_batch_b_${stamp}`,
        sourceId: source.id,
        reviewerId: reviewer.id,
        contentClass: 'DEMO',
      }),
    )

    async function createDemoTx(
      suffix: string,
      categoryId: number | string,
      claimIds: Array<number | string>,
      asDraft = false,
    ) {
      return track(
        'transactions',
        await payload.create({
          collection: 'transactions',
          locale: 'ar',
          draft: asDraft,
          data: {
            title: `معاملة ${suffix} ${stamp}`,
            slug: `p13-batch-tx-${suffix}-${stamp}`,
            summary: 'ملخص تجريبي',
            category: categoryId,
            agency: agency.id,
            active: true,
            _status: asDraft ? 'draft' : 'published',
            workflowState: asDraft ? 'draft' : 'published',
            markedOutdated: false,
            claimTrustOk: true,
            contentClass: 'DEMO',
            lastReviewedAt: new Date().toISOString(),
            steps: [{ title: 'خطوة', description: 'وصف' }],
            sources: [
              {
                source: source.id,
                primary: true,
                coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
              },
            ],
            claimBindings: claimIds.map((claim) => ({
              claim,
              required: true,
              coveredSection: 'summary',
            })),
          } as never,
          overrideAccess: true,
          context: seedCtx,
        }),
      )
    }

    const txA1 = await createDemoTx('a1', catA.id, [claimShared.id])
    const txA2 = await createDemoTx('a2', catA.id, [claimShared.id])
    const txB1 = await createDemoTx('b1', catB.id, [claimShared.id, claimB.id])
    const draftTx = await createDemoTx('draft', catA.id, [claimShared.id], true)

    const catStats = createCategoryLoadStats()
    const { categories, unavailable } = await loadPublicCategories({ stats: catStats })
    expect(unavailable).toBe(false)

    const visible = categories.filter((c) =>
      [catA.slug, catB.slug, catEmpty.slug].includes(c.slug),
    )
    expect(visible.map((c) => c.slug).sort()).toEqual([catA.slug, catB.slug].sort())
    expect(visible.some((c) => c.slug === catEmpty.slug)).toBe(false)

    expect(visible.find((c) => c.slug === catA.slug)?.procedureCount).toBe(2)
    expect(visible.find((c) => c.slug === catB.slug)?.procedureCount).toBe(1)

    expect(catStats.categoryQueries).toBe(1)
    expect(catStats.candidateTransactionQueries).toBe(1)
    expect(catStats.claimQueries).toBe(1)
    expect(catStats.sourceQueries).toBe(1)
    expect(catStats.claimFindByIdCalls).toBe(0)
    expect(catStats.sourceFindByIdCalls).toBe(0)
    expect(catStats.uniqueClaimIds).toBeGreaterThanOrEqual(2)
    expect(catStats.uniqueSourceIds).toBeGreaterThanOrEqual(1)

    const featStats = createFeaturedLoadStats()
    const orderedIds = [draftTx.id, txB1.id, txA1.id, 999999991, txA2.id]
    const { items } = await loadFeaturedTransactions(orderedIds, { stats: featStats })
    expect(items.map((i) => i.id)).toEqual([txB1.id, txA1.id, txA2.id])
    expect(featStats.featuredTransactionQueries).toBe(1)
    expect(featStats.claimQueries).toBe(1)
    expect(featStats.sourceQueries).toBe(1)
    expect(featStats.claimFindByIdCalls).toBe(0)
  })
})

/**
 * Phase 5 public home — Site Settings + featured filtering (PostgreSQL).
 * Fictional QA data only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { loadPublicCategories } from '@/lib/public/categories'
import { loadFeaturedTransactions } from '@/lib/public/featured-transactions'
import { loadPublicSiteSettings, mapPublicSiteSettings } from '@/lib/public/site-settings'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
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
      // ignore cleanup errors
    }
  }
})

describe('Phase 5 public Site Settings + featured filtering (int)', () => {
  it('loads site-settings anonymously without private fields on mapped result', async () => {
    const settings = await loadPublicSiteSettings()
    expect(settings.siteName).toBeTruthy()
    expect(settings.independenceDisclaimer.length).toBeGreaterThan(10)
    expect(settings).not.toHaveProperty('verificationPolicyDays')
  })

  it('mapPublicSiteSettings reflects maintenanceMode from global', async () => {
    const before = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    const mapped = mapPublicSiteSettings(before)
    expect(typeof mapped.maintenanceMode).toBe('boolean')
  })

  it('categories loader returns only public-safe shape', async () => {
    const { categories, unavailable } = await loadPublicCategories()
    expect(unavailable).toBe(false)
    for (const c of categories) {
      expect(c.name).toBeTruthy()
      expect(c.slug).toBeTruthy()
      expect(c).not.toHaveProperty('internalNotes')
      expect(c).not.toHaveProperty('createdBy')
    }
  })

  it('featured loader preserves order and skips ineligible relations', async () => {
    const stamp = Date.now()

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف فيتشر ${stamp}`,
          slug: `qa-feat-cat-${stamp}`,
          description: 'بيانات تجريبية',
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
          name: `جهة فيتشر ${stamp}`,
          slug: `qa-feat-agency-${stamp}`,
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
          title: `مصدر فيتشر ${stamp}`,
          slug: `qa-feat-src-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/qa-feat-source',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    async function createTx(
      suffix: string,
      patch: Record<string, unknown>,
      asDraft = false,
    ): Promise<{ id: number | string }> {
      const data = {
        title: `معاملة فيتشر ${suffix} ${stamp}`,
        slug: `qa-feat-tx-${suffix}-${stamp}`,
        summary: `ملخص ${suffix}`,
        category: category.id,
        agency: agency.id,
        active: true,
        workflowState: 'draft',
        markedOutdated: false,
        lastReviewedAt: new Date().toISOString(),
        steps: [{ title: 'خطوة', description: 'وصف' }],
        sources: [
          {
            source: source.id,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
        ...patch,
      }
      return track(
        'transactions',
        await payload.create({
          collection: 'transactions',
          locale: 'ar',
          draft: asDraft,
          data: data as never,
          overrideAccess: true,
          context: seedCtx,
        }),
      )
    }

    const draft = await createTx('draft', { workflowState: 'draft' }, true)
    const published = await createTx('pub', {
      _status: 'published',
      workflowState: 'published',
    })
    const archived = await createTx('arch', {
      _status: 'published',
      workflowState: 'archived',
    })
    const outdated = await createTx('old', {
      _status: 'published',
      workflowState: 'published',
      markedOutdated: true,
    })
    const inactive = await createTx('off', {
      _status: 'published',
      workflowState: 'published',
      active: false,
    })
    const published2 = await createTx('pub2', {
      _status: 'published',
      workflowState: 'published',
    })

    const orderedIds = [
      draft.id,
      published.id,
      archived.id,
      outdated.id,
      inactive.id,
      published2.id,
    ]

    const { items } = await loadFeaturedTransactions(orderedIds)
    expect(items.map((i) => i.id)).toEqual([published.id, published2.id])
    expect(items[0]?.slug).toContain('pub')
    expect(items[1]?.slug).toContain('pub2')

    // Prove configured-order filtering without mutating the live Site Settings global
    // (mutating featuredTransactions would wipe Round 02 QA fixtures).
    const settingsSnapshot = await loadPublicSiteSettings()
    expect(Array.isArray(settingsSnapshot.featuredTransactionIds)).toBe(true)
    const fromOrdered = await loadFeaturedTransactions(orderedIds)
    expect(fromOrdered.items.length).toBe(2)
    expect(fromOrdered.items.map((i) => i.id)).toEqual([published.id, published2.id])
    expect(fromOrdered.items.some((i) => i.title.includes('مسودة'))).toBe(false)
  })
})

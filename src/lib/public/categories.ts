import { getPayload } from 'payload'

import config from '@payload-config'
import { getPublicTransactionWhere } from '@/access'
import {
  createLivePublicTrustBatchStats,
  liveEvaluatePublicTransactionsClaimTrust,
  type LivePublicTrustBatchStats,
} from '@/lib/claims/public-claim-trust'
import { relationId } from '@/lib/claims/claim-graph-batch'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'

export type PublicCategoryCard = {
  id: number | string
  name: string
  slug: string
  description: string
  procedureCount: number | null
  /** Categories have no contentClass — always false (P0-06). */
  demoLabeled: boolean
}

export type LoadPublicCategoriesOptions = {
  /** Optional query-shape instrumentation (tests / ops evidence). */
  stats?: LivePublicTrustBatchStats & {
    categoryQueries?: number
    candidateTransactionQueries?: number
  }
}

/**
 * Public categories: published + active only (collection access + explicit filter).
 *
 * Procedure counts: one publicly prefiltered candidate transaction query across
 * all category IDs, then one batched live Claim/Source trust evaluation, then
 * in-memory group/count (no per-category transaction scan).
 */
export async function loadPublicCategories(
  opts?: LoadPublicCategoriesOptions,
): Promise<{
  categories: PublicCategoryCard[]
  unavailable: boolean
}> {
  try {
    const payload = await getPayload({ config })
    if (opts?.stats) opts.stats.categoryQueries = (opts.stats.categoryQueries ?? 0) + 1

    const result = await payload.find({
      collection: 'categories',
      locale: 'ar',
      depth: 0,
      limit: 48,
      sort: 'sortOrder',
      overrideAccess: false,
      where: {
        and: [{ _status: { equals: 'published' } }, { active: { equals: true } }],
      },
    })

    const categoryDocs = result.docs.filter((doc) => {
      const name = localizedString(doc.name as LocalizedLike)
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      return Boolean(name && slug)
    })

    if (categoryDocs.length === 0) {
      return { categories: [], unavailable: false }
    }

    const categoryIds = categoryDocs.map((d) => d.id)
    let countsByCategory = new Map<string, number>()
    let countsUnavailable = false

    try {
      if (opts?.stats) {
        opts.stats.candidateTransactionQueries =
          (opts.stats.candidateTransactionQueries ?? 0) + 1
      }

      const candidates = await payload.find({
        collection: 'transactions',
        depth: 0,
        limit: 2000,
        pagination: false,
        overrideAccess: false,
        where: {
          and: [{ category: { in: categoryIds } }, getPublicTransactionWhere()],
        },
      })

      const docs = candidates.docs as unknown as Array<Record<string, unknown>>
      const trustFlags = await liveEvaluatePublicTransactionsClaimTrust(
        payload,
        docs,
        undefined,
        opts?.stats,
      )

      countsByCategory = new Map()
      for (let i = 0; i < docs.length; i++) {
        if (!trustFlags[i]) continue
        const catId = relationId(docs[i]?.category)
        if (!catId) continue
        countsByCategory.set(catId, (countsByCategory.get(catId) ?? 0) + 1)
      }
    } catch {
      countsUnavailable = true
    }

    const categories: PublicCategoryCard[] = []
    for (const doc of categoryDocs) {
      const name = localizedString(doc.name as LocalizedLike)
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      const procedureCount = countsUnavailable
        ? null
        : (countsByCategory.get(String(doc.id)) ?? 0)

      // Hide taxonomy that has no publicly-eligible transactions under the
      // active content mode (prevents empty DEMO-only category leakage in production).
      if (procedureCount === 0) continue

      categories.push({
        id: doc.id,
        name,
        slug,
        description: localizedString(doc.description as LocalizedLike),
        procedureCount,
        demoLabeled: false,
      })
    }

    return { categories, unavailable: false }
  } catch {
    return { categories: [], unavailable: true }
  }
}

/** Convenience for tests that only need trust-batch stats. */
export function createCategoryLoadStats(): NonNullable<LoadPublicCategoriesOptions['stats']> {
  return {
    ...createLivePublicTrustBatchStats(),
    categoryQueries: 0,
    candidateTransactionQueries: 0,
  }
}

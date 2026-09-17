import { getPayload } from 'payload'

import config from '@payload-config'
import {
  createLivePublicTrustBatchStats,
  liveEvaluatePublicTransactionsClaimTrust,
  type LivePublicTrustBatchStats,
} from '@/lib/claims/public-claim-trust'
import { isContentClassPubliclyAllowed } from '@/lib/content-class/public-content-policy'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'

export type PublicFeaturedCard = {
  id: number | string
  title: string
  summary: string
  slug: string
  categoryName: string | null
  lastReviewedAt: string | null
  demoLabeled: boolean
}

export type LoadFeaturedTransactionsOptions = {
  stats?: LivePublicTrustBatchStats & {
    featuredTransactionQueries?: number
  }
}

/**
 * Sync public prefilter (status + stored claimTrustOk cache + contentClass).
 * Not the final trust authority — public loaders also run
 * live Claim/Source trust before exposure.
 */
export function isPubliclyEligibleTransaction(doc: Record<string, unknown>): boolean {
  if (doc._status !== 'published') return false
  if (doc.active !== true) return false
  if (doc.markedOutdated === true) return false
  if (doc.workflowState === 'archived') return false
  if (doc.claimTrustOk !== true) return false
  if (!isContentClassPubliclyAllowed(doc.contentClass)) return false
  return true
}

/**
 * Featured transactions from Site Settings order.
 * Fetches requested IDs in one batched query (public access), preserves order,
 * then runs one batched live trust evaluation. Cap remains six public items.
 */
export async function loadFeaturedTransactions(
  orderedIds: Array<number | string>,
  opts?: LoadFeaturedTransactionsOptions,
): Promise<{ items: PublicFeaturedCard[]; unavailable: boolean }> {
  if (!orderedIds.length) return { items: [], unavailable: false }

  try {
    const payload = await getPayload({ config })
    if (opts?.stats) {
      opts.stats.featuredTransactionQueries =
        (opts.stats.featuredTransactionQueries ?? 0) + 1
    }

    const found = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 1,
      limit: orderedIds.length,
      pagination: false,
      overrideAccess: false,
      where: {
        id: { in: orderedIds },
      },
    })

    const byId = new Map<string, Record<string, unknown>>()
    for (const doc of found.docs) {
      byId.set(String(doc.id), doc as unknown as Record<string, unknown>)
    }

    // Preserve Site Settings order; skip missing/inaccessible before trust.
    const orderedDocs: Array<Record<string, unknown>> = []
    for (const id of orderedIds) {
      const doc = byId.get(String(id))
      if (!doc) continue
      if (!isPubliclyEligibleTransaction(doc)) continue
      orderedDocs.push(doc)
    }

    const trustFlags = await liveEvaluatePublicTransactionsClaimTrust(
      payload,
      orderedDocs,
      undefined,
      opts?.stats,
    )

    const items: PublicFeaturedCard[] = []
    for (let i = 0; i < orderedDocs.length; i++) {
      if (items.length >= 6) break
      if (!trustFlags[i]) continue

      const doc = orderedDocs[i]
      const title = localizedString(doc.title as LocalizedLike)
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      if (!title || !slug) continue

      let categoryName: string | null = null
      const cat = doc.category
      if (cat && typeof cat === 'object' && cat !== null) {
        categoryName = localizedString((cat as { name?: LocalizedLike }).name) || null
      }

      items.push({
        id: doc.id as number | string,
        title,
        summary: localizedString(doc.summary as LocalizedLike),
        slug,
        categoryName,
        lastReviewedAt: typeof doc.lastReviewedAt === 'string' ? doc.lastReviewedAt : null,
        demoLabeled: doc.contentClass === 'DEMO',
      })
    }

    return { items, unavailable: false }
  } catch {
    return { items: [], unavailable: true }
  }
}

export function createFeaturedLoadStats(): NonNullable<LoadFeaturedTransactionsOptions['stats']> {
  return {
    ...createLivePublicTrustBatchStats(),
    featuredTransactionQueries: 0,
  }
}

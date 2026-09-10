import { getPayload } from 'payload'

import config from '@payload-config'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
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

/**
 * Sync public prefilter (status + stored claimTrustOk cache).
 * Not the final trust authority — public loaders also run
 * `liveEvaluatePublicTransactionClaimTrust` before exposure.
 */
export function isPubliclyEligibleTransaction(doc: Record<string, unknown>): boolean {
  if (doc._status !== 'published') return false
  if (doc.active !== true) return false
  if (doc.markedOutdated === true) return false
  if (doc.workflowState === 'archived') return false
  if (doc.claimTrustOk !== true) return false
  return true
}

function isDemoLabel(text: string): boolean {
  return /تجريب|demo|test|qa-|r2|r3|r4|fixture/i.test(text)
}

/**
 * Featured transactions from Site Settings order.
 * Re-fetches each id with public access — never trusts raw relationship population alone.
 */
export async function loadFeaturedTransactions(
  orderedIds: Array<number | string>,
): Promise<{ items: PublicFeaturedCard[]; unavailable: boolean }> {
  if (!orderedIds.length) return { items: [], unavailable: false }

  try {
    const payload = await getPayload({ config })
    const items: PublicFeaturedCard[] = []

    for (const id of orderedIds) {
      if (items.length >= 6) break
      try {
        const doc = (await payload.findByID({
          collection: 'transactions',
          id,
          locale: 'ar',
          depth: 1,
          overrideAccess: false,
        })) as unknown as Record<string, unknown>

        if (!isPubliclyEligibleTransaction(doc)) continue
        if (!(await liveEvaluatePublicTransactionClaimTrust(payload, doc))) continue

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
          demoLabeled: isDemoLabel(title) || isDemoLabel(slug),
        })
      } catch {
        // Missing / inaccessible / draft — skip silently
      }
    }

    // Prefer 4–6 when available; fewer is OK
    return { items, unavailable: false }
  } catch {
    return { items: [], unavailable: true }
  }
}

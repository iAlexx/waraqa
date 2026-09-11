import { cache } from 'react'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getPublicTransactionWhere } from '@/access'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
import { isPubliclyEligibleTransaction } from '@/lib/public/featured-transactions'
import { mapPublicGuide, type PublicGuideDTO } from '@/lib/guide/public-guide-map'
import { isPublicGuideAvailable } from '@/lib/guide/validate-guide'

export type LoadPublicGuideResult =
  | { ok: true; guide: PublicGuideDTO }
  | { ok: false; reason: 'not_found' | 'no_guide' }

export const loadPublicGuideBySlug = cache(
  async (slug: string): Promise<LoadPublicGuideResult> => {
    const normalized = typeof slug === 'string' ? slug.trim() : ''
    if (!normalized || normalized.length > 160) {
      return { ok: false, reason: 'not_found' }
    }

    try {
      const payload = await getPayload({ config })
      const found = await payload.find({
        collection: 'transactions',
        locale: 'ar',
        depth: 2,
        limit: 1,
        overrideAccess: false,
        where: {
          and: [{ slug: { equals: normalized } }, getPublicTransactionWhere()],
        },
      })

      const doc = found.docs[0] as unknown as Record<string, unknown> | undefined
      if (!doc || !isPubliclyEligibleTransaction(doc)) {
        return { ok: false, reason: 'not_found' }
      }
      if (!(await liveEvaluatePublicTransactionClaimTrust(payload, doc))) {
        return { ok: false, reason: 'not_found' }
      }

      const guide = mapPublicGuide(doc)
      if (!guide) return { ok: false, reason: 'no_guide' }
      return { ok: true, guide }
    } catch {
      return { ok: false, reason: 'not_found' }
    }
  },
)

/** Lightweight CTA check for Phase 7 detail (same eligibility + guide gate). */
export const transactionHasPublicGuide = cache(async (slug: string): Promise<boolean> => {
  const result = await loadPublicGuideBySlug(slug)
  return result.ok
})

export function docHasPublicGuideFlag(doc: Record<string, unknown>): boolean {
  return isPublicGuideAvailable(doc)
}

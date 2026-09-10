import { cache } from 'react'
import { getPayload } from 'payload'

import config from '@payload-config'
import { publicTransactionWhere } from '@/access'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
import {
  mapPublicTransactionDetail,
  type PublicTransactionDetail,
} from '@/lib/public/transaction-detail-map'

export type LoadPublicTransactionResult =
  | { ok: true; transaction: PublicTransactionDetail }
  | { ok: false; reason: 'not_found' | 'unavailable' }

/**
 * Public transaction detail loader.
 * Always `overrideAccess: false` + Phase 4 public Where.
 * Final trust: live Claim/Source evaluation (`claimTrustOk` is prefilter only).
 */
export const loadPublicTransactionBySlug = cache(
  async (slug: string): Promise<LoadPublicTransactionResult> => {
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
          and: [{ slug: { equals: normalized } }, publicTransactionWhere],
        },
      })

      const doc = found.docs[0] as unknown as Record<string, unknown> | undefined
      if (!doc) return { ok: false, reason: 'not_found' }

      if (!(await liveEvaluatePublicTransactionClaimTrust(payload, doc))) {
        return { ok: false, reason: 'not_found' }
      }

      const mapped = mapPublicTransactionDetail(doc)
      if (!mapped) return { ok: false, reason: 'not_found' }

      return { ok: true, transaction: mapped }
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
  },
)

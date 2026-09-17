/**
 * Public sitemap eligibility helpers (Phase 14-A).
 *
 * Eligibility must match citizen loaders:
 * - getPublicTransactionWhere() prefilter
 * - live claim/source trust (`liveEvaluatePublicTransactionsClaimTrust`)
 * - guide URL only when `isPublicGuideAvailable` / mapPublicGuide would succeed
 *
 * When indexing is disabled, return an empty URL list (robots already disallow).
 * Pages through the collection — never silently truncate past a single page.
 */
import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import { getPublicTransactionWhere } from '@/access'
import { liveEvaluatePublicTransactionsClaimTrust } from '@/lib/claims/public-claim-trust'
import { isPublicGuideAvailable } from '@/lib/guide/validate-guide'
import { shouldAllowPublicIndexing } from '@/lib/seo/indexing-policy'

export type SitemapUrlEntry = {
  path: string
  lastModified?: Date
}

/** Page size for sitemap collection walks (bounded; no silent single-page truncation). */
export const SITEMAP_PAGE_SIZE = 100

/** Soft ceiling to avoid unbounded crawls on pathological catalogs. */
export const SITEMAP_MAX_PAGES = 50

const STATIC_PUBLIC_PATHS = [
  '/',
  '/search',
  '/categories',
  '/about',
  '/methodology',
  '/privacy',
  '/terms',
  '/contact',
] as const

export function staticPublicSitemapPaths(): readonly string[] {
  return STATIC_PUBLIC_PATHS
}

/** True when the public guide route would be available for this transaction doc. */
export function isSitemapGuideEligible(doc: Record<string, unknown>): boolean {
  return isPublicGuideAvailable(doc)
}

/**
 * Pure builder: map trusted docs to sitemap paths (detail always; guide when available).
 * `trustedFlags[i]` must already reflect live claim/source trust for `docs[i]`.
 */
export function buildSitemapEntriesFromTrustedDocs(
  docs: Array<Record<string, unknown>>,
  trustedFlags: boolean[],
): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = []
  const n = Math.min(docs.length, trustedFlags.length)
  for (let i = 0; i < n; i++) {
    if (!trustedFlags[i]) continue
    const doc = docs[i]
    const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''
    if (!slug) continue
    const updatedAt =
      'updatedAt' in doc && doc.updatedAt ? new Date(String(doc.updatedAt)) : undefined
    entries.push({ path: `/transactions/${slug}`, lastModified: updatedAt })
    if (isSitemapGuideEligible(doc)) {
      entries.push({ path: `/transactions/${slug}/guide`, lastModified: updatedAt })
    }
  }
  return entries
}

async function collectTrustedTransactionEntries(payload: Payload): Promise<SitemapUrlEntry[]> {
  const entries: SitemapUrlEntry[] = []
  let page = 1
  let hasNext = true

  while (hasNext && page <= SITEMAP_MAX_PAGES) {
    const found = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 2,
      limit: SITEMAP_PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: false,
      where: getPublicTransactionWhere(),
    })

    const docs = found.docs as unknown as Array<Record<string, unknown>>
    if (docs.length === 0) break

    const trustedFlags = await liveEvaluatePublicTransactionsClaimTrust(payload, docs)
    entries.push(...buildSitemapEntriesFromTrustedDocs(docs, trustedFlags))

    hasNext = Boolean(found.hasNextPage)
    page += 1
  }

  return entries
}

/**
 * Build sitemap URL paths for the active public content mode.
 * Never includes admin, preview, API, draft, QA_TEST, or trust-blocked procedures.
 */
export async function listPublicSitemapEntries(): Promise<SitemapUrlEntry[]> {
  if (!shouldAllowPublicIndexing()) {
    return []
  }

  const entries: SitemapUrlEntry[] = STATIC_PUBLIC_PATHS.map((path) => ({ path }))

  try {
    const payload = await getPayload({ config })
    entries.push(...(await collectTrustedTransactionEntries(payload)))
  } catch {
    // Fail closed for procedures: static public shells only.
  }

  return entries
}

/**
 * Public sitemap eligibility helpers (Phase 14-A).
 *
 * Eligibility must match citizen loaders:
 * - getPublicTransactionWhere() prefilter
 * - live claim/source trust (`liveEvaluatePublicTransactionsClaimTrust`)
 * - guide URL only when `isPublicGuideAvailable` / mapPublicGuide would succeed
 *
 * When indexing is disabled, return an empty URL list (robots already disallow).
 * Pagination is bounded. Hitting the page ceiling with more rows remaining is an
 * explicit overflow failure — never silently emit a partial procedure catalog.
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

/** Page size for sitemap collection walks (bounded). */
export const SITEMAP_PAGE_SIZE = 100

/** Hard ceiling — overflow when hasNextPage remains true after this many pages. */
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
 * Thrown when the bounded page walk still has more public rows.
 * Contains no private slugs — only aggregate pagination diagnostics.
 */
export class SitemapPaginationCeilingError extends Error {
  readonly pagesFetched: number
  readonly pageSize: number
  readonly hasMore = true as const

  constructor(pagesFetched: number, pageSize: number) {
    super(
      `Sitemap pagination ceiling reached (${pagesFetched}×${pageSize}) with additional public pages remaining; refusing incomplete procedure sitemap.`,
    )
    this.name = 'SitemapPaginationCeilingError'
    this.pagesFetched = pagesFetched
    this.pageSize = pageSize
  }
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

export type SitemapPageResult = {
  docs: Array<Record<string, unknown>>
  hasNextPage: boolean
}

/**
 * Walk public transaction pages with live trust filtering.
 * Throws {@link SitemapPaginationCeilingError} if more pages remain after the ceiling
 * (fail closed — caller must not emit a partial procedure list as complete).
 */
export async function walkTrustedTransactionPages(opts: {
  pageSize: number
  maxPages: number
  fetchPage: (page: number) => Promise<SitemapPageResult>
  evaluateTrust: (docs: Array<Record<string, unknown>>) => Promise<boolean[]>
}): Promise<SitemapUrlEntry[]> {
  const entries: SitemapUrlEntry[] = []
  let page = 1
  let hasNext = true

  while (hasNext && page <= opts.maxPages) {
    const found = await opts.fetchPage(page)
    const docs = found.docs
    if (docs.length === 0) {
      hasNext = false
      break
    }

    const trustedFlags = await opts.evaluateTrust(docs)
    entries.push(...buildSitemapEntriesFromTrustedDocs(docs, trustedFlags))

    hasNext = Boolean(found.hasNextPage)
    if (hasNext && page >= opts.maxPages) {
      throw new SitemapPaginationCeilingError(page, opts.pageSize)
    }
    page += 1
  }

  return entries
}

async function collectTrustedTransactionEntries(payload: Payload): Promise<SitemapUrlEntry[]> {
  return walkTrustedTransactionPages({
    pageSize: SITEMAP_PAGE_SIZE,
    maxPages: SITEMAP_MAX_PAGES,
    fetchPage: async (page) => {
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
      return {
        docs: found.docs as unknown as Array<Record<string, unknown>>,
        hasNextPage: Boolean(found.hasNextPage),
      }
    },
    evaluateTrust: (docs) => liveEvaluatePublicTransactionsClaimTrust(payload, docs),
  })
}

/**
 * Build sitemap URL paths for the active public content mode.
 * Never includes admin, preview, API, draft, QA_TEST, or trust-blocked procedures.
 *
 * On pagination ceiling overflow: fail closed to an empty list (do not advertise a
 * truncated procedure catalog as complete). Static shells are also omitted so the
 * response is not a false “full” sitemap.
 */
export async function listPublicSitemapEntries(): Promise<SitemapUrlEntry[]> {
  if (!shouldAllowPublicIndexing()) {
    return []
  }

  try {
    const payload = await getPayload({ config })
    const procedureEntries = await collectTrustedTransactionEntries(payload)
    const staticEntries: SitemapUrlEntry[] = STATIC_PUBLIC_PATHS.map((path) => ({ path }))
    return [...staticEntries, ...procedureEntries]
  } catch (err) {
    if (err instanceof SitemapPaginationCeilingError) {
      // Explicit fail-closed: incomplete catalog must not be published as complete.
      console.error(
        JSON.stringify({
          event: 'sitemap_pagination_ceiling',
          pagesFetched: err.pagesFetched,
          pageSize: err.pageSize,
          hasMore: true,
          policy: 'fail_closed_empty_sitemap',
        }),
      )
      return []
    }
    // Other errors: fail closed for procedures — also empty (no false-complete static-only claim).
    return []
  }
}

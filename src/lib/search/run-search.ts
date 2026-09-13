import { getPayload, type Where } from 'payload'

import config from '@payload-config'
import { getPublicTransactionWhere, publishedActiveWhere } from '@/access'
import { filterDocsByLivePublicClaimTrust } from '@/lib/claims/public-claim-trust'
import {
  extractRankInput,
  mapPublicSearchResult,
  type PublicSearchResultCard,
} from '@/lib/search/map-result'
import {
  SEARCH_CANDIDATE_CAP,
  type ParsedSearchParams,
  buildSearchHref,
} from '@/lib/search/params'
import { compareRanked, scoreSearchMatch } from '@/lib/search/rank'
import { dedupeRankedByDocumentId } from '@/lib/search/dedupe'

export type PublicFilterOption = {
  slug: string
  label: string
}

export type SearchPageResult = {
  ok: true
  query: string
  queryNormalized: string
  emptyQuery: boolean
  results: PublicSearchResultCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  filters: {
    category: string | null
    agency: string | null
    center: string | null
  }
  filterOptions: {
    categories: PublicFilterOption[]
    agencies: PublicFilterOption[]
    serviceCenters: PublicFilterOption[]
  }
  appliedFilterLabels: {
    category: string | null
    agency: string | null
    center: string | null
  }
  pagination: {
    prevHref: string | null
    nextHref: string | null
  }
}

export type SearchPageError = {
  ok: false
  query: string
  message: string
}

async function resolvePublishedBySlug(
  collection: 'categories' | 'agencies' | 'service-centers',
  slug: string,
): Promise<{ id: number | string; label: string } | null> {
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection,
    locale: 'ar',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    where: {
      and: [publishedActiveWhere, { slug: { equals: slug } }],
    },
  })
  const doc = found.docs[0] as { id: number | string; name?: string } | undefined
  if (!doc) return null
  const label = typeof doc.name === 'string' ? doc.name : slug
  return { id: doc.id, label }
}

async function loadFilterOptions(): Promise<SearchPageResult['filterOptions']> {
  const payload = await getPayload({ config })
  const publicWhere = getPublicTransactionWhere()

  // Only expose taxonomy that has at least one publicly-eligible transaction
  // under the active content mode (blocks empty DEMO-only filter leakage).
  const publicTxs = await payload.find({
    collection: 'transactions',
    depth: 0,
    limit: 500,
    overrideAccess: false,
    where: publicWhere,
  })
  const liveTxs = await filterDocsByLivePublicClaimTrust(
    payload,
    publicTxs.docs as unknown as Array<Record<string, unknown>>,
  )
  const allowedCategoryIds = new Set<string>()
  const allowedAgencyIds = new Set<string>()
  const allowedCenterIds = new Set<string>()
  for (const tx of liveTxs) {
    const cat = tx.category
    const ag = tx.agency
    const centers = tx.serviceCenters
    const catId =
      typeof cat === 'object' && cat && 'id' in cat
        ? String((cat as { id: unknown }).id)
        : cat != null
          ? String(cat)
          : null
    const agId =
      typeof ag === 'object' && ag && 'id' in ag
        ? String((ag as { id: unknown }).id)
        : ag != null
          ? String(ag)
          : null
    if (catId) allowedCategoryIds.add(catId)
    if (agId) allowedAgencyIds.add(agId)
    if (Array.isArray(centers)) {
      for (const c of centers) {
        const id =
          typeof c === 'object' && c && 'id' in c
            ? String((c as { id: unknown }).id)
            : c != null
              ? String(c)
              : null
        if (id) allowedCenterIds.add(id)
      }
    }
  }

  const [cats, agencies, centers] = await Promise.all([
    payload.find({
      collection: 'categories',
      locale: 'ar',
      depth: 0,
      limit: 100,
      sort: 'sortOrder',
      overrideAccess: false,
      where: publishedActiveWhere,
    }),
    payload.find({
      collection: 'agencies',
      locale: 'ar',
      depth: 0,
      limit: 100,
      sort: 'name',
      overrideAccess: false,
      where: publishedActiveWhere,
    }),
    payload.find({
      collection: 'service-centers',
      locale: 'ar',
      depth: 0,
      limit: 100,
      sort: 'name',
      overrideAccess: false,
      where: publishedActiveWhere,
    }),
  ])

  const mapDocs = (
    docs: Array<{ id?: number | string; slug?: string; name?: string }>,
    allowed: Set<string>,
  ): PublicFilterOption[] =>
    docs
      .filter((d) => d.id != null && allowed.has(String(d.id)))
      .map((d) => ({
        slug: typeof d.slug === 'string' ? d.slug : '',
        label: typeof d.name === 'string' ? d.name : '',
      }))
      .filter((d) => d.slug && d.label)

  return {
    categories: mapDocs(cats.docs as Array<{ id?: number | string; slug?: string; name?: string }>, allowedCategoryIds),
    agencies: mapDocs(
      agencies.docs as Array<{ id?: number | string; slug?: string; name?: string }>,
      allowedAgencyIds,
    ),
    serviceCenters: mapDocs(
      centers.docs as Array<{ id?: number | string; slug?: string; name?: string }>,
      allowedCenterIds,
    ),
  }
}

/**
 * Public search: `getPublicTransactionWhere()` (incl. claimTrustOk + contentClass) is a prefilter only.
 * Candidates are live-validated for Claim/Source trust before ranking/results.
 */
export async function runPublicSearch(
  parsed: ParsedSearchParams,
): Promise<SearchPageResult | SearchPageError> {
  try {
    const payload = await getPayload({ config })
    const filterOptions = await loadFilterOptions()

    const andClause: Where[] = [getPublicTransactionWhere()]
    const appliedFilterLabels = {
      category: null as string | null,
      agency: null as string | null,
      center: null as string | null,
    }

    let categoryId: string | number | null = null
    let agencyId: string | number | null = null
    let centerId: string | number | null = null

    if (parsed.categorySlug) {
      const cat = await resolvePublishedBySlug('categories', parsed.categorySlug)
      if (cat) {
        categoryId = cat.id
        appliedFilterLabels.category = cat.label
        andClause.push({ category: { equals: cat.id } })
      }
      // invalid slug → ignore safely (do not 500)
    }
    if (parsed.agencySlug) {
      const agency = await resolvePublishedBySlug('agencies', parsed.agencySlug)
      if (agency) {
        agencyId = agency.id
        appliedFilterLabels.agency = agency.label
        andClause.push({ agency: { equals: agency.id } })
      }
    }
    if (parsed.serviceCenterSlug) {
      const center = await resolvePublishedBySlug('service-centers', parsed.serviceCenterSlug)
      if (center) {
        centerId = center.id
        appliedFilterLabels.center = center.label
        andClause.push({ serviceCenters: { in: [center.id] } })
      }
    }

    const emptyQuery = !parsed.qNormalized
    const hasFilters = Boolean(categoryId || agencyId || centerId)

    // Empty query with no filters → intentional empty state (examples in UI), not a full catalog dump
    if (emptyQuery && !hasFilters) {
      return {
        ok: true,
        query: parsed.q,
        queryNormalized: parsed.qNormalized,
        emptyQuery: true,
        results: [],
        total: 0,
        page: 1,
        pageSize: parsed.pageSize,
        totalPages: 1,
        filters: {
          category: null,
          agency: null,
          center: null,
        },
        filterOptions,
        appliedFilterLabels,
        pagination: { prevHref: null, nextHref: null },
      }
    }

    // Candidate prefilter via normalized searchText when query present
    if (parsed.qNormalized.length >= 2) {
      andClause.push({ searchText: { contains: parsed.qNormalized } })
    }

    const where: Where = { and: andClause }

    let docs = (
      await payload.find({
        collection: 'transactions',
        locale: 'ar',
        depth: 1,
        limit: SEARCH_CANDIDATE_CAP,
        page: 1,
        overrideAccess: false,
        where,
      })
    ).docs as unknown as Record<string, unknown>[]

    // Fallback: if searchText prefilter returned nothing (legacy rows), scan eligible+filters only
    if (parsed.qNormalized && docs.length === 0) {
      const fallbackAnd = andClause.filter((clause) => {
        const keys = Object.keys(clause as object)
        return !keys.includes('searchText')
      })
      docs = (
        await payload.find({
          collection: 'transactions',
          locale: 'ar',
          depth: 1,
          limit: SEARCH_CANDIDATE_CAP,
          page: 1,
          overrideAccess: false,
          where: { and: fallbackAnd },
        })
      ).docs as unknown as Record<string, unknown>[]
    }

    docs = await filterDocsByLivePublicClaimTrust(payload, docs)

    type Ranked = PublicSearchResultCard & { score: number }
    const ranked: Ranked[] = []

    for (const doc of docs) {
      const card = mapPublicSearchResult(doc)
      if (!card) continue

      if (emptyQuery) {
        // Browse mode with filters only — stable title order; no free-text match required
        ranked.push({ ...card, score: 90 })
        continue
      }

      const rankInput = extractRankInput(doc)
      const { score, reason } = scoreSearchMatch(rankInput, parsed.q)
      if (reason === 'NO_MATCH') continue
      ranked.push({ ...card, score })
    }

    ranked.sort(compareRanked)

    // Defense in depth: never surface the same document id twice (does not merge same-title different docs).
    const uniqueRanked = dedupeRankedByDocumentId(ranked)

    const total = uniqueRanked.length
    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize))
    const page = Math.min(Math.max(1, parsed.page), totalPages)
    const start = (page - 1) * parsed.pageSize
    const results = uniqueRanked
      .slice(start, start + parsed.pageSize)
      .map(({ score: _s, ...card }) => card)

    const hrefParts = {
      q: parsed.q,
      category: categoryId ? parsed.categorySlug : null,
      agency: agencyId ? parsed.agencySlug : null,
      center: centerId ? parsed.serviceCenterSlug : null,
    }

    return {
      ok: true,
      query: parsed.q,
      queryNormalized: parsed.qNormalized,
      emptyQuery,
      results,
      total,
      page,
      pageSize: parsed.pageSize,
      totalPages,
      filters: {
        category: categoryId ? parsed.categorySlug : null,
        agency: agencyId ? parsed.agencySlug : null,
        center: centerId ? parsed.serviceCenterSlug : null,
      },
      filterOptions,
      appliedFilterLabels,
      pagination: {
        prevHref:
          page > 1 ? buildSearchHref({ ...hrefParts, page: page - 1 }) : null,
        nextHref:
          page < totalPages ? buildSearchHref({ ...hrefParts, page: page + 1 }) : null,
      },
    }
  } catch {
    return {
      ok: false,
      query: parsed.q,
      message: 'تعذّر تنفيذ البحث حالياً. حاول مرة ثانية بعد قليل.',
    }
  }
}

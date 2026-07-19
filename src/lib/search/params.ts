import { normalizeArabicQuery } from '@/lib/search/normalize'

/** Public search query / filter / pagination parsing (server-safe). */

export const SEARCH_MAX_QUERY_LENGTH = 120
export const SEARCH_DEFAULT_PAGE_SIZE = 10
export const SEARCH_MAX_PAGE = 100
export const SEARCH_CANDIDATE_CAP = 200

export type ParsedSearchParams = {
  /** Original trimmed query for display (may be empty). */
  q: string
  /** Normalized query for matching (may be empty). */
  qNormalized: string
  page: number
  pageSize: number
  categorySlug: string | null
  agencySlug: string | null
  serviceCenterSlug: string | null
  /** QA-only flags when ALLOW_QA_EMPTY_STATES=1 */
  qaLoading: boolean
  qaError: boolean
  errors: string[]
}

function firstString(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return ''
}

function parsePositiveInt(raw: string, fallback: number, max: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

function sanitizeSlugParam(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (!/^[\p{L}\p{N}-]+$/u.test(s) || s.length > 120) return null
  return s
}

/**
 * Parse `/search` searchParams. Invalid filters are dropped (fail safe), not thrown.
 */
export function parseSearchParams(
  input: Record<string, unknown> | URLSearchParams,
  options?: { allowQa?: boolean },
): ParsedSearchParams {
  const get = (key: string): string => {
    if (input instanceof URLSearchParams) return input.get(key) ?? ''
    return firstString(input[key])
  }

  const errors: string[] = []
  let q = get('q').trim().replace(/\s+/g, ' ')
  if (q.length > SEARCH_MAX_QUERY_LENGTH) {
    q = q.slice(0, SEARCH_MAX_QUERY_LENGTH)
    errors.push('query_truncated')
  }

  const page = parsePositiveInt(get('page'), 1, SEARCH_MAX_PAGE)
  const pageSize = SEARCH_DEFAULT_PAGE_SIZE

  const categorySlug = sanitizeSlugParam(get('category'))
  const agencySlug = sanitizeSlugParam(get('agency'))
  const serviceCenterSlug = sanitizeSlugParam(get('center'))

  const allowQa = Boolean(options?.allowQa)
  const qaLoading = allowQa && get('qaLoading') === '1'
  const qaError = allowQa && get('qaError') === '1'

  return {
    q,
    qNormalized: normalizeArabicQuery(q),
    page,
    pageSize,
    categorySlug,
    agencySlug,
    serviceCenterSlug,
    qaLoading,
    qaError,
    errors,
  }
}

/** Build a stable query string preserving q + filters + page. */
export function buildSearchHref(parts: {
  q?: string
  page?: number
  category?: string | null
  agency?: string | null
  center?: string | null
}): string {
  const sp = new URLSearchParams()
  const q = parts.q?.trim() ?? ''
  if (q) sp.set('q', q)
  if (parts.category) sp.set('category', parts.category)
  if (parts.agency) sp.set('agency', parts.agency)
  if (parts.center) sp.set('center', parts.center)
  if (parts.page && parts.page > 1) sp.set('page', String(parts.page))
  const qs = sp.toString()
  return qs ? `/search?${qs}` : '/search'
}

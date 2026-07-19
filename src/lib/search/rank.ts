import { normalizeArabicSearchText } from '@/lib/search/normalize'

/** Lower score = higher rank. Gaps allow stable secondary sorts. */
export const RANK = {
  EXACT_TITLE: 10,
  EXACT_ALIAS: 20,
  TITLE_PREFIX: 30,
  TITLE_CONTAINS: 40,
  ALIAS_CONTAINS: 50,
  SUMMARY: 60,
  RELATED_LABEL: 70,
  FALLBACK: 90,
  NO_MATCH: 1000,
} as const

export type SearchRankInput = {
  title: string
  aliases: string[]
  summary: string
  categoryName: string | null
  agencyName: string | null
  serviceCenterNames: string[]
  slug: string
}

export type RankedScore = {
  score: number
  reason: keyof typeof RANK | 'NO_MATCH'
}

function n(s: string): string {
  return normalizeArabicSearchText(s)
}

/**
 * Deterministic relevance for a single normalized query string.
 * Not semantic / AI search.
 */
export function scoreSearchMatch(doc: SearchRankInput, rawQuery: string): RankedScore {
  const q = n(rawQuery)
  if (!q) return { score: RANK.FALLBACK, reason: 'FALLBACK' }

  const title = n(doc.title)
  const aliases = doc.aliases.map(n).filter(Boolean)
  const summary = n(doc.summary)
  const related = [
    doc.categoryName ? n(doc.categoryName) : '',
    doc.agencyName ? n(doc.agencyName) : '',
    ...doc.serviceCenterNames.map(n),
    n(doc.slug.replace(/-/g, ' ')),
  ].filter(Boolean)

  if (title && title === q) return { score: RANK.EXACT_TITLE, reason: 'EXACT_TITLE' }
  if (aliases.some((a) => a === q)) return { score: RANK.EXACT_ALIAS, reason: 'EXACT_ALIAS' }
  if (title && title.startsWith(q)) return { score: RANK.TITLE_PREFIX, reason: 'TITLE_PREFIX' }
  if (title && title.includes(q)) return { score: RANK.TITLE_CONTAINS, reason: 'TITLE_CONTAINS' }
  if (aliases.some((a) => a.includes(q))) return { score: RANK.ALIAS_CONTAINS, reason: 'ALIAS_CONTAINS' }
  if (summary && summary.includes(q)) return { score: RANK.SUMMARY, reason: 'SUMMARY' }
  if (related.some((r) => r === q || r.includes(q))) {
    return { score: RANK.RELATED_LABEL, reason: 'RELATED_LABEL' }
  }

  // Token AND: every query token must appear somewhere in searchable text
  const tokens = q.split(' ').filter((t) => t.length > 0)
  if (tokens.length > 1) {
    const hay = [title, ...aliases, summary, ...related].join(' ')
    if (tokens.every((t) => hay.includes(t))) {
      if (title && tokens.every((t) => title.includes(t))) {
        return { score: RANK.TITLE_CONTAINS, reason: 'TITLE_CONTAINS' }
      }
      if (aliases.some((a) => tokens.every((t) => a.includes(t)))) {
        return { score: RANK.ALIAS_CONTAINS, reason: 'ALIAS_CONTAINS' }
      }
      if (summary && tokens.every((t) => summary.includes(t))) {
        return { score: RANK.SUMMARY, reason: 'SUMMARY' }
      }
      return { score: RANK.RELATED_LABEL, reason: 'RELATED_LABEL' }
    }
  }

  return { score: RANK.NO_MATCH, reason: 'NO_MATCH' }
}

export function compareRanked(
  a: { score: number; title: string; id: string | number },
  b: { score: number; title: string; id: string | number },
): number {
  if (a.score !== b.score) return a.score - b.score
  const titleCmp = a.title.localeCompare(b.title, 'ar')
  if (titleCmp !== 0) return titleCmp
  return String(a.id).localeCompare(String(b.id), 'en')
}

import { localizedString, type LocalizedLike } from '@/lib/public/localized'
import { isPubliclyEligibleTransaction } from '@/lib/public/featured-transactions'
import type { SearchRankInput } from '@/lib/search/rank'

export type PublicSearchResultCard = {
  id: number | string
  title: string
  summary: string
  slug: string
  categoryName: string | null
  agencyName: string | null
  lastReviewedAt: string | null
  demoLabeled: boolean
  href: string
}

const PRIVATE_KEYS = [
  'internalNotes',
  'notes',
  'createdBy',
  'lastUpdatedBy',
  'publishedBy',
  'changeRequestComment',
  'approvedContentHash',
  'approvedVersionId',
  'reviewDueOverrideReason',
  'archiveReason',
  'submittedForReviewBy',
  'changeRequestedBy',
  'approvedBy',
  'archivedBy',
  'searchText',
  'workflowState',
  'markedOutdated',
  '_status',
] as const

function isDemoLabel(text: string): boolean {
  return /تجريب|demo|test|qa-|fixture/i.test(text)
}

function relationName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const name = localizedString((value as { name?: LocalizedLike }).name)
  return name || null
}

function relationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const names: string[] = []
  for (const item of value) {
    const n = relationName(item)
    if (n) names.push(n)
  }
  return names
}

/**
 * Map a Payload transaction doc to a public search card.
 * Returns null if ineligible or missing required public fields.
 * Never includes private editorial fields or raw inaccessible relation IDs.
 */
export function mapPublicSearchResult(
  doc: Record<string, unknown>,
): PublicSearchResultCard | null {
  if (!isPubliclyEligibleTransaction(doc)) return null

  const title = localizedString(doc.title as LocalizedLike)
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  if (!title || !slug) return null

  // Refuse to surface cards that only have raw IDs for required relations
  const categoryName = relationName(doc.category)
  const agencyName = relationName(doc.agency)
  if (typeof doc.category === 'number' || typeof doc.category === 'string') {
    // Raw ID without populate — do not leak; treat as missing public label
  }
  if (typeof doc.agency === 'number' || typeof doc.agency === 'string') {
    // same
  }

  return {
    id: doc.id as number | string,
    title,
    summary: localizedString(doc.summary as LocalizedLike),
    slug,
    categoryName,
    agencyName,
    lastReviewedAt: typeof doc.lastReviewedAt === 'string' ? doc.lastReviewedAt : null,
    demoLabeled: isDemoLabel(title) || isDemoLabel(slug),
    href: `/transactions/${encodeURIComponent(slug)}`,
  }
}

/** Extract ranking fields from a depth≥1 public transaction doc. */
export function extractRankInput(doc: Record<string, unknown>): SearchRankInput {
  const aliasesRaw = Array.isArray(doc.aliases) ? doc.aliases : []
  const aliases = aliasesRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return ''
      return localizedString((row as { value?: LocalizedLike }).value)
    })
    .filter(Boolean)

  return {
    title: localizedString(doc.title as LocalizedLike),
    aliases,
    summary: localizedString(doc.summary as LocalizedLike),
    categoryName: relationName(doc.category),
    agencyName: relationName(doc.agency),
    serviceCenterNames: relationNames(doc.serviceCenters),
    slug: typeof doc.slug === 'string' ? doc.slug : '',
  }
}

/** Assert mapped cards never contain private keys (test helper). */
export function assertNoPrivateKeys(card: Record<string, unknown>): string[] {
  return PRIVATE_KEYS.filter((k) => k in card)
}

/**
 * Phase 6 QA fixture markers — stable prefixes for idempotent seed/cleanup.
 * Only rows with these markers may be deleted by the fixture cleaner.
 */

export const PHASE6_QA_SLUG_PREFIX = 'qa-p6-r1-'

export const PHASE6_QA_STABLE = {
  categorySlug: `${PHASE6_QA_SLUG_PREFIX}cat`,
  agencySlug: `${PHASE6_QA_SLUG_PREFIX}agency`,
  centerSlug: `${PHASE6_QA_SLUG_PREFIX}center`,
  sourceSlug: `${PHASE6_QA_SLUG_PREFIX}src`,
  transactions: {
    civilExtract: `${PHASE6_QA_SLUG_PREFIX}tx-civil-extract`,
    criminalRecord: `${PHASE6_QA_SLUG_PREFIX}tx-criminal-record`,
    passportRenew: `${PHASE6_QA_SLUG_PREFIX}tx-passport-renew`,
    draft: `${PHASE6_QA_SLUG_PREFIX}draft`,
    archived: `${PHASE6_QA_SLUG_PREFIX}arch`,
    outdated: `${PHASE6_QA_SLUG_PREFIX}out`,
  },
  pageSlug: (i: number) => `${PHASE6_QA_SLUG_PREFIX}page-${String(i).padStart(2, '0')}`,
  /** Published eligible rows the public search should see for pagination queries. */
  publishedEligibleCount: 14, // 3 named + 11 page fillers
} as const

export function isPhase6QaFixtureSlug(slug: unknown): boolean {
  return typeof slug === 'string' && slug.startsWith(PHASE6_QA_SLUG_PREFIX)
}

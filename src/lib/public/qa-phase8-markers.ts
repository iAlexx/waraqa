/** Phase 8 QA fixture markers — stable `qa-p8-r1-*` prefixes only. */

export const PHASE8_QA_SLUG_PREFIX = 'qa-p8-r1-'

export const PHASE8_QA_STABLE = {
  categorySlug: `${PHASE8_QA_SLUG_PREFIX}cat`,
  agencySlug: `${PHASE8_QA_SLUG_PREFIX}agency`,
  sourceSlug: `${PHASE8_QA_SLUG_PREFIX}src`,
  docSlugA: `${PHASE8_QA_SLUG_PREFIX}doc-id`,
  docSlugB: `${PHASE8_QA_SLUG_PREFIX}doc-guardian`,
  txGuide: `${PHASE8_QA_SLUG_PREFIX}tx-guide`,
  txNoGuide: `${PHASE8_QA_SLUG_PREFIX}tx-noguide`,
  txDraft: `${PHASE8_QA_SLUG_PREFIX}tx-draft`,
  /** Published eligible public detail pages (guide + no-guide). */
  publishedEligibleCount: 2,
} as const

export function isPhase8QaFixtureSlug(slug: unknown): boolean {
  return typeof slug === 'string' && slug.startsWith(PHASE8_QA_SLUG_PREFIX)
}

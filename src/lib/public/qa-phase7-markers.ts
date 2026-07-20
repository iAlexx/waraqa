/** Phase 7 QA fixture markers — stable `qa-p7-r1-*` prefixes only. */

export const PHASE7_QA_SLUG_PREFIX = 'qa-p7-r1-'

export const PHASE7_QA_STABLE = {
  categorySlug: `${PHASE7_QA_SLUG_PREFIX}cat`,
  agencySlug: `${PHASE7_QA_SLUG_PREFIX}agency`,
  centerSlugA: `${PHASE7_QA_SLUG_PREFIX}center-a`,
  centerSlugB: `${PHASE7_QA_SLUG_PREFIX}center-b`,
  sourceSlug: `${PHASE7_QA_SLUG_PREFIX}src`,
  sourceSlugB: `${PHASE7_QA_SLUG_PREFIX}src-b`,
  docSlugA: `${PHASE7_QA_SLUG_PREFIX}doc-id`,
  docSlugB: `${PHASE7_QA_SLUG_PREFIX}doc-form`,
  txComplete: `${PHASE7_QA_SLUG_PREFIX}tx-complete`,
  txMinimal: `${PHASE7_QA_SLUG_PREFIX}tx-minimal`,
  txLong: `${PHASE7_QA_SLUG_PREFIX}tx-long`,
  txDraft: `${PHASE7_QA_SLUG_PREFIX}tx-draft`,
  txInactive: `${PHASE7_QA_SLUG_PREFIX}tx-inactive`,
  txArchived: `${PHASE7_QA_SLUG_PREFIX}tx-arch`,
  txOutdated: `${PHASE7_QA_SLUG_PREFIX}tx-out`,
  /** Published eligible public detail pages. */
  publishedEligibleCount: 3,
} as const

export function isPhase7QaFixtureSlug(slug: unknown): boolean {
  return typeof slug === 'string' && slug.startsWith(PHASE7_QA_SLUG_PREFIX)
}

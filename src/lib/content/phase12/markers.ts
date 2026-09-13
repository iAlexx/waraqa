/** Stable keys/slugs for Phase 12 DEMO seed content (idempotent upsert). */

export const PHASE12_SLUG_PREFIX = 'p12-demo-' as const

export const PHASE12_REVIEWER_EMAIL = 'phase12-content-reviewer@waraqa.local' as const

export const PHASE12_CHECKED_AT = '2026-09-13' as const

export const PHASE12_STABLE = {
  categoryEducation: `${PHASE12_SLUG_PREFIX}cat-education`,
  categoryConsular: `${PHASE12_SLUG_PREFIX}cat-consular`,
  categoryCivil: `${PHASE12_SLUG_PREFIX}cat-civil`,
  categoryTravel: `${PHASE12_SLUG_PREFIX}cat-travel`,
  agencyMoe: `${PHASE12_SLUG_PREFIX}agency-moe`,
  agencyMofa: `${PHASE12_SLUG_PREFIX}agency-mofa`,
  sourceSanaEquivalency: `${PHASE12_SLUG_PREFIX}src-sana-secondary-equivalency`,
  /** Later MoE clarification: year-round intake, attestation chain, proxy submitter. */
  sourceSanaEquivalencyAnan: `${PHASE12_SLUG_PREFIX}src-sana-eq-anan`,
  /** Scoped suspension of the complementary exam for Syrian students. */
  sourceSanaSuppSuspension: `${PHASE12_SLUG_PREFIX}src-sana-eq-supp-suspension`,
  sourceMofaPoa: `${PHASE12_SLUG_PREFIX}src-mofa-poa`,
  sourceMofaMarriage: `${PHASE12_SLUG_PREFIX}src-mofa-marriage`,
  sourceMofaCivilExtract: `${PHASE12_SLUG_PREFIX}src-mofa-civil-extract`,
  sourceMofaPassportRenew: `${PHASE12_SLUG_PREFIX}src-mofa-passport-renew`,
  txSecondaryEquivalency: `${PHASE12_SLUG_PREFIX}tx-secondary-equivalency`,
  txPoaMission: `${PHASE12_SLUG_PREFIX}tx-poa-mission`,
  txMarriageMission: `${PHASE12_SLUG_PREFIX}tx-marriage-mission`,
  txCivilExtractMission: `${PHASE12_SLUG_PREFIX}tx-civil-extract-mission`,
  txPassportRenewMission: `${PHASE12_SLUG_PREFIX}tx-passport-renew-mission`,
} as const

/** Five DEMO procedure slugs — Golden Demo is secondary equivalency. */
export const PHASE12_PROCEDURE_SLUGS = [
  PHASE12_STABLE.txSecondaryEquivalency,
  PHASE12_STABLE.txPoaMission,
  PHASE12_STABLE.txMarriageMission,
  PHASE12_STABLE.txCivilExtractMission,
  PHASE12_STABLE.txPassportRenewMission,
] as const

export type Phase12ProcedureSlug = (typeof PHASE12_PROCEDURE_SLUGS)[number]

export const PHASE12_GOLDEN_DEMO_SLUG = PHASE12_STABLE.txSecondaryEquivalency

export const PHASE12_SOURCE_URLS = {
  sanaEquivalency: 'https://sana.sy/education/2542204/',
  sanaEquivalencyAnan: 'https://sana.sy/education/2542861/',
  sanaSuppSuspension: 'https://sana.sy/education/2425127/',
  mofaPoa:
    'https://mofaex.gov.sy/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%85-%D9%88%D9%83%D8%A7%D9%84%D8%A7%D8%AA-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B9%D8%AB%D8%A7%D8%AA-%D8%A7%D9%84%D8%AF%D8%A8%D9%84%D9%88%D9%85%D8%A7%D8%B3%D9%8A%D8%A9',
  mofaMarriage:
    'https://mofaex.gov.sy/services/%D8%A3%D8%AD%D9%88%D8%A7%D9%84-%D9%85%D8%AF%D9%86%D9%8A%D8%A9-%D8%AA%D8%B3%D8%AC%D9%8A%D9%84-%D8%A7%D9%84%D8%B2%D9%88%D8%A7%D8%AC',
  mofaCivilExtract:
    'https://mofaex.gov.sy/services/%D8%A7%D8%B3%D8%AA%D8%AE%D8%B1%D8%A7%D8%AC-%D9%88%D8%AB%D9%8A%D9%82%D8%A9-%D8%A3%D8%AD%D9%88%D8%A7%D9%84-%D9%85%D8%AF%D9%86%D9%8A%D8%A9',
  mofaPassportRenew:
    'https://mofaex.gov.sy/services/%D8%AA%D8%AC%D8%AF%D9%8A%D8%AF-%D8%AC%D9%88%D8%A7%D8%B2-%D8%A7%D9%84%D8%B3%D9%81%D8%B1-%D8%A8%D8%AF%D9%84-%D8%B9%D9%86-%D9%85%D9%86%D8%AA%D9%87%D9%8A',
} as const

export const PHASE12_CLAIM_KEYS = {
  // Secondary equivalency
  eqChannel: 'claim_p12_eq_channel',
  /** Year-round intake — replaces the retired `eqIntakeFreshness` uncertainty claim. */
  eqIntakeYearRound: 'claim_p12_eq_intake_year_round',
  eqAttestationChain: 'claim_p12_eq_attestation_chain',
  eqDocsBase: 'claim_p12_eq_docs_base',
  eqDocsNonArab: 'claim_p12_eq_docs_non_arab',
  eqProxySubmitter: 'claim_p12_eq_proxy_submitter',
  eqConditionalAccept: 'claim_p12_eq_conditional_accept',
  /** General supplementary-exam picture — CONFLICTED across the three sources. */
  eqSupplementaryExams: 'claim_p12_eq_supplementary_exams',
  /** Scoped: Arabic + social studies complementary exams cancelled for foreign certificates. */
  eqArabicSocialCancel: 'claim_p12_eq_arabic_social_cancel',
  /** Scoped: complementary exam suspended for Syrian students 2025-2026 / 2026-2027. */
  eqSuppSyrianSuspension: 'claim_p12_eq_supp_syrian_suspension',
  eqFeeAmount: 'claim_p12_eq_fee_amount',
  eqOutcome: 'claim_p12_eq_outcome',
  // Power of attorney
  poaChannel: 'claim_p12_poa_channel',
  poaEligibility: 'claim_p12_poa_eligibility',
  poaDocsBase: 'claim_p12_poa_docs_base',
  poaDocsConditional: 'claim_p12_poa_docs_conditional',
  poaValidity: 'claim_p12_poa_validity',
  poaDuration: 'claim_p12_poa_duration',
  poaOutcome: 'claim_p12_poa_outcome',
  poaFeeAmount: 'claim_p12_poa_fee_amount',
  // Marriage registration
  marChannel: 'claim_p12_mar_channel',
  marEligibility: 'claim_p12_mar_eligibility',
  marDocs: 'claim_p12_mar_docs',
  marAttendance: 'claim_p12_mar_attendance',
  marInstruction: 'claim_p12_mar_instruction',
  marDuration: 'claim_p12_mar_duration',
  marOutcome: 'claim_p12_mar_outcome',
  marFeeAmount: 'claim_p12_mar_fee_amount',
  // Civil extract
  civChannel: 'claim_p12_civ_channel',
  civEligibility: 'claim_p12_civ_eligibility',
  civDocs: 'claim_p12_civ_docs',
  civDocKinds: 'claim_p12_civ_doc_kinds',
  civDuration: 'claim_p12_civ_duration',
  civOutcome: 'claim_p12_civ_outcome',
  civFeeAmount: 'claim_p12_civ_fee_amount',
  // Passport renewal
  pasChannel: 'claim_p12_pas_channel',
  pasEligibility: 'claim_p12_pas_eligibility',
  pasDocs: 'claim_p12_pas_docs',
  pasMinorRules: 'claim_p12_pas_minor_rules',
  pasOutcome: 'claim_p12_pas_outcome',
  pasFeeAmount: 'claim_p12_pas_fee_amount',
} as const

export const PHASE12_ALL_CLAIM_KEYS = Object.values(PHASE12_CLAIM_KEYS)

export const DEMO_PUBLIC_LABEL_AR = 'بيانات تجريبية للعرض — ليست معلومات رسمية' as const

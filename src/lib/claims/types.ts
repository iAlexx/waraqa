/** P0-05A — Claim / Evidence foundation types (storage only; no public enforcement). */

export const CLAIM_STATUSES = [
  'DRAFT',
  'NEEDS_REVIEW',
  'VERIFIED',
  'UNKNOWN',
  'CONFLICTED',
  'NEEDS_OFFICIAL_CONFIRMATION',
  'OUTDATED',
  'SUPERSEDED',
  'REJECTED',
] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export const CLAIM_PUBLICATION_PERMISSIONS = [
  'INTERNAL_ONLY',
  'PUBLIC',
  'PUBLIC_WITH_WARNING',
  'BLOCKED',
] as const
export type ClaimPublicationPermission = (typeof CLAIM_PUBLICATION_PERMISSIONS)[number]

export const CLAIM_EVIDENCE_RELATIONS = [
  'SUPPORTS',
  'CONTRADICTS',
  'PARTIALLY_SUPPORTS',
  'SUPERSEDES',
  'CONTEXT_ONLY',
] as const
export type ClaimEvidenceRelation = (typeof CLAIM_EVIDENCE_RELATIONS)[number]

/** Light taxonomy for editorial filtering — not a full ontology. */
export const CLAIM_KINDS = [
  'requirement',
  'fee',
  'step',
  'eligibility',
  'process',
  'duration',
  'location',
  'other',
] as const
export type ClaimKind = (typeof CLAIM_KINDS)[number]

/**
 * Optional attachment hint for later binding (P0-05B+).
 * Does not retrofit transaction fields or guide rules yet.
 */
export const CLAIM_SCOPE_KINDS = [
  'transaction_section',
  'document_key',
  'step_key',
  'fee_key',
  'guide_rule',
  'other',
] as const
export type ClaimScopeKind = (typeof CLAIM_SCOPE_KINDS)[number]

export type ClaimEvidenceInput = {
  source?: unknown
  relationType?: unknown
  note?: unknown
  quoteOrLocator?: unknown
  checkedAt?: unknown
}

export type ClaimValidationInput = {
  key?: unknown
  statement?: unknown
  status?: unknown
  publicationPermission?: unknown
  kind?: unknown
  scopeKind?: unknown
  scopeKey?: unknown
  evidence?: unknown
  reviewedBy?: unknown
  verifiedAt?: unknown
  validFrom?: unknown
  validUntil?: unknown
  reviewDueAt?: unknown
}

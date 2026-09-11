import {
  CLAIM_PUBLICATION_PERMISSIONS,
  CLAIM_STATUSES,
  type ClaimEvidenceRelation,
  type ClaimPublicationPermission,
  type ClaimStatus,
} from '@/lib/claims/types'
import { evaluateSourceTrust } from '@/lib/claims/source-trust'
import {
  claimClassSupportsTransaction,
  sourceClassSupportsClaim,
} from '@/lib/content-class/public-content-policy'
import { isContentClass } from '@/lib/content-class/types'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

export const CLAIM_TRUST_LEVELS = ['AUTHORITATIVE', 'WARNING_ONLY', 'BLOCKED'] as const
export type ClaimTrustLevel = (typeof CLAIM_TRUST_LEVELS)[number]

export type ClaimEvidenceRowLike = {
  source?: number | string | SourceDocLike | null
  relationType?: ClaimEvidenceRelation | string | null
}

export type ClaimDocLike = {
  id?: number | string
  key?: string | null
  active?: boolean | null
  _status?: 'draft' | 'published' | null
  status?: ClaimStatus | string | null
  publicationPermission?: ClaimPublicationPermission | string | null
  reviewedBy?: unknown
  verifiedAt?: string | Date | null
  evidence?: ClaimEvidenceRowLike[] | null
  /** P0-06 content isolation class */
  contentClass?: string | null
}

export type ClaimTrustEvaluation = {
  level: ClaimTrustLevel
  claimKey: string
  status: string
  publicationPermission: string
  reasons: string[]
}

export type EvaluateClaimTrustOptions = {
  /** When set, claim contentClass must support this transaction class for AUTHORITATIVE. */
  transactionContentClass?: unknown
}

function relationId(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return null
}

const WARNING_STATUSES: ReadonlySet<string> = new Set([
  'UNKNOWN',
  'CONFLICTED',
  'NEEDS_OFFICIAL_CONFIRMATION',
])

/**
 * Central Claim trust policy for public authoritative guidance (P0-05B1 + P0-06 class deps).
 * UNKNOWN / CONFLICTED / NEEDS_OFFICIAL_CONFIRMATION never become AUTHORITATIVE.
 * Unrecognized enum combinations fail closed → BLOCKED.
 */
export function evaluateClaimTrust(
  claim: ClaimDocLike | null | undefined,
  resolvedSources: Map<string, SourceDocLike>,
  opts?: EvaluateClaimTrustOptions,
): ClaimTrustEvaluation {
  const claimKey =
    typeof claim?.key === 'string' && claim.key.trim() ? claim.key.trim() : String(claim?.id ?? '?')
  const status = String(claim?.status ?? '')
  const publicationPermission = String(claim?.publicationPermission ?? '')
  const reasons: string[] = []

  if (!claim) {
    return {
      level: 'BLOCKED',
      claimKey,
      status: status || 'missing',
      publicationPermission: publicationPermission || 'missing',
      reasons: ['الادعاء غير موجود'],
    }
  }

  const statusKnown = (CLAIM_STATUSES as readonly string[]).includes(status)
  const pubKnown = (CLAIM_PUBLICATION_PERMISSIONS as readonly string[]).includes(
    publicationPermission,
  )
  if (!statusKnown) reasons.push(`حالة ادعاء غير معروفة (${status || 'فارغة'})`)
  if (!pubKnown) reasons.push(`صلاحية نشر غير معروفة (${publicationPermission || 'فارغة'})`)

  if (claim.active === false) reasons.push('الادعاء غير نشط')
  if (claim._status !== 'published') reasons.push('الادعاء غير منشور في نظام المحتوى')

  if (publicationPermission === 'INTERNAL_ONLY') reasons.push('صلاحية النشر داخلية فقط')
  if (publicationPermission === 'BLOCKED') reasons.push('صلاحية النشر محظورة')

  if (
    status === 'DRAFT' ||
    status === 'NEEDS_REVIEW' ||
    status === 'OUTDATED' ||
    status === 'SUPERSEDED' ||
    status === 'REJECTED'
  ) {
    reasons.push(`الحالة ${status} غير صالحة للاعتماد العام`)
  }

  if (!isContentClass(claim.contentClass)) {
    reasons.push('تصنيف محتوى الادعاء غير صالح أو مفقود')
  }

  if (
    opts?.transactionContentClass !== undefined &&
    !claimClassSupportsTransaction(opts.transactionContentClass, claim.contentClass)
  ) {
    reasons.push('تصنيف الادعاء غير متوافق مع تصنيف المعاملة')
  }

  const evidence = Array.isArray(claim.evidence) ? claim.evidence : []
  const supporting = evidence.filter(
    (row) => row.relationType === 'SUPPORTS' || row.relationType === 'PARTIALLY_SUPPORTS',
  )

  let supportingOk = false
  if (supporting.length > 0) {
    supportingOk = true
    for (const row of supporting) {
      const sid = relationId(row.source)
      const src = sid ? resolvedSources.get(sid) : null
      const trust = evaluateSourceTrust(src ?? undefined)
      if (!trust.ok) {
        supportingOk = false
        reasons.push(`دليل داعم غير موثوق: ${trust.reason ?? 'مصدر غير صالح'} (ادعاء ${claimKey})`)
      } else if (!sourceClassSupportsClaim(claim.contentClass, src?.contentClass)) {
        supportingOk = false
        reasons.push(`تصنيف المصدر غير متوافق مع تصنيف الادعاء (${claimKey})`)
      }
    }
  }

  const hasReviewer = relationId(claim.reviewedBy) != null
  const hasVerifiedAt = claim.verifiedAt != null && String(claim.verifiedAt).trim() !== ''

  if (status === 'VERIFIED' && publicationPermission === 'PUBLIC') {
    if (!hasReviewer) reasons.push('ينقص مراجع التوثيق')
    if (!hasVerifiedAt) reasons.push('ينقص تاريخ التوثيق')
    if (supporting.length < 1) reasons.push('ينقص دليل داعم')
  }

  if (
    reasons.length === 0 &&
    status === 'VERIFIED' &&
    publicationPermission === 'PUBLIC' &&
    hasReviewer &&
    hasVerifiedAt &&
    supportingOk &&
    supporting.length > 0
  ) {
    return {
      level: 'AUTHORITATIVE',
      claimKey,
      status,
      publicationPermission,
      reasons: [],
    }
  }

  if (
    claim.active !== false &&
    claim._status === 'published' &&
    publicationPermission === 'PUBLIC_WITH_WARNING' &&
    statusKnown &&
    (WARNING_STATUSES.has(status) || status === 'VERIFIED')
  ) {
    return {
      level: 'WARNING_ONLY',
      claimKey,
      status,
      publicationPermission,
      reasons: [`تحذير فقط — الحالة ${status} ليست اعتماداً موثوقاً`],
    }
  }

  if (reasons.length === 0) {
    reasons.push('تركيبة الحالة/الصلاحية غير مؤهلة للاعتماد العام')
  }

  return {
    level: 'BLOCKED',
    claimKey,
    status: status || 'unknown',
    publicationPermission: publicationPermission || 'unknown',
    reasons: [...new Set(reasons)],
  }
}

export function formatClaimTrustFailure(evaluation: ClaimTrustEvaluation): string {
  const reason = evaluation.reasons[0] ?? 'غير مؤهل'
  return `ادعاء «${evaluation.claimKey}» [${evaluation.status}/${evaluation.publicationPermission}/${evaluation.level}]: ${reason}`
}

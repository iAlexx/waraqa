import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { allowSeedBypass } from '@/lib/qa-seed-guard'
import type { ClaimPublicationPermission, ClaimStatus } from '@/lib/claims/types'
import { validateClaimData } from '@/lib/claims/validate-claim'

const REVIEWER_ONLY_PUBLICATION: ReadonlySet<ClaimPublicationPermission> = new Set([
  'PUBLIC',
  'PUBLIC_WITH_WARNING',
  'BLOCKED',
])

function asStatus(value: unknown): ClaimStatus | null {
  return typeof value === 'string' ? (value as ClaimStatus) : null
}

function asPublication(value: unknown): ClaimPublicationPermission | null {
  return typeof value === 'string' ? (value as ClaimPublicationPermission) : null
}

export type ClaimGovernanceArgs = {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown> | null
  user: UserLike
  operation: 'create' | 'update'
  /** Injected clock for tests. */
  now?: () => string
}

export type ClaimGovernanceResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

/**
 * Pure claim governance (P0-05A integrity).
 * Researchers may edit research-stage content; they cannot self-verify or grant public publication.
 */
export function applyClaimGovernance(args: ClaimGovernanceArgs): ClaimGovernanceResult {
  const next = { ...args.data }
  const original = args.originalDoc ?? null
  const user = args.user
  const now = args.now ?? (() => new Date().toISOString())

  const prevStatus = asStatus(original?.status)
  const nextStatus =
    asStatus(next.status) ?? (args.operation === 'update' ? prevStatus : asStatus('DRAFT'))
  const prevPub = asPublication(original?.publicationPermission)
  const nextPub =
    asPublication(next.publicationPermission) ??
    (args.operation === 'update' ? prevPub : asPublication('INTERNAL_ONLY'))

  if (hasActiveRole(user, 'researcher')) {
    if (prevStatus === 'VERIFIED') {
      return { ok: false, error: 'لا يمكن للباحث تعديل ادعاء موثّق.' }
    }
    if (nextStatus === 'VERIFIED') {
      return { ok: false, error: 'لا يمكن للباحث توثيق الادعاء (VERIFIED). يلزم مراجع أو مدير.' }
    }
    if (nextPub && REVIEWER_ONLY_PUBLICATION.has(nextPub)) {
      return {
        ok: false,
        error: 'لا يمكن للباحث منح صلاحية نشر عامة أو حظر النشر. يلزم مراجع أو مدير.',
      }
    }
    // Never trust client-supplied verification identity/time from researchers.
    delete next.reviewedBy
    delete next.verifiedAt
    if (args.operation === 'update' && original) {
      if (original.reviewedBy !== undefined) next.reviewedBy = original.reviewedBy
      if (original.verifiedAt !== undefined) next.verifiedAt = original.verifiedAt
    }
    return { ok: true, data: next }
  }

  if (hasActiveRole(user, 'admin', 'reviewer')) {
    const actorId = user && typeof user === 'object' ? user.id : undefined
    if (nextStatus === 'VERIFIED' && prevStatus !== 'VERIFIED') {
      if (actorId == null) {
        return { ok: false, error: 'توثيق الادعاء يتطلب مستخدماً مصادقاً.' }
      }
      next.reviewedBy = actorId
      next.verifiedAt = now()
    } else if (nextStatus === 'VERIFIED' && prevStatus === 'VERIFIED' && original) {
      // Preserve verification history on edits to an already-verified claim.
      next.reviewedBy = original.reviewedBy ?? next.reviewedBy
      next.verifiedAt = original.verifiedAt ?? next.verifiedAt
    }
    return { ok: true, data: next }
  }

  // Inactive / unauthorized actors should already be blocked by collection access.
  if (nextStatus === 'VERIFIED' || (nextPub && REVIEWER_ONLY_PUBLICATION.has(nextPub))) {
    return { ok: false, error: 'غير مصرح بتوثيق الادعاء أو تغيير صلاحية النشر.' }
  }
  delete next.reviewedBy
  delete next.verifiedAt
  return { ok: true, data: next }
}

/** Field-level: reviewer/admin only (active-role aware). */
export function claimReviewerFieldAccess({ req: { user } }: { req: { user?: unknown } }): boolean {
  return hasActiveRole(user as UserLike, 'admin', 'reviewer')
}

/**
 * beforeValidate: apply governance then schema validation.
 * Stamping must happen before validateClaimData so VERIFIED rows have reviewer/timestamp.
 */
export const enforceClaimGovernanceAndValidate: CollectionBeforeValidateHook = ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (!data) return data

  if (allowSeedBypass(req)) {
    const errors = validateClaimData(data as never)
    if (errors.length) throw new APIError(errors.join(' '), 400)
    return data
  }

  const governed = applyClaimGovernance({
    data: data as Record<string, unknown>,
    originalDoc: originalDoc as Record<string, unknown> | null | undefined,
    user: req.user as UserLike,
    operation: operation === 'create' ? 'create' : 'update',
  })

  if (!governed.ok) {
    throw new APIError(governed.error, 403)
  }

  // Ensure validation sees stamped verification fields.
  Object.assign(data, governed.data)

  const errors = validateClaimData(data as never)
  if (errors.length) {
    throw new APIError(errors.join(' '), 400)
  }

  return data
}

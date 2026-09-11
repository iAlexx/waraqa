import {
  evaluateClaimTrust,
  formatClaimTrustFailure,
  type ClaimDocLike,
  type ClaimTrustEvaluation,
} from '@/lib/claims/claim-trust'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

export type ClaimBindingRow = {
  claim?: number | string | ClaimDocLike | null
  required?: boolean | null
  coveredSection?: string | null
}

export type ClaimPublicationGateResult = {
  ok: boolean
  errors: string[]
  evaluations: ClaimTrustEvaluation[]
}

export type ClaimPublicationGateOptions = {
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

/**
 * Approve/publish gate for transaction claim bindings (P0-05B1 + P0-06 class deps).
 *
 * Legacy unbound (no required bindings) → fail closed.
 * Each required binding must evaluate AUTHORITATIVE.
 * WARNING_ONLY never satisfies a required binding.
 */
export function validateClaimBindingsForPublication(
  bindings: ClaimBindingRow[] | null | undefined,
  resolvedClaims: Map<string, ClaimDocLike>,
  resolvedSources: Map<string, SourceDocLike>,
  opts?: ClaimPublicationGateOptions,
): ClaimPublicationGateResult {
  const rows = bindings ?? []
  const errors: string[] = []
  const evaluations: ClaimTrustEvaluation[] = []

  const requiredRows = rows.filter((row) => row.required !== false)
  if (requiredRows.length < 1) {
    return {
      ok: false,
      errors: [
        'يجب ربط ادعاء مطلوب واحد على الأقل قبل الاعتماد/النشر (المحتوى غير المربوط لا يُعد موثوقاً).',
      ],
      evaluations: [],
    }
  }

  const seen = new Set<string>()
  for (const row of requiredRows) {
    const id = relationId(row.claim)
    if (!id) {
      errors.push('مرجع ادعاء مفقود في الربط.')
      continue
    }
    if (seen.has(id)) {
      errors.push(`الادعاء ${id} مكرر في الربط.`)
      continue
    }
    seen.add(id)

    const claim = resolvedClaims.get(id)
    const evaluation = evaluateClaimTrust(claim, resolvedSources, {
      transactionContentClass: opts?.transactionContentClass,
    })
    evaluations.push(evaluation)

    if (evaluation.level !== 'AUTHORITATIVE') {
      errors.push(formatClaimTrustFailure(evaluation))
    }
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    evaluations,
  }
}

/** Whether a published transaction may remain publicly visible given current bindings. */
export function evaluateTransactionClaimTrustOk(
  bindings: ClaimBindingRow[] | null | undefined,
  resolvedClaims: Map<string, ClaimDocLike>,
  resolvedSources: Map<string, SourceDocLike>,
  opts?: ClaimPublicationGateOptions,
): boolean {
  return validateClaimBindingsForPublication(bindings, resolvedClaims, resolvedSources, opts).ok
}

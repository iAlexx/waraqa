/**
 * Live public claim-trust + content-class gate (P0-05B1 + P0-06).
 *
 * `claimTrustOk` is a denormalized cache / CMS indicator / query prefilter only.
 * Final public authority requires:
 * - stored claimTrustOk
 * - contentClass allowed for WARAQA_PUBLIC_CONTENT_MODE
 * - live AUTHORITATIVE required claims with class-compatible Sources
 */
import type { Payload, PayloadRequest } from 'payload'

import { resolveClaimGraph } from '@/lib/claims/recompute-claim-trust'
import {
  evaluateTransactionClaimTrustOk,
  type ClaimBindingRow,
} from '@/lib/claims/validate-claim-publication'
import {
  getPublicContentMode,
  isContentClassPubliclyAllowed,
} from '@/lib/content-class/public-content-policy'
import { isContentClass } from '@/lib/content-class/types'

/**
 * Final public trust decision for a transaction document.
 */
export async function liveEvaluatePublicTransactionClaimTrust(
  payload: Payload,
  doc: Record<string, unknown> | null | undefined,
  req?: PayloadRequest,
): Promise<boolean> {
  if (!doc || doc.claimTrustOk !== true) return false

  const mode = getPublicContentMode()
  if (!isContentClassPubliclyAllowed(doc.contentClass, mode)) return false
  if (!isContentClass(doc.contentClass)) return false

  try {
    const bindings = (doc.claimBindings as ClaimBindingRow[] | null | undefined) ?? []
    const { claims, sources } = await resolveClaimGraph(payload, bindings, req)
    return evaluateTransactionClaimTrustOk(bindings, claims, sources, {
      transactionContentClass: doc.contentClass,
    })
  } catch {
    return false
  }
}

/** Filter a candidate list after DB prefilter (`claimTrustOk` + public Where). */
export async function filterDocsByLivePublicClaimTrust(
  payload: Payload,
  docs: Array<Record<string, unknown>>,
  req?: PayloadRequest,
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (const doc of docs) {
    if (await liveEvaluatePublicTransactionClaimTrust(payload, doc, req)) {
      out.push(doc)
    }
  }
  return out
}

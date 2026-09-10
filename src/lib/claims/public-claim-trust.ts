/**
 * Live public claim-trust gate (P0-05B1 hardening).
 *
 * `claimTrustOk` is a denormalized cache / CMS indicator / query prefilter only.
 * It is NOT the final public trust authority — required Claims + Sources are
 * re-evaluated on every public exposure path.
 */
import type { Payload, PayloadRequest } from 'payload'

import { resolveClaimGraph } from '@/lib/claims/recompute-claim-trust'
import {
  evaluateTransactionClaimTrustOk,
  type ClaimBindingRow,
} from '@/lib/claims/validate-claim-publication'

/**
 * Final public trust decision for a transaction document.
 *
 * Rules:
 * - stored `claimTrustOk` must be true (live never overrides a false stored gate)
 * - every required binding must live-evaluate AUTHORITATIVE
 * - resolution/load failure → fail closed
 */
export async function liveEvaluatePublicTransactionClaimTrust(
  payload: Payload,
  doc: Record<string, unknown> | null | undefined,
  req?: PayloadRequest,
): Promise<boolean> {
  if (!doc || doc.claimTrustOk !== true) return false

  try {
    const bindings = (doc.claimBindings as ClaimBindingRow[] | null | undefined) ?? []
    const { claims, sources } = await resolveClaimGraph(payload, bindings, req)
    return evaluateTransactionClaimTrustOk(bindings, claims, sources)
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

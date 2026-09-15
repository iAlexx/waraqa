/**
 * Live public claim-trust + content-class gate (P0-05B1 + P0-06).
 *
 * `claimTrustOk` is a denormalized cache / CMS indicator / query prefilter only.
 * Final public authority requires:
 * - stored claimTrustOk
 * - contentClass allowed for WARAQA_PUBLIC_CONTENT_MODE
 * - live AUTHORITATIVE required claims with class-compatible Sources
 *
 * Multi-doc paths batch Claim/Source graph resolution (unique IDs once).
 */
import type { Payload, PayloadRequest } from 'payload'

import {
  createClaimGraphBatchStats,
  resolveClaimGraphBatch,
  type ClaimGraphBatchStats,
} from '@/lib/claims/claim-graph-batch'
import {
  evaluateTransactionClaimTrustOk,
  type ClaimBindingRow,
} from '@/lib/claims/validate-claim-publication'
import {
  getPublicContentMode,
  isContentClassPubliclyAllowed,
} from '@/lib/content-class/public-content-policy'
import { isContentClass } from '@/lib/content-class/types'

export type LivePublicTrustBatchStats = ClaimGraphBatchStats & {
  candidateDocs: number
  gatedOutBeforeGraph: number
  trustedDocs: number
}

export function createLivePublicTrustBatchStats(): LivePublicTrustBatchStats {
  return {
    ...createClaimGraphBatchStats(),
    candidateDocs: 0,
    gatedOutBeforeGraph: 0,
    trustedDocs: 0,
  }
}

function passesStoredPublicGates(doc: Record<string, unknown> | null | undefined): boolean {
  if (!doc || doc.claimTrustOk !== true) return false
  const mode = getPublicContentMode()
  if (!isContentClassPubliclyAllowed(doc.contentClass, mode)) return false
  if (!isContentClass(doc.contentClass)) return false
  return true
}

/**
 * Final public trust decision for a transaction document.
 */
export async function liveEvaluatePublicTransactionClaimTrust(
  payload: Payload,
  doc: Record<string, unknown> | null | undefined,
  req?: PayloadRequest,
  stats?: ClaimGraphBatchStats,
): Promise<boolean> {
  if (!passesStoredPublicGates(doc)) return false

  try {
    const bindings = (doc!.claimBindings as ClaimBindingRow[] | null | undefined) ?? []
    const { claims, sources } = await resolveClaimGraphBatch(payload, [bindings], req, stats)
    return evaluateTransactionClaimTrustOk(bindings, claims, sources, {
      transactionContentClass: doc!.contentClass,
    })
  } catch {
    return false
  }
}

/**
 * Evaluate many candidate transactions with one batched Claim/Source graph.
 * Returns a parallel boolean array (same length/order as `docs`).
 */
export async function liveEvaluatePublicTransactionsClaimTrust(
  payload: Payload,
  docs: Array<Record<string, unknown>>,
  req?: PayloadRequest,
  stats?: LivePublicTrustBatchStats,
): Promise<boolean[]> {
  if (stats) stats.candidateDocs = docs.length

  const results = docs.map(() => false)
  const graphDocs: Array<{ index: number; bindings: ClaimBindingRow[] }> = []

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    if (!passesStoredPublicGates(doc)) {
      if (stats) stats.gatedOutBeforeGraph += 1
      continue
    }
    graphDocs.push({
      index: i,
      bindings: (doc.claimBindings as ClaimBindingRow[] | null | undefined) ?? [],
    })
  }

  if (graphDocs.length === 0) return results

  try {
    const { claims, sources } = await resolveClaimGraphBatch(
      payload,
      graphDocs.map((g) => g.bindings),
      req,
      stats,
    )

    for (const g of graphDocs) {
      const doc = docs[g.index]
      const ok = evaluateTransactionClaimTrustOk(g.bindings, claims, sources, {
        transactionContentClass: doc.contentClass,
      })
      results[g.index] = ok
      if (ok && stats) stats.trustedDocs += 1
    }
  } catch {
    // Fail closed — leave all graphDocs as false
  }

  return results
}

/** Filter a candidate list after DB prefilter (`claimTrustOk` + public Where). */
export async function filterDocsByLivePublicClaimTrust(
  payload: Payload,
  docs: Array<Record<string, unknown>>,
  req?: PayloadRequest,
  stats?: LivePublicTrustBatchStats,
): Promise<Array<Record<string, unknown>>> {
  const flags = await liveEvaluatePublicTransactionsClaimTrust(payload, docs, req, stats)
  return docs.filter((_, i) => flags[i])
}

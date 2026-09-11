/**
 * Recompute denormalized claimTrustOk for transactions after claim/source changes.
 */
import type { Payload, PayloadRequest } from 'payload'

import type { ClaimDocLike } from '@/lib/claims/claim-trust'
import { evaluateTransactionClaimTrustOk } from '@/lib/claims/validate-claim-publication'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

function relationId(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return null
}

export async function resolveClaimGraph(
  payload: Payload,
  bindings: Array<{ claim?: unknown }> | null | undefined,
  req?: PayloadRequest,
): Promise<{
  claims: Map<string, ClaimDocLike>
  sources: Map<string, SourceDocLike>
}> {
  const claims = new Map<string, ClaimDocLike>()
  const sources = new Map<string, SourceDocLike>()

  for (const row of bindings ?? []) {
    // Always re-fetch by id — never trust in-memory/populated snapshots for trust decisions.
    const id = relationId(row.claim)
    if (!id) continue
    let claim: ClaimDocLike | null = null
    try {
      claim = (await payload.findByID({
        collection: 'claims',
        id,
        depth: 0,
        // Public + publication trust must evaluate the published row, not a stale draft snapshot.
        draft: false,
        overrideAccess: true,
        req,
      })) as ClaimDocLike
    } catch {
      continue
    }
    if (claim?.id == null) continue
    claims.set(String(claim.id), claim)

    for (const ev of claim.evidence ?? []) {
      const sid = relationId(ev.source)
      if (!sid || sources.has(sid)) continue
      try {
        const src = await payload.findByID({
          collection: 'sources',
          id: sid,
          depth: 0,
          draft: false,
          overrideAccess: true,
          req,
        })
        sources.set(sid, src as SourceDocLike)
      } catch {
        // missing — trust eval reports
      }
    }
  }

  return { claims, sources }
}

export async function recomputeTransactionClaimTrustOk(
  payload: Payload,
  transactionId: number | string,
  req?: PayloadRequest,
): Promise<boolean> {
  const doc = (await payload.findByID({
    collection: 'transactions',
    id: transactionId,
    depth: 0,
    draft: true,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>

  const bindings =
    (doc.claimBindings as Array<{ claim?: number | string | ClaimDocLike | null; required?: boolean }> | null) ??
    []
  const { claims, sources } = await resolveClaimGraph(payload, bindings, req)
  const ok = evaluateTransactionClaimTrustOk(bindings, claims, sources, {
    transactionContentClass: doc.contentClass,
  })

  const prev = doc.claimTrustOk === true
  if (prev !== ok) {
    const isPublished = doc._status === 'published'
    await payload.update({
      collection: 'transactions',
      id: transactionId,
      data: { claimTrustOk: ok },
      // Published live row must flip immediately for public fail-closed.
      draft: !isPublished,
      overrideAccess: true,
      context: { claimTrustRecompute: true },
      req,
    })
  }
  return ok
}

/** After claim change: refresh all published/approved txs that bind this claim. */
export async function recomputeClaimTrustForClaimId(
  payload: Payload,
  claimId: number | string,
  req?: PayloadRequest,
): Promise<void> {
  const found = await payload.find({
    collection: 'transactions',
    depth: 0,
    draft: true,
    limit: 100,
    overrideAccess: true,
    req,
    where: {
      'claimBindings.claim': { equals: claimId },
    },
  })
  for (const doc of found.docs) {
    await recomputeTransactionClaimTrustOk(payload, doc.id, req)
  }
}

/** After source change: refresh txs bound to claims that cite this source. */
export async function recomputeClaimTrustForSourceId(
  payload: Payload,
  sourceId: number | string,
  req?: PayloadRequest,
): Promise<void> {
  const claims = await payload.find({
    collection: 'claims',
    depth: 0,
    draft: true,
    limit: 100,
    overrideAccess: true,
    req,
    where: {
      'evidence.source': { equals: sourceId },
    },
  })
  for (const claim of claims.docs) {
    await recomputeClaimTrustForClaimId(payload, claim.id, req)
  }
}

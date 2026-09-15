/**
 * Batched Claim/Source graph resolution for public (and admin) trust evaluation.
 *
 * Never trusts populated relationship snapshots — always re-fetches published rows.
 * Missing claims/sources stay absent from Maps → evaluateTransactionClaimTrustOk fail-closed.
 */
import type { Payload, PayloadRequest, Where } from 'payload'

import type { ClaimDocLike } from '@/lib/claims/claim-trust'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

const ID_CHUNK = 200

export type ClaimBindingLike = {
  claim?: unknown
  required?: boolean | null
  coveredSection?: string | null
}

export type ClaimGraphBatchStats = {
  uniqueClaimIds: number
  uniqueSourceIds: number
  claimQueries: number
  sourceQueries: number
  /** findByID fallback counters (0 on the primary `find` + `id in` path). */
  claimFindByIdCalls: number
  sourceFindByIdCalls: number
}

export function createClaimGraphBatchStats(): ClaimGraphBatchStats {
  return {
    uniqueClaimIds: 0,
    uniqueSourceIds: 0,
    claimQueries: 0,
    sourceQueries: 0,
    claimFindByIdCalls: 0,
    sourceFindByIdCalls: 0,
  }
}

export function relationId(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return null
}

function chunkIds(ids: string[]): string[][] {
  if (ids.length === 0) return []
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    out.push(ids.slice(i, i + ID_CHUNK))
  }
  return out
}

function collectClaimIds(bindings: Array<ClaimBindingLike> | null | undefined): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const row of bindings ?? []) {
    const id = relationId(row.claim)
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function toPayloadId(id: string): string | number {
  return /^\d+$/.test(id) ? Number(id) : id
}

/**
 * Resolve Claims + Sources for one or many transaction binding sets in as few
 * Payload queries as possible (unique IDs across the whole set).
 */
export async function resolveClaimGraphBatch(
  payload: Payload,
  bindingSets: Array<Array<ClaimBindingLike> | null | undefined>,
  req?: PayloadRequest,
  stats?: ClaimGraphBatchStats,
): Promise<{
  claims: Map<string, ClaimDocLike>
  sources: Map<string, SourceDocLike>
}> {
  const claims = new Map<string, ClaimDocLike>()
  const sources = new Map<string, SourceDocLike>()

  const claimIdSet = new Set<string>()
  for (const bindings of bindingSets) {
    for (const id of collectClaimIds(bindings)) {
      claimIdSet.add(id)
    }
  }

  const claimIds = [...claimIdSet]
  if (stats) stats.uniqueClaimIds = claimIds.length

  for (const chunk of chunkIds(claimIds)) {
    if (stats) stats.claimQueries += 1
    const found = await payload.find({
      collection: 'claims',
      depth: 0,
      limit: chunk.length,
      overrideAccess: true,
      req,
      // Published live rows only (do not pass draft:false on find — use _status).
      where: {
        and: [
          { id: { in: chunk.map(toPayloadId) } },
          { _status: { equals: 'published' } },
        ],
      } satisfies Where,
    })
    for (const doc of found.docs) {
      if (doc?.id == null) continue
      claims.set(String(doc.id), doc as ClaimDocLike)
    }
  }

  const sourceIdSet = new Set<string>()
  for (const claim of claims.values()) {
    for (const ev of claim.evidence ?? []) {
      const sid = relationId(ev.source)
      if (sid) sourceIdSet.add(sid)
    }
  }

  const sourceIds = [...sourceIdSet]
  if (stats) stats.uniqueSourceIds = sourceIds.length

  for (const chunk of chunkIds(sourceIds)) {
    if (stats) stats.sourceQueries += 1
    const found = await payload.find({
      collection: 'sources',
      depth: 0,
      limit: chunk.length,
      overrideAccess: true,
      req,
      where: {
        and: [
          { id: { in: chunk.map(toPayloadId) } },
          { _status: { equals: 'published' } },
        ],
      } satisfies Where,
    })
    for (const doc of found.docs) {
      if (doc?.id == null) continue
      sources.set(String(doc.id), doc as SourceDocLike)
    }
  }

  return { claims, sources }
}

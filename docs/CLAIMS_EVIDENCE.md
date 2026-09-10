# Claim / Evidence architecture

**Status:** P0-05A storage + P0-05B1 claim trust / publication safety implemented — awaiting owner review.

**Migrations:**
- `20260721_051000_p0_05a_claims_foundation`
- `20260721_120000_p0_05b1_claim_trust_publication`

**Related:** [CONTENT_MODEL.md](./CONTENT_MODEL.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

## Trust chain

```text
Transaction
  → required Claim bindings (claimBindings)
  → Claim evidence → Source
  → evaluateClaimTrust / evaluateSourceTrust
  → claimTrustOk (denormalized cache / query prefilter ONLY)
  → LIVE public re-evaluation (final authority) before exposure
```

## IMPLEMENTED

### P0-05A (storage)
- First-class `claims` collection (does not replace `sources`)
- Canonical claim statuses including **UNKNOWN** and **CONFLICTED**
- Claim-level `publicationPermission`
- Evidence array linking to Sources with relation types
- Verification governance (researchers cannot forge VERIFIED / PUBLIC stamps)

### P0-05B1 (publication safety)
- **Central claim trust policy** (`evaluateClaimTrust`) → `AUTHORITATIVE` | `WARNING_ONLY` | `BLOCKED`
- **Central source trust** for claim evidence (`evaluateSourceTrust`) — no invented freshness windows
- **Transaction binding:** `claimBindings[]` (required claim + optional `coveredSection`)
- **Approve/publish gate:** required bindings must be `AUTHORITATIVE`; unbound fails closed
- **Dynamic fail-closed:** claim/source `afterChange` recomputes `claimTrustOk`; public Where uses `claimTrustOk === true` as a **prefilter only**
- **Live public trust authority:** `liveEvaluatePublicTransactionClaimTrust` re-resolves Claims/Sources on public loaders + anonymous `afterRead` — stored `claimTrustOk` alone never authorizes public guidance
- Existing section-level Source evidence gate retained and composed with claim policy

### About `claimTrustOk`

`claimTrustOk` remains useful for editorial visibility, fast DB filtering, and detecting trust-state changes. **It is not the final public trust authority.** Public exposure requires stored `claimTrustOk === true` **and** a successful live AUTHORITATIVE evaluation of required bindings. Live validation never overrides a false stored gate.

## NOT IMPLEMENTED

- Evidence-bound Decision Engine / guide rule activation
- Citizen-facing UNKNOWN / CONFLICTED / warning UI (P0-05B2)
- Golden Demo / real Syrian government claim content
- Per-document / per-step / per-fee claim retrofit
- Separate Evidence collection
- Deploy

## Binding level (why transaction-level)

P0-05B1 binds claims at the **transaction** (with optional section hint) so publication governance can fail closed without retrofitting every nested field. Section-level refinement and Decision Engine binding are deferred to later phases.

## Legacy / unbound

Existing transactions without required claim bindings are **not** treated as trusted. Approve/publish requires ≥1 required binding. Published rows without a successful gate keep `claimTrustOk` false/null and stay off the public surface. CMS draft editing remains possible.

## Next (P0-05B2 recommendation)

1. Citizen-safe rendering for WARNING_ONLY / UNKNOWN / CONFLICTED
2. Optional section suppression messaging (without inventing authoritative values)
3. Editorial review queues for OUTDATED / NEEDS_REVIEW claims
4. Keep Decision Engine MATCH/NO_MATCH/UNKNOWN logic unchanged until evidence-bound rules are designed

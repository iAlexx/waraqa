# Editorial Workflow (Phase 4)

**Status:** COMPLETE — OWNER APPROVED  
**Branch:** `phase-4-editorial-workflow`  
**Base:** Phase 3 `phase-3-complete` (`461a229`)  
**Tag:** `phase-4-complete`  
**QA:** `docs/qa/phase-4/approved/` (Rounds 02–04)

## Three concepts

| Concept | Field | Values |
| --- | --- | --- |
| Publication | `_status` | `draft` \| `published` |
| Editorial | `workflowState` | `draft` → `in_review` → `changes_requested` → `approved` → `published` (+ `archived`) |
| Verification health | computed + `markedOutdated` | `unverified` \| `current` \| `review_due` \| `outdated` |

Do not overload `_status` with editorial meanings. Raw `workflowState` assignment via REST/Admin is rejected; use `/api/transactions/:id/workflow/:action`.

## Transition table

| From | Action | To | Roles |
| --- | --- | --- | --- |
| draft | submitForReview | in_review | researcher, reviewer, admin |
| changes_requested | resubmitForReview | in_review | researcher, reviewer, admin |
| in_review | requestChanges | changes_requested | reviewer, admin (comment required) |
| in_review | approve | approved | reviewer, admin |
| approved | publish | published | reviewer, admin |
| published | unpublish | approved | reviewer, admin |
| * (non-archived) | archive | archived | admin (reason required) |
| archived | restoreArchived | draft | admin |
| published | markOutdated | published | reviewer, admin |

Service: [src/lib/workflow/transaction-workflow.ts](../src/lib/workflow/transaction-workflow.ts)

## Approval fingerprint

SHA-256 of canonical critical content ([content-fingerprint.ts](../src/lib/workflow/content-fingerprint.ts)). Critical edits while approved → `workflowState=draft` and clearance of approval fields + `approval_invalidated` audit. `internalNotes` does not invalidate.

Publish requires matching `approvedContentHash`.

## Source evidence

On approve/publish: ≥1 source, ≥1 primary; each source active + `verificationStatus=verified` + HTTP(S) URL; `coveredSections` must cover populated critical sections. No URL fetching.

**P0-05B1 claim gate (after source evidence):** ≥1 required `claimBindings` row; each required claim must evaluate `AUTHORITATIVE` (`evaluateClaimTrust`). Unbound transactions fail closed. `WARNING_ONLY` never satisfies required bindings. On success sets `claimTrustOk=true`. Claim/source changes recompute `claimTrustOk`; public `Where` requires `claimTrustOk === true` (transaction unavailable — no citizen warning UI yet).

## Review scheduling

`reviewDueAt = lastReviewedAt + (reviewIntervalDays ?? site-settings.verificationPolicyDays)`. Health computed at read time. Admin override requires reason + audit. No cron in Phase 4.

## Public visibility

**Primary (query / access layer)** — `publicTransactionRead` → `getPublicTransactionWhere()` on `transactions` only:

```ts
{
  and: [
    { _status: { equals: 'published' } },
    { active: { equals: true } },
    { markedOutdated: { not_equals: true } },
    { workflowState: { not_equals: 'archived' } },
    { claimTrustOk: { equals: true } },
    { contentClass: { in: getPubliclyAllowedContentClasses() } }, // P0-06
  ],
}
```

Anonymous list queries for archived, manually outdated, claim-trust-failed, or disallowed `contentClass` records must return `docs: []` and `totalDocs: 0`. Find-by-ID must not expose those documents. Sources use `publicSourceRead` (published + active + contentClass). Other collections keep `publicPublishedRead` (`published` + `active` only) because they lack workflow/contentClass fields.

**P0-06:** see [CONTENT_ISOLATION.md](./CONTENT_ISOLATION.md) — **IMPLEMENTED** field/governance/public filters; **NOT** bulk promote UI / demo host.

`claimTrustOk` in Where is a **fast prefilter only**. Public loaders and anonymous `afterRead` also run live Claim/Source trust (`liveEvaluatePublicTransactionClaimTrust`). Manual/`overrideAccess` setting of `claimTrustOk=true` cannot bypass that live gate.

**Defense in depth only** — `stripPrivateEditorialFields` (`afterRead`) may still null archived/outdated/`claimTrustOk !== true` docs and strip private fields. It is **not** the primary exclusion mechanism. GraphQL remains disabled.

## Rule validation

Phase 8 adds `questions`, `variants`, `notices`, and `decisionRules` on `transactions` with `validateGuideOnTransaction` — see [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md).

## Concurrency

Optional `expectedUpdatedAt` → HTTP 409 on stale updates.

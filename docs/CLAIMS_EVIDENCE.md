# Claim / Evidence architecture (P0-05A)

**Status:** P0-05A foundation implemented — awaiting owner review before enforcement work.

**Migration:** `20260721_051000_p0_05a_claims_foundation`

**Related:** [CONTENT_MODEL.md](./CONTENT_MODEL.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

## Trust chain (target)

```text
Claim → Evidence/Sources → Status → Reviewer/verification → Validity → Conflict state
  → Publication permission → (later) rule activation / public guidance
```

## IMPLEMENTED NOW

- First-class `claims` collection (does not replace `sources`)
- Canonical claim statuses including **UNKNOWN** and **CONFLICTED** as first-class values
- Claim-level `publicationPermission` stored as data only
- Evidence array linking to existing Sources with relation types (`SUPPORTS`, `CONTRADICTS`, …)
- Conflict representation = one claim with both supporting and contradicting evidence + `status = CONFLICTED`
- UNKNOWN representation = `status = UNKNOWN` without fabricated fee/value placeholders
- Optional owning `transaction` + optional `scopeKind`/`scopeKey` for later field/rule binding
- Active-user-aware RBAC (researchers create/edit research-stage; reviewers/admins review; inactive denied)
- **Verification governance:** researchers cannot set `VERIFIED`, forge `reviewedBy`/`verifiedAt`, or grant `PUBLIC` / `PUBLIC_WITH_WARNING` / `BLOCKED`. Transition into `VERIFIED` stamps `reviewedBy` + `verifiedAt` server-side from the authenticated active reviewer/admin.
- Pure validation (`validateClaimData`) + Payload `beforeValidate` governance
- Tracked Postgres migration + generated Payload types

## NOT IMPLEMENTED YET

- Fail-closed public transaction publication based on claim state / permission (**P0-05B**)
- Evidence-bound Decision Engine rule activation
- Retrofitting every transaction field / guide effect with claim IDs
- Automatic stale-source blocking
- Claim review queues / citizen-facing conflict or unknown warnings
- Golden Demo / real Syrian government claim content
- Deploy to Supabase/Vercel

## Next migration path (P0-05B recommendation)

1. Enforce `publicationPermission` + claim status gates on public loaders (not Admin CMS alone).
2. Optionally require critical transaction sections / guide rules to reference VERIFIED (or allowed) claims before publish.
3. Surface UNKNOWN/CONFLICTED safely in public copy without inventing values.
4. Keep Sources as artifacts; Claims as assertable facts.

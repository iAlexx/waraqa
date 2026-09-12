# Phase 10 Completion Report â€” User Reports (Closure Hardening)

**Date:** 2026-09-13  
**Commit message:** `fix: harden phase 10 user report workflow`  
**Authoritative SHA:** `375e4340b97d430b07febf5430476a3c6d0fd7ea`  
**Baseline Phase 10 feature commit:** `91747a52e3d91104258fe1c559409597d4036c4e`  
**Prior baseline (P11-C):** `e01bdea`

## Summary

Closed all forensic blockers from `WARAQA_PHASE_10_REVIEW.zip` in one hardening pass: IP-only rate-limit identity, resolution stamp integrity, fail-closed editorial audit history, early request size/content-type gates, roadmap form fields (`encountered` + optional validated `serviceCenter`), client-only success UX, awaited opportunistic bucket cleanup, safer migrations (RESTRICT FK, no bare `WHEN others`), credential-free review archive V2, and full browser/E2E with healthy Postgres.

## Blockers fixed

1. **Rate-limit identity** â€” primary bucket = HMAC of trusted proxy IP only (UA excluded); raw IP never stored; missing/malformed IP fail-closed (503).
2. **Resolution metadata** â€” stamp `resolvedAt`/`resolvedBy`/`resolutionSummary` only on enter closed; stay-closed edits preserve stamps; reopen clears stamps and keeps `lastResolutionSummary`.
3. **Audit reliability** â€” editorial status transitions write `audit-events` before persist; audit failure aborts update; recoverable sanitized `resolutionReason` in metadata; citizen `report_received` remains best-effort (documented).
4. **Request gates** â€” multipart/non-JSON rejected before body parse; Content-Length + max body size enforced.
5. **Roadmap form gap** â€” separate `encountered`; optional `serviceCenter` validated against Transaction centers.
6. **Success integrity** â€” no forgeable `?sent=1`; client success state only.
7. **Serverless cleanup** â€” opportunistic cleanup awaited when selected; still non-fatal.
8. **Migration safety** â€” no `EXCEPTION WHEN others` on audit enums; Transaction FK `ON DELETE RESTRICT`; audit enum down irreversibility documented.
9. **ZIP hygiene** â€” deleted leaked local credential files and old review ZIP; V2 archive from tracked files only + scanned.

## Schema / MVP differences vs roadmap Â§12 / Â§14.13

| Roadmap field | Phase 10 decision |
| --- | --- |
| what appears incorrect | `message` (required) |
| what the user encountered | `encountered` (required) |
| reportedValue / suggestedValue | **Intentionally omitted** â€” collapsed into `message` + `encountered` |
| serviceCenter | Optional; server accepts only centers linked to the target Transaction |
| assignedTo | **Deferred to Phase 11** |
| attachments | Not supported |

## Rate-limit design

- Trusted identity: Vercel/`x-forwarded-for` left-most or `x-real-ip` (documented); no client identity token.
- Bucket key: `HMAC-SHA256(PAYLOAD_SECRET, report-rl:v2|ip|<ip>)` then SHA-256 truncated (48 hex); UA never part of key.
- Store: PostgreSQL `report_rate_buckets`; 1h window; max 5; raw IP never persisted.
- Fail-closed if IP untrustworthy â†’ HTTP 503.
- Cleanup: ~5% of requests await opportunistic delete (>7 days); failures ignored.

## Audit / history design

- Reuses `audit-events` only (no second framework).
- Editorial transitions: actor + from/to status + sanitized `resolutionReason` when closing; write in `beforeChange`; failure â†’ no silent terminal state.
- Citizen `report_received`: best-effort; submit succeeds even if that audit row fails (intentional resilience).
- Contact never logged in audit metadata.

## Migration safety

- `20260912_220000_phase_10_user_reports` + `20260912_233000_phase_10_report_hardening`.
- Service-center FK â†’ `svc_centers`.
- Transaction FK â†’ `ON DELETE RESTRICT` (immutable report history).
- Audit enum values: `ADD VALUE IF NOT EXISTS`; **down cannot safely remove enum values** â€” documented.

## Security model (delta)

- JSON-only public POST; early multipart/size reject.
- Honeypot unchanged (success without persistence).
- Success UX not derived from query params.

## Test counts (fresh gates)

- Unit: **340**
- Integration: **117**
- Lint / typecheck / build: **PASS**
- Playwright Phase 10 public + admin closure: **PASS** (demo mode + `PHASE10_E2E_TX_SLUG=qa-p8-r1-tx-guide`)

## Browser / Admin QA (DB healthy)

Public: CTA â†’ form â†’ service-center optional â†’ valid submit â†’ client success; no sensitive URL; honeypot success without persistence; forged `?sent=1` shows form not success; 360/1440/RTL/keyboard/overflow covered by E2E; no app console errors on happy path.

Admin: reviewer can open reports; researcher denied; admin audit-events visible; 768 tablet smoke; resolution/history covered by integration + triage hooks.

## Credential / archive hygiene

- Deleted: `docs/qa/phase-3/.local-credentials`, `docs/qa/phase-4/.local-credentials`, `docs/qa.zip`, prior `WARAQA_PHASE_10_REVIEW.zip` (values never printed).
- Regenerated local gitignored credentials for Admin QA only (not archived).
- Review archive: `WARAQA_PHASE_10_REVIEW_V2.zip` from tracked files; scanned for credential/secret patterns.

## Deferred (non-blocking)

1. Email notifications when a safe adapter exists.
2. Later Phase 11 Admin UX (dashboards, assignment, etc.).

## Forensic self-audit

| Source | Result |
| --- | --- |
| Master Roadmap Â§12 public form | PASS (encountered + optional service center) |
| Master Roadmap Â§14.13 schema | PASS with documented MVP collapses above |
| Phase 10 tasks / acceptance | PASS |
| P0-03 / P0-05 / P0-06 | PASS (eligibility + content class isolation unchanged) |

## Verdict

**PHASE 10 COMPLETE**

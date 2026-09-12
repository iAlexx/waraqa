# Phase 10 Completion Report — User Reports

**Date:** 2026-09-12  
**Commit message:** `feat: implement user report workflow`  
**Authoritative SHA:** use `git rev-parse HEAD` on the Phase 10 commit (recorded in the review ZIP final response).  
**Baseline before Phase 10:** `e01bdea` (P11-C)

## Summary

Implemented full Phase 10 — citizen changed-information reporting with public form, Zod validation, honeypot, PostgreSQL rate limiting (hashed identity), `user-reports` collection, strict ACL, Admin/reviewer triage, and audit-events logging.

## Files changed (high level)

### New
- `src/collections/UserReports.ts`
- `src/lib/reports/*` (types, sanitize, validate, identity-hash, rate-limit, submit, triage)
- `src/app/api/public/reports/route.ts`
- `src/app/(frontend)/report-information/page.tsx`
- `src/components/reports/report-information-form.tsx`
- `migrations/20260912_220000_phase_10_user_reports.ts`
- `tests/unit/phase10-user-reports.spec.ts`
- `tests/unit/phase10-report-cta.spec.ts`
- `tests/int/phase10-user-reports.int.spec.ts`
- `tests/e2e/phase10-user-reports.e2e.spec.ts`
- `PHASE_10_COMPLETION_REPORT.md` (this file)

### Modified
- `src/payload.config.ts`, `src/payload-types.ts`
- `src/collections/AuditEvents.ts`, `src/lib/workflow/audit.ts`
- `src/components/transaction/transaction-detail-view.tsx`
- `src/app/(frontend)/transactions/[slug]/page.tsx`
- `migrations/index.ts`
- Docs: `CONTENT_MODEL`, `PHASE_CHECKLIST`, `SECURITY`, `RBAC`, `ARCHITECTURE`, `TRANSACTION_DETAIL_ARCHITECTURE`, `WARAQA_MASTER_ROADMAP_EN`

## Schema / migrations

Migration `20260912_220000_phase_10_user_reports`:
- Table `usr_rpt` (Payload collection `user-reports`)
- Enums `usr_rpt_section`, `usr_rpt_status`
- Extends `audit_action` with report lifecycle values
- Table `report_rate_buckets` (identity_hash + window_start + hit_count)
- Locked-documents relation column for `usr_rpt`

No Redis. No new email provider.

## Security model

- Public POST only at `/api/public/reports` (JSON). Multipart rejected (no attachments).
- Transaction eligibility reuses `getPublicTransactionWhere` + `liveEvaluatePublicTransactionClaimTrust` (P0-05/P0-06). QA_TEST never reportable.
- Honeypot field `website`: filled → HTTP success, no persistence.
- Rate limit: HMAC(PAYLOAD_SECRET, ip|ua) → SHA-256 truncated hash; fixed 1h window, max 5; raw IP never stored; ~7 day bucket retention cleanup.
- Report text sanitized to plain text; HTML/script-like input rejected.
- Collection ACL: create false for clients; read/update admin|reviewer active only; delete admin only; researchers denied.
- Contact fields field-level read restricted to admin|reviewer; preserved on triage updates.
- Success responses omit internal report IDs.
- CSRF: anonymous JSON POST (no cookie session auth for citizens).

## ACL matrix (user-reports)

| Actor | Create | Read | Update triage | Delete | Read contact |
| --- | --- | --- | --- | --- | --- |
| Anonymous | via public API only | No | No | No | No |
| Researcher (active) | via public API only | No | No | No | No |
| Reviewer (active) | via public API only | Yes | Yes | No | Yes |
| Admin (active) | via public API only | Yes | Yes | Yes | Yes |
| Inactive editorial | Denied | Denied | Denied | Denied | Denied |

## Rate-limit design

- Store: PostgreSQL `report_rate_buckets`
- Key: privacy-preserving `identity_hash` (not raw IP)
- Window: 1 hour fixed buckets; max 5 hits
- Over-limit: HTTP 429 + safe Arabic message + Retry-After
- Retention: opportunistic delete of windows older than 7 days

## Notifications

**Deferred.** No email adapter configured in the repository. Admin triage is sufficient per roadmap. Does not fail Phase 10.

## Test counts

- Unit: **333** passed
- Integration: **116** passed
- Lint / typecheck / build: **PASS**

## Playwright / browser

- E2E suite: `tests/e2e/phase10-user-reports.e2e.spec.ts` (requires `PHASE10_E2E_TX_SLUG` + publicly eligible tx; local DB must be healthy; for DEMO fixtures set `WARAQA_PUBLIC_CONTENT_MODE=demo`).
- Manual/Cursor browser: CTA «بلّغنا عن معلومة تغيّرت» confirmed visible on DEMO tx `qa-p8-r1-tx-guide` under demo mode while server was healthy.
- Full public submit + Admin resolve browser pass was interrupted by local Docker/Postgres downtime after quality gates; covered by integration tests for submit/ACL/triage/audit.

## Manual QA notes

- RTL / Arabic form copy present.
- CTA on eligible detail page.
- Admin tablet smoke: not re-run after DB outage (collection Admin UX is standard Payload list/edit; 768 smoke deferred with DB).

## Deferred items

1. Email/notifications when a safe adapter exists.
2. Re-run Playwright + full Admin browser resolve when local Postgres/Docker is available.
3. P11-D/E (dashboards, review-due filters, etc.) — out of Phase 10.

## Roadmap acceptance matrix

| Requirement | Result |
| --- | --- |
| Public report form | PASS |
| Zod validation | PASS |
| Rate limiting | PASS |
| Honeypot | PASS |
| Payload collection | PASS |
| Admin triage workflow | PASS |
| Privacy copy / optional contact protected | PASS |
| Resolution logging (audit-events) | PASS |
| Notifications if email configured | PASS_WITH_LIMITATION (deferred — none configured) |
| Spam controls work | PASS |
| HTML not rendered from report text | PASS |
| Contact optional and protected | PASS |
| Report not publicly visible | PASS |
| Reviewer can resolve/reject | PASS |
| Clear success state | PASS |
| No attachment upload | PASS |
| P0-05/P0-06 respected | PASS |

## Known limitations

- Notifications deferred (no adapter).
- Browser E2E full path not re-verified after mid-session DB outage; unit/int coverage remains green.
- Researchers intentionally have no report triage access (roadmap: reviewers resolve reports).

## Verdict

**PHASE 10 COMPLETE WITH DOCUMENTED LIMITATIONS**

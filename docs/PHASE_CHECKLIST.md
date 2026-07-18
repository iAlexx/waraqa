# Phase Checklist

Track roadmap phases. Mark gates only when acceptance criteria are actually met.

| Phase | Name | Status | Gate |
| --- | --- | --- | --- |
| 0 | Decisions and Compatibility Audit | **COMPLETE — OWNER APPROVED** | Versions compatible; docs present; no feature code; no deps installed; owner amendments reflected |
| 1 | Project Bootstrap | **COMPLETE — OWNER APPROVED** | App starts; admin loads; DB connects; lint/typecheck/test/build/e2e pass |
| 2 | Design System and RTL Foundation | **COMPLETE — OWNER APPROVED** | Tokens, components, RTL, a11y, showcase, screenshots + automated gates; wordmark colors corrected |
| 3 | Core Payload Collections | **COMPLETE — OWNER APPROVED** | Collections + full `transactions` model + Site Settings + RBAC + migrations + Round 01 QA approved |
| 4 | Transactions Schema and Workflow | **NOT STARTED** | Workflow only on existing `transactions` model — **must not** duplicate schema; includes Admin UI polish debt |
| 5 | Public Shell and Home Page | Not started | Disclaimer, search entry, RTL; Site Settings public consumption |
| 6 | Search and Categories | Not started | Aliases; published only |
| 7 | Transaction Page | Not started | Sources + verification dates |
| 8 | Interactive Guide Engine | Not started | Pure domain logic + tests |
| 9 | Guide and Result UX | Not started | Checklist, print, share |
| 10 | Reporting Changed Information | Not started | Rate limit; no file uploads |
| 11 | Preview, Revalidation, SEO | Not started | Draft safe; sitemap; robots |
| 12 | Seeds and Five Procedures | Not started | Labeled demo vs verified |
| 13 | Hardening, A11y, Performance | Not started | Full test matrix |
| 14 | Production Deploy and Demo | Not started | Prod URL; secrets safe; smoke tests |

## Phase 0 / 1

- [x] Owner APPROVED

## Phase 2 deliverables

- [x] Design tokens + typography + `docs/DESIGN_SYSTEM.md`
- [x] UI primitives (button through progress)
- [x] Header/footer shells, skip link, geometric utility
- [x] Dev-only `/dev/design-system` showcase (production `notFound`)
- [x] Component + E2E + a11y tests
- [x] QA screenshots under `docs/qa/phase-2/` (Round 05 approved)
- [x] Automated gates PASS (lint/typecheck/test/int/build/e2e)
- [x] Owner visual approval (wordmark not red; green / ivory / ink)
- [x] Commit `feat: complete phase 2 design system and rtl foundation`
- [x] Annotated tag `phase-2-complete`

## Phase 3 deliverables

**Status: COMPLETE — OWNER APPROVED**

**Scope reconciliation (Outcome A):** Full `transactions` content model is part of Phase 3; Site Settings minimal global is part of Phase 3 (public consumption = Phase 5). Phase 4 must not rebuild or duplicate the `transactions` schema — workflow extensions only. Phase 4 has **not started**.

- [x] Collections: `users`, `categories`, `agencies`, `service-centers`, `documents`, `sources`, `transactions`
- [x] Site Settings minimal global (`site-settings`: siteName, tagline, independenceDisclaimer, footerDisclaimer, contactEmail, supportPhone, verificationPolicyDays, maintenanceMode, featuredTransactions) — public UI = Phase 5
- [x] Localization `ar` / `en` (default `ar`) + drafts/versions on content collections
- [x] RBAC roles `admin` | `reviewer` | `researcher` | `viewer` + first-user admin bootstrap
- [x] Server-side publish enforcement (researcher cannot publish via API)
- [x] Public read: published + active only; `internalNotes` private
- [x] Admin-only delete; audit fields (`createdBy`, `lastUpdatedBy`, `publishedBy`, `publishedAt`)
- [x] Full procedure field model on `transactions` (sources required to publish) — Outcome A
- [x] Migrations `20260718_052746_phase_3_core_collections` + `20260718_163635_phase_3_site_settings`
- [x] GraphQL disabled
- [x] Docs: `CONTENT_MODEL.md`, `RBAC.md`; architecture/security/checklist/README updates; Outcome A documented
- [x] Integration tests via `pnpm test:collections` / `pnpm test:int` (fictional data only)
- [x] QA Round 01 captures complete + owner-approved copy at `docs/qa/phase-3/approved/round-01-core-collections/`
- [x] Owner approval
- [x] Phase 3 commit
- [x] Annotated tag `phase-3-complete`

### Documented naming / scope decisions

1. Slug `transactions` (roadmap) vs owner preferred `procedures` — roadmap wins.
2. Owner editor/publisher → researcher ≈ editor; reviewer+admin publish.
3. Site Settings: Phase 3 **minimal** global; public consumption = Phase 5.
4. **Outcome A:** Full `transactions` content model in Phase 3 (owner-authorized). Phase 4 must not rebuild schema — workflow only (blocks, audit events, scheduled review, preview, approval invalidation).

## Phase 4 — Admin UI polish debt (non-blocking; NOT STARTED)

Owner-approved as **non-blocking** polish for Phase 4. Do **not** treat these as Phase 3 blockers. Do not implement during Phase 3 closure.

1. **Mixed English/Arabic Admin chrome** — Payload Admin still shows English strings such as: Create New, Search by, Columns, Filters, Updated At, Status, Last Modified, Save Draft, Publish changes, Select a value, Add Phone, Add Alias (alongside Arabic collection/field labels).
2. **Empty parent category display** — empty parent currently renders awkwardly (e.g. `<No التصنيف الأب>`). Desired: `بدون تصنيف أب` or `—`.
3. **Boolean list cells** — raw `true` / `false` in lists. Desired: Arabic نعم / لا badges.
4. **Admin login branding** — still uses default Payload logo and English form labels.

## Rules

- Phase 4 must not duplicate or re-implement the `transactions` schema (Outcome A).
- Do not modify Phase 2 brand/UI files as part of Phase 3 closure.
- Phase 2 QA archives under `docs/qa/phase-2/` remain untouched.

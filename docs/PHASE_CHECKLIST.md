# Phase Checklist

Track roadmap phases. Mark gates only when acceptance criteria are actually met.

| Phase | Name | Status | Gate |
| --- | --- | --- | --- |
| 0 | Decisions and Compatibility Audit | **COMPLETE — OWNER APPROVED** | Versions compatible; docs present; no feature code; no deps installed; owner amendments reflected |
| 1 | Project Bootstrap | **COMPLETE — OWNER APPROVED** | App starts; admin loads; DB connects; lint/typecheck/test/build/e2e pass |
| 2 | Design System and RTL Foundation | **COMPLETE — OWNER APPROVED** | Tokens, components, RTL, a11y, showcase, screenshots + automated gates; wordmark colors corrected |
| 3 | Core Payload Collections | **COMPLETE — OWNER APPROVED** | Collections + full `transactions` model + Site Settings + RBAC + migrations + Round 01 QA approved |
| 4 | Transactions Schema and Workflow | **COMPLETE — OWNER APPROVED** | Editorial workflow, audit, preview, access gates; Admin UX; QA Rounds 02–04 approved; tag `phase-4-complete` |
| 5 | Public Shell and Home Page | **COMPLETE — OWNER APPROVED** | Public shell, Site Settings consumption, home, states, a11y; QA Rounds 01–03 approved; tag `phase-5-complete` |
| 6 | Search and Categories | **COMPLETE — OWNER APPROVED** | Arabic search, ranking, filters, pagination, unique results; QA Rounds 01–03 approved; tag `phase-6-complete` |
| 7 | Transaction Page | **COMPLETE — OWNER APPROVED** | Sources + verification dates |
| 8 | Interactive Guide Engine | **TECHNICAL PASS** (owner visual may remain open) | Pure domain logic + tests |
| 9 | Guide and Result UX | Done (P9-A…P9-E; OS Print Preview **PASS** in Phase 13) | Checklist, persistence, print, WhatsApp, edit answers |
| 10 | Reporting Changed Information | **COMPLETE** (closure hardened) | Rate limit; no file uploads |
| 11 | Admin UX Refinement | Complete (P11-A/B/C + dashboard + review-due + assignment + delete safety + tablet smoke) | See CONTENT_MODEL / PHASE_CHECKLIST |
| 12 | Seeds and Five Procedures | Complete (DEMO seed) | Five READY_FOR_DEMO; all contentClass=DEMO; governance path + forensic closure; see docs/content/PHASE_12_* |
| 13 | Hardening, A11y, Performance | **COMPLETE** | Full test matrix; Print Preview owner PASS; see Phase 13 section |
| 14 | Production Deploy and Demo | **14-A ENGINEERING READY** (not launched) | Env matrix + robots/sitemap + deploy docs; see Phase 14-A |

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

**Scope reconciliation (Outcome A):** Full `transactions` content model is part of Phase 3; Site Settings minimal global is part of Phase 3 (public consumption = Phase 5). Phase 4 must not rebuild or duplicate the `transactions` schema — workflow extensions only. Phase 4 is **COMPLETE — OWNER APPROVED**.

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

## Phase 4 — Editorial workflow

**Status: COMPLETE — OWNER APPROVED**

Branch `phase-4-editorial-workflow` from `phase-3-complete` (`461a229`).

- [x] Central workflow service + transitions (no raw workflowState spoofing)
- [x] Submit / request-changes / resubmit / approve / publish / unpublish / archive / restore
- [x] Critical fingerprint + approval invalidation
- [x] Source evidence coverage (`coveredSections`) gates on approve/publish
- [x] `audit-events` immutable collection + readable actor labels
- [x] Review scheduling helpers (`reviewDueAt` / verification health / mark outdated)
- [x] Public access query exclusion: draft / inactive / archived / outdated
- [x] Secure preview `/preview/transactions/[id]` + `PREVIEW_SECRET` (HMAC)
- [x] Revision restoration via workflow
- [x] Role/state-aware Arabic Admin workflow actions + confirmations
- [x] Read-only editorial/publication status cards; Arabic publication list cells
- [x] Reviewer notes panel + Arabic source-coverage Admin dialog
- [x] Waraqa Admin login branding (BrandMark + star motif)
- [x] Migration `20260718_234422_phase_4_editorial_workflow`
- [x] Unit + integration + e2e gates
- [x] Owner visual approval (QA Rounds 02–04 → `docs/qa/phase-4/approved/`)
- [x] Phase 4 commit / annotated tag `phase-4-complete`

## Phase 5 — Public shell and home

**Status: COMPLETE — OWNER APPROVED**

Branch `phase-5-public-shell-home` from `phase-4-complete` (`e0a0a375`).

### Implemented

- [x] Public header and footer (RTL `ar-SY`, skip link, independence badge)
- [x] Public Site Settings consumption (safe fields + Arabic fallbacks; private fields excluded)
- [x] Migration `20260719_034836_phase_5_site_settings_public_fields`
- [x] Home hero + native GET search-entry form (Phase 6 boundary placeholder `/search`)
- [x] Published category cards (public-safe; intentional empty state)
- [x] Eligible configured featured transactions (order preserved; draft/inactive/archived/outdated excluded)
- [x] How-it-works and trust sections (honest “قريباً” where later phases apply)
- [x] Loading, error, empty, maintenance, and no-JavaScript primary-content handling
- [x] Responsive accessible mobile navigation (checkbox drawer; Round 03 visual closure)
- [x] Arabic metadata + basic Open Graph (no Phase 11 sitemap/robots/revalidation)
- [x] Owner visual approval — approved QA under `docs/qa/phase-5/approved/`
- [x] Phase 5 completion commit / annotated tag `phase-5-complete`

### Not started (later phases)

- Phase 10 reporting flow
- Phase 11 full SEO, sitemap, robots, and revalidation

### Approved QA evidence

- `approved/round-02-owner-review-closure/` — complete (canonical no-JS / loading / featured)
- `approved/round-03-mobile-nav-visual-closure/` — complete (canonical mobile nav)
- `approved/round-01-public-shell-home-curated/` — curated baseline (superseded R01 shots excluded)
- Revision archives under `revisions/` remain unchanged

## Phase 6 — Arabic search

**Status: COMPLETE — OWNER APPROVED**

Branch `phase-6-search-engine-results` from `phase-5-complete` (`5fe07c82`).

### Implemented

- [x] `/search` results (SSR, RTL, empty / no-result / error / loading QA states)
- [x] Arabic normalization + deterministic ranking
- [x] `searchText` generation hook + migration `20260719_083000_phase_6_search_text`
- [x] Filters: category, agency, service center (published/active only)
- [x] Pagination (page size 10, candidate cap 200)
- [x] Public eligibility via `publicTransactionWhere` / `overrideAccess: false`
- [x] Idempotent Phase 6 QA fixture (`qa-p6-r1-*`) + document-ID dedupe defense
- [x] Full-width result cards (Round 02) + unique counts/IDs (Round 03)
- [x] Unit + integration + E2E coverage
- [x] Owner visual approval — approved QA under `docs/qa/phase-6/approved/`
- [x] Phase 6 completion commit / annotated tag `phase-6-complete`

### Not started (later phases)

- Phase 10 reporting
- Phase 11 full SEO / sitemap / robots / revalidation

### Approved QA evidence

- `approved/round-02-search-results-visual-closure/` — complete (canonical cards)
- `approved/round-03-duplicate-results-closure/` — complete (unique IDs / counts)
- `approved/round-01-search-engine-results-curated/` — curated baseline (superseded layout shots excluded)
- Revision archives under `revisions/` remain unchanged

See [SEARCH_ARCHITECTURE.md](./SEARCH_ARCHITECTURE.md).

## Phase 7 — Public transaction detail

**Status: COMPLETE — OWNER APPROVED**

Branch `phase-7-public-transaction-details` from `phase-6-complete` (`3ad7a08f`).

### Implemented

- [x] Public loader `loadPublicTransactionBySlug` (`overrideAccess: false` + `publicTransactionWhere`)
- [x] Explicit public DTO mapper (no raw Payload docs in React; private/editorial fields stripped)
- [x] `/transactions/[slug]` SSR Arabic RTL detail page (breadcrumbs, sections, disclaimer, sources)
- [x] Safe http(s) source links; optional sections omitted when empty
- [x] Basic Arabic + Open Graph metadata (no Phase 11 SEO system)
- [x] Search result CTA → real detail route (Phase 6 ranking/filters/pagination unchanged)
- [x] Hidden states (draft/inactive/archived/outdated/missing) → not-found (no existence leak)
- [x] Centered desktop reading rail (`max-w-5xl`) + polished section cards (Round 02)
- [x] Idempotent QA fixture `qa-p7-r1-*` + Round 01/02 revision evidence
- [x] Unit + integration + E2E coverage
- [x] Owner visual approval — approved QA under `docs/qa/phase-7/approved/`
- [x] Phase 7 completion commit / annotated tag `phase-7-complete`

### Not started (later phases)

- Phase 10 outdated-information reporting
- Phase 11 sitemap, robots, structured data, advanced revalidation

### Approved QA evidence

- `approved/round-02-transaction-detail-visual-closure/` — complete (canonical desktop width / cards / states)
- `approved/round-01-public-transaction-details-curated/` — curated baseline (superseded layout shots excluded)
- Revision archives under `revisions/` remain unchanged

See [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md).

## Phase 8 — Interactive guide

**Status: TECHNICAL PASS — AWAITING OWNER VISUAL APPROVAL**

Branch `phase-8-interactive-guide` from `phase-7-complete` (`8a73504`).

### Implemented

- [x] Additive guide fields on `transactions` (`guideEnabled`, questions, variants, notices, decision rules)
- [x] Stable `key` on questions/options/variants/docs/steps/fees/notices; migration + backfill
- [x] Pure rule evaluator (`evaluateGuide`) — operators, groups, effects, variant selection, fail closed
- [x] Admin validation + publish gate (`validateGuideOnTransaction`, `isPublicGuideAvailable`)
- [x] Public loader/DTO (`loadPublicGuideBySlug`, `mapPublicGuide`) — `overrideAccess: false`
- [x] `/transactions/[slug]/guide` — in-memory client Q&A + in-session result checklist
- [x] Phase 7 CTA «ابدأ الدليل التفاعلي» when eligible
- [x] Postgres migration `20260720_041000_phase_8_interactive_guide`
- [x] Unit + integration + E2E coverage; `qa-p8-r1-*` fixture + Round 01 QA inventory
- [x] Architecture doc [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md)

### Owner decisions (Phase 8)

- [x] Phase 8 shipped in-memory answers only (persistence deferred; see Phase 9)
- [x] No WhatsApp/print/export/accounts in Phase 8
- [x] Variants + `selectVariant`; conflicting variant keys fail validation

### Not started (later phases)

- Share permalinks / tokens (optional post–Phase 9)
- Phase 11 sitemap / structured data / advanced revalidation

## Phase 10 — User Reports (COMPLETE — closure hardened 2026-09-13)

- [x] Public CTA «بلّغنا عن معلومة تغيّرت» on publicly eligible Transactions only (P0-05/P0-06)
- [x] Arabic report form at `/report-information` (`message` + `encountered` + optional validated `serviceCenter`; no attachments; optional protected contact)
- [x] Zod + plain-text sanitization; honeypot; PostgreSQL rate limit (**IP-only** HMAC identity; UA excluded; fail-closed without trusted IP)
- [x] Collection `user-reports` with strict ACL (admin/reviewer triage; no public read)
- [x] Status lifecycle + resolution stamps only on enter closed; editorial audit fail-closed with recoverable `resolutionReason`
- [x] Early JSON/size request gates; client-only success UX (no forgeable `?sent=1`)
- [x] Migrations: RESTRICT Transaction FK; hardening migration; audit enum down irreversibility documented
- [x] Notifications deferred (no safe email adapter in repo)

See [CONTENT_MODEL.md](./CONTENT_MODEL.md) § `user-reports`, [SECURITY.md](./SECURITY.md), [PHASE_10_COMPLETION_REPORT.md](../PHASE_10_COMPLETION_REPORT.md).

## Phase 9 — Guide result UX (P9-A…P9-E)

- [x] P9-A: interactive local documents checklist + clear-all (in `GuideClient`)
- [x] P9-B: schema-versioned `localStorage` for answers + checklist (`waraqa:guide:<slug>`)
- [x] P9-C: browser-native A4 RTL print (`window.print` + `@media print`; preparation sheet only)
  - At Phase 9 accept: **PASS WITH PRINT-PREVIEW LIMITATION** (automated only).
  - **Phase 13 owner manual Print Preview:** **PASS** 2026-09-15 — see [qa/phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md](./qa/phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md).
- [x] P9-D: client-side WhatsApp share (`wa.me` text; public transaction URL only; no answers/checklist state)
- [x] P9-E: answer summary (**إجاباتك**) + per-answer **تعديل** + recalc / prune inapplicable answers
- [ ] Share permalinks / tokens (explicitly out of Phase 9 acceptance; deferred)

See [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md) §2.1–§2.4.

Phase 9 citizen acceptance (checklist, local progress, print, WhatsApp, edit answers) is implemented. **OS Print Preview** carry-over closed in Phase 13 (owner PASS 2026-09-15).

## Phase 11 — Admin UX Refinement — COMPLETE

- [x] **P11-A:** Transaction admin unnamed tabs + Arabic editorial help (schema shape / RBAC / public behavior unchanged). See [CONTENT_MODEL.md](./CONTENT_MODEL.md) § transactions Admin IA.
- [x] **P11-B:** Transaction Admin readiness panel (workflow publish readiness ≠ public eligibility; informational; server-enforced publish unchanged).
- [x] **P11-C:** Admin Decision Rule Preview (saved-guide only; canonical `evaluateGuide`; ephemeral answers; diagnostic firedRuleKeys).
- [x] **Dashboard:** Editorial BeforeDashboard + `/api/admin-ops/dashboard` (cheap counts; active admin/reviewer only).
- [x] **reviewDueAt UX:** List column + overdue/due-soon/future labels; native due filter; separate from publication readiness.
- [x] **Report assignment:** `assignedTo` + ACL + `report_assigned` audit (no contact PII); public cannot set.
- [x] **Safer delete/archive:** Server-enforced Transaction hard-delete policy; archive preferred; seed bypass explicit.
- [x] **Tablet Admin QA (768px):** Smoke coverage in `tests/e2e/phase11-admin-ux.e2e.spec.ts` (no critical overflow blockers).
- [x] Validation Arabic messages for assignment / unsafe delete / existing publish & triage paths.

### Deferred (non-blocking)

- Full Arabic Payload Admin chrome pack (documented Phase 4 debt).
- Notification system for report assignment.
- Giant analytics dashboard / claim-readiness widgets on dashboard load.
- Sitemap / robots / structured data / advanced revalidation (later SEO track — not Admin UX acceptance).

### QA evidence

- Unit: `tests/unit/phase11-admin-ux.spec.ts`, `tests/unit/phase11-transaction-delete.spec.ts`
- Integration: `tests/int/phase11-admin-ux.int.spec.ts`
- E2E: `tests/e2e/phase11-admin-ux.e2e.spec.ts` (+ prior P11-A/B/C and Phase 10 suites)

See [CONTENT_MODEL.md](./CONTENT_MODEL.md), [RBAC.md](./RBAC.md), [SECURITY.md](./SECURITY.md).

## Phase 12 — Seed Content — COMPLETE (DEMO)

- [x] Research five procedures from opened primary/near-primary sources (no fabrication)
- [x] Source audit: `docs/content/PHASE_12_SOURCE_AUDIT.md` (7 sources incl. SANA 2542861 + 2425127; forensic pass 2026-09-14)
- [x] Content review matrix: `docs/content/PHASE_12_CONTENT_REVIEW.md` — five READY_FOR_DEMO; CONFLICTED supplementary claim retained; not PRODUCTION
- [x] Claim-first model: Sources → Claims → DEMO Transactions + guides
- [x] All Phase 12 content `contentClass=DEMO` (not PRODUCTION / not QA_TEST)
- [x] No invented fees/addresses; fee amounts = NEEDS_OFFICIAL_CONFIRMATION; MFA durations only where page states them (POA/civil same day; marriage 15–25 min + workload); passport + equivalency processing duration absent
- [x] Equivalency: year-round intake + attestation chain (Anan); supplementary exams CONFLICTED across three SANA items
- [x] Idempotent seed: `scripts/phase12-seed-content.ts` (`WARAQA_ALLOW_PHASE12_SEED=1` + `ALLOW_QA_FIXTURE=1`, rejects production)
- [x] Governance path: seed never forges trust — claims scaffolded DRAFT/INTERNAL_ONLY then reviewer-verified; procedures publish via submitForReview → approve → publish (`claimTrustOk` / fingerprint computed by workflow)
- [x] Forensic closure: POA branches include company/minor/guardianship/other_special; marriage attendance nationality-dependent; deferred candidates still listed
- [x] Guide path matrices unit-tested; int/e2e coverage for DEMO isolation
- [x] Golden Demo practical case: معادلة شهادة ثانوية غير سورية
- [x] Independence disclaimer preserved; no officiality claims

### Out of scope / deferred
- PRODUCTION promotion or ministry certification
- Numeric fee schedules (دليل الرسوم not transcribed)
- Phase 13 OS print-preview QA — **COMPLETE** (owner PASS 2026-09-15)

## Phase 13 — Quality hardening — COMPLETE

Branch `phase-13-quality-hardening`. Closure report: [qa/PHASE_13_QUALITY_REPORT.md](./qa/PHASE_13_QUALITY_REPORT.md).

- [x] Ops runbooks: [ops/BACKUP_RESTORE.md](./ops/BACKUP_RESTORE.md), [ops/MIGRATION_ROLLBACK.md](./ops/MIGRATION_ROLLBACK.md)
- [x] `scripts/secret-scan.ts` + `scripts/phase13-backup-restore-smoke.ts` + `scripts/phase13-ci-prepare.ts`
- [x] Security / dependency / source-health docs under `docs/qa/phase-13/`
- [x] Privacy / terms / methodology public Arabic copy (product-aligned; not formal legal opinion)
- [x] SECURITY.md Phase 13 sections; README current phase
- [x] Unit / integration suites green
- [x] E2E critical CI gate (`pnpm seed:phase13:ci`, `pnpm test:e2e:ci` = 14) + GitHub workflow Playwright job
- [x] Accessibility (axe critical = 0 on gated routes)
- [x] RTL audit + viewport overflow gates
- [x] **Manual OS/browser Print Preview** (P9-C) — [PRINT_PREVIEW_MANUAL_CHECKLIST.md](./qa/phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md) — owner PASS 2026-09-15
- [x] Empty DB + fresh clone evidence
- [x] Backup/restore smoke executed locally
- [x] Dependency overrides / re-audit (0 high)
- [x] Source health live-fetch recorded (7/7 HTTP 200; no silent claim rewrites)
- [x] Homepage query-batching performance hardening + owner TTFB validation ([HOME_QUERY_SHAPE.md](./qa/phase-13/HOME_QUERY_SHAPE.md))
- [x] Quality report filled — Phase 13 **PASS / COMPLETE**
- [x] PR #4 merged into main

## Phase 14-A — Deployment readiness — ENGINEERING READY (not launched)

Branch `phase-14-deployment-readiness`. Report: [qa/PHASE_14_A_READINESS_REPORT.md](./qa/PHASE_14_A_READINESS_REPORT.md).

- [x] Environment matrix documented — [ops/ENVIRONMENT_MATRIX.md](./ops/ENVIRONMENT_MATRIX.md) (live Preview≠Prod DB **not** claimed verified)
- [x] Production deployment runbook — [ops/PRODUCTION_DEPLOYMENT.md](./ops/PRODUCTION_DEPLOYMENT.md)
- [x] Smoke checklist + `pnpm smoke:deploy` — [ops/PRODUCTION_SMOKE.md](./ops/PRODUCTION_SMOKE.md)
- [x] Robots / sitemap / indexing policy (Preview + DEMO mode noindex)
- [x] Baseline security headers (nosniff / referrer / frame / permissions)
- [x] TechTown demo outline — [qa/TECHTOWN_DEMO_SCRIPT.md](./qa/TECHTOWN_DEMO_SCRIPT.md)
- [ ] Owner verifies Preview DB ≠ Production DB
- [ ] Owner enables/verifies Vercel Preview Deployment Protection
- [ ] Owner decides Production content mode flip (`demo` → `production`) when ready
- [ ] Controlled Production migrate/redeploy (later milestone — explicit approval)
- [ ] DEMO → PRODUCTION editorial promotions (per procedure — explicit approval)

**Labels:** ENGINEERING READY = this milestone · DEPLOYMENT READY = after owner env checklist · PRODUCTION LAUNCHED = owner go-live only.

## Phase 4 — Admin UI polish debt

Completed in Phase 4: Waraqa Admin logo (Aref Ruqaa Ink + star); boolean list cells نعم/لا; parent category empty → `بدون تصنيف أب`; role-aware workflow toolbar; Arabic publication status cells; readable audit actors.

**Remaining unsupported without fragile workarounds (documented):** Payload-owned English chrome strings (Create New, Save Draft, Publish changes, Search by, Columns, Filters, Login form field labels, etc.) — full Arabic Admin pack not wired via supported config.

## Rules

- Phase 4 must not duplicate or re-implement the `transactions` schema (Outcome A).
- Phase 5 must not implement Phase 6 search ranking/normalization or Phase 7 full transaction pages.
- Phase 6 must not implement Phase 7 full transaction pages or Phase 8 guide engine.
- Phase 7 must not implement Phase 8 guide engine, Phase 10 reporting, or Phase 11 SEO/sitemap/revalidation.
- Phase 8 must not implement Phase 9 share/print/persistence, Phase 10 reporting, or Phase 11 SEO/sitemap/revalidation.
- Do not start the next phase until the current phase is owner-approved and tagged.

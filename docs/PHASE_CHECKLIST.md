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
| 7 | Transaction Page | Not started | Sources + verification dates |
| 8 | Interactive Guide Engine | Not started | Pure domain logic + tests |
| 9 | Guide and Result UX | Done (P9-A…P9-E; OS Print Preview → Phase 13) | Checklist, persistence, print, WhatsApp, edit answers |
| 10 | Reporting Changed Information | Not started | Rate limit; no file uploads |
| 11 | Preview, Revalidation, SEO | P11-A in progress (Admin UX tabs); SEO later | Draft safe; sitemap; robots |
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
- Phase 10 reporting
- Phase 11 sitemap / structured data / advanced revalidation

## Phase 9 — Guide result UX (P9-A…P9-E)

- [x] P9-A: interactive local documents checklist + clear-all (in `GuideClient`)
- [x] P9-B: schema-versioned `localStorage` for answers + checklist (`waraqa:guide:<slug>`)
- [x] P9-C: browser-native A4 RTL print (`window.print` + `@media print`; preparation sheet only)
  - Accepted: **PASS WITH PRINT-PREVIEW LIMITATION** — real OS/browser Print Preview not manually inspected (not a commit blocker).
  - **Required Phase 13 / pre-production:** manual Print Preview QA (A4 RTL, margins, page breaks, checklist marks, DEMO/disclaimer/sources).
- [x] P9-D: client-side WhatsApp share (`wa.me` text; public transaction URL only; no answers/checklist state)
- [x] P9-E: answer summary (**إجاباتك**) + per-answer **تعديل** + recalc / prune inapplicable answers
- [ ] Share permalinks / tokens (explicitly out of Phase 9 acceptance; deferred)

See [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md) §2.1–§2.4.

Phase 9 citizen acceptance (checklist, local progress, print, WhatsApp, edit answers) is implemented. Remaining known limitation: **OS Print Preview** → Phase 13.

## Phase 11 — Admin UX (in progress)

- [x] **P11-A:** Transaction admin unnamed tabs + Arabic editorial help (schema shape / RBAC / public behavior unchanged). See [CONTENT_MODEL.md](./CONTENT_MODEL.md) § transactions Admin IA.
- [x] **P11-B:** Transaction Admin readiness panel (workflow publish readiness ≠ public eligibility; informational; server-enforced publish unchanged).
- [x] **P11-C:** Admin Decision Rule Preview (saved-guide only; canonical `evaluateGuide`; ephemeral answers; diagnostic firedRuleKeys).
- [ ] Later P11: dashboards, review-due filters, safer delete confirmations, tablet Admin QA

### QA evidence

- `revisions/round-01-interactive-guide/` — Round 01 capture target (not owner-approved)
- **No** `approved/` folder until owner visual sign-off
- **No** commit / tag / push on this branch yet

See [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md).

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

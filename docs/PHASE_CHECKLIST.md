# Phase Checklist

Track roadmap phases. Mark gates only when acceptance criteria are actually met.

| Phase | Name | Status | Gate |
| --- | --- | --- | --- |
| 0 | Decisions and Compatibility Audit | **COMPLETE — OWNER APPROVED** | Versions compatible; docs present; no feature code; no deps installed; owner amendments reflected |
| 1 | Project Bootstrap | **COMPLETE — OWNER APPROVED** | App starts; admin loads; DB connects; lint/typecheck/test/build/e2e pass |
| 2 | Design System and RTL Foundation | **COMPLETE — OWNER APPROVED** | Tokens, components, RTL, a11y, showcase, screenshots + automated gates; wordmark colors corrected |
| 3 | Core Payload Collections | **NOT STARTED** | RBAC + migrations + types |
| 4 | Transactions Schema and Workflow | Not started | Draft→publish; researcher cannot publish |
| 5 | Public Shell and Home Page | Not started | Disclaimer, search entry, RTL |
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

## Rules

- Do not start Phase 3 until Phase 2 is owner-approved (now complete — Phase 3 still not started in this closure).
- No domain collections, search, guide, reports, or migrations in Phase 2.

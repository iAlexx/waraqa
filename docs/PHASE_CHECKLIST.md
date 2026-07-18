# Phase Checklist

Track roadmap phases. Mark gates only when acceptance criteria are actually met.

| Phase | Name | Status | Gate |
| --- | --- | --- | --- |
| 0 | Decisions and Compatibility Audit | **COMPLETE — OWNER APPROVED** | Versions compatible; docs present; no feature code; no deps installed; owner amendments reflected |
| 1 | Project Bootstrap | **COMPLETE — OWNER APPROVED** | App starts; admin loads; DB connects; lint/typecheck/test/build/e2e pass |
| 2 | Design System and RTL Foundation | **NOT STARTED** | Components RTL/mobile/a11y OK |
| 3 | Core Payload Collections | Not started | RBAC + migrations + types |
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

## Phase 0 deliverables

- [x] Planning docs and `.env.example`
- [x] Owner APPROVED (2026-07-18)

## Phase 1 deliverables

- [x] Next.js + Payload 3.86.0 bootstrap at repo root
- [x] `engines.node: "24.x"` and `packageManager: "pnpm@11.14.0"`
- [x] Pinned audited package versions
- [x] Zod env validation (`src/lib/env.ts`)
- [x] Arabic RTL root + minimal home placeholder + independence disclaimer
- [x] `GET /api/health` (Node runtime, sanitized)
- [x] Docker Compose Postgres (dev-only, host port 5433)
- [x] Vitest unit tests + Playwright E2E + optional `test:int`
- [x] README + CI workflow
- [x] Gate commands: lint, typecheck, test, build, test:e2e — PASS
- [x] Phase 1 closure: GraphQL routes removed + `graphQL.disable`; unused `@eslint/eslintrc` removed; baseline commit
- [x] Owner APPROVED (Phase 1 technical review PASS)

## Phase 1 closure notes

- Official blank scaffold ships optional GraphQL route files; they are **not** required for Waraqa Phase 1 (REST/Local API + admin). Routes deleted and `graphQL: { disable: true }` set so no GraphQL surface remains.
- `@eslint/eslintrc` was unused after migrating to native `eslint-config-next` flat config; removed as a direct dependency.

## Rules

- One phase at a time.
- Do not start Phase 2 until the owner explicitly authorizes it.
- Do not implement design-system, domain collections, search, guide, or reporting until Phase 2+.

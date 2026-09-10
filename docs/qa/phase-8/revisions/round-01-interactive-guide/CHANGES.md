# Phase 8 Round 01 — Changes

## Added

- Interactive guide route `/transactions/[slug]/guide`
- Pure rule evaluator + Admin validation + stable content keys
- Phase 7 detail CTA when public guide available
- Postgres migration `20260720_041000_phase_8_interactive_guide`
- Unit, integration, and E2E coverage; `qa-p8-r1-*` fixture
- Round 01 visual capture — **12/12 PNGs**, inventory `gatePass: true`

## Owner decisions applied

- Answers: in-memory React only (no localStorage/sessionStorage/cookies/DB/analytics/URL params)
- Result: in-session checklist scope only; no Phase 9 share/print/persist
- Variants + `selectVariant`; conflicting variant keys fail closed
- Operators/effects as specified; rules use stable keys only

## Capture notes (2026-07-20)

- Production server with `ALLOW_QA_EMPTY_STATES=1`
- Fixture: `qa-p8-r1-tx-guide`, `qa-p8-r1-tx-noguide`, `qa-p8-r1-tx-draft`
- Result path used minor + first-time to surface «لماذا» + selected variant
- Non-blocking limitations documented in README.md

## Unchanged / preserved

- Phase 7 detail layout, search, workflow, GraphQL disabled
- Phase 1–7 QA `approved/` archives

## Not included

- Phase 9 share/print/persistence
- Phase 10 reporting
- Phase 11 SEO/sitemap
- `docs/qa/phase-8/approved/`
- Git commit, tag, or push

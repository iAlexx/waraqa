# Round 03 — What changed (duplicate results closure)

## Root cause

Fixture re-run **without cleanup** left parallel `qa-p6-r1-*` documents: same Arabic titles, different IDs. Search returned both cohorts, so the pagination query `معاملة ترقيم بحث تجريبية` matched **22** rows instead of **11**.

## Fix

1. **Idempotent fixture** (`scripts/phase6-qa-fixture.ts` + cleanup helpers): each run deletes only `qa-p6-r1-*` rows, reseeds stable slugs, and writes `docs/qa/phase-6/fixture-state/fixture-manifest.json` (never Round 01/02).
2. **ID dedupe defense** in `runPublicSearch`: `dedupeRankedByDocumentId` after ranking so the same document ID cannot appear twice. Same-title different docs still both appear (by design).

## Before / after

| Metric | Before | After |
| --- | --- | --- |
| Pagination query unique matches | 22 | 11 |
| `publishedEligibleTransactionCount` after 2× fixture | drifted / doubled | stable **14** |
| Round 01 / Round 02 evidence | — | **untouched** |

## Out of scope

- Round 01 and Round 02 evidence folders left untouched; no `approved/` promotion; transaction detail remains Phase 7; no credentials.

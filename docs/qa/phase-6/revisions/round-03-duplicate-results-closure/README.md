# Round 03 — Duplicate results closure

| Field | Value |
| --- | --- |
| **Revision name** | `round-03-duplicate-results-closure` |
| **Status** | **AWAITING OWNER VISUAL APPROVAL** |
| **Capture date** | 2026-07-19 |
| **Git HEAD (at capture)** | `5fe07c822c9d055676dc835b3b4c035fa88b40fc` (Phase 6 work uncommitted) |
| **Credentials in fixtures / screenshots** | **None** |
| **Copied to `approved/`** | **No** (do not copy until owner visual approval) |
| **Round 01 / Round 02 folders** | **Untouched** (file count + sizes verified) |
| **Phase 7 started** | **No** |
| **screenshot-inventory.json** | `gatePass: true` |

## Purpose

Owner visual review of Round 03 duplicate-results closure: pagination query matches drop from **22 → 11** after making the Phase 6 QA fixture idempotent and adding document-ID dedupe defense — without changing Round 01 or Round 02 evidence.

## Root cause

Re-running the Phase 6 QA fixture **without cleanup** created parallel published transactions with the **same titles** but **different IDs**. Public search ranked both sets, so the pagination query `معاملة ترقيم بحث تجريبية` showed **22** matches instead of the intended **11**.

## Fix

- Idempotent fixture: cleans only `qa-p6-r1-*` rows, then reseeds stable slugs; writes state under `docs/qa/phase-6/fixture-state/` only.
- Defense in depth: `dedupeRankedByDocumentId` so the same document ID never appears twice in results (does not merge different docs that share a title).

## Required screenshots (7)

| Filename | Notes |
| --- | --- |
| `search-unique-results-desktop-1440.png` | Unique results at 1440px (count 11) |
| `search-unique-results-mobile-390.png` | Unique results at 390px |
| `search-unique-results-mobile-360.png` | Unique results at 360px |
| `search-pagination-page-1-unique.png` | Page 1 unique IDs |
| `search-pagination-page-2-unique.png` | Page 2 unique IDs (no overlap with page 1) |
| `search-result-count-correct.png` | Arabic count shows 11 نتيجة |
| `comparison-round02-vs-round03.png` | Side-by-side Round 02 vs Round 03 desktop |

Also present: `fixture-manifest.json` (no credentials), `screenshot-inventory.json` (`gatePass: true`).

## Capture commands

```powershell
$env:ALLOW_QA_FIXTURE='1'
pnpm qa:phase6:fixture

$env:ALLOW_QA_EMPTY_STATES='1'
pnpm start

$env:QA_BASE_URL='http://localhost:3000'
pnpm qa:phase6:capture:r03
```

## Gate pass (this round)

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass (exit 0) |
| `pnpm typecheck` | Pass (exit 0) |
| `pnpm test` | Pass — 111 passed (12 files) |
| `pnpm test:int` | Pass — 45 passed (7 files); uniqueness suite uses per-test stamps |
| `pnpm build` | Pass (exit 0) |
| `pnpm test:e2e` | Pass — 23 passed, 1 skipped (Playwright webServer; port 3000 freed first) |
| `pnpm db:migrate:status` | Pass (exit 0; phase_6_search_text Ran=Yes) |
| `git diff --check` | Pass (exit 0; CRLF warnings only) |
| `screenshot-inventory.json` | `gatePass: true` (7/7 PNGs non-zero) |

## Policy confirmation

- Written only under `docs/qa/phase-6/revisions/round-03-duplicate-results-closure/`
- Round 01 and Round 02 revision folders **not** modified (verified)
- Fixture state only under `docs/qa/phase-6/fixture-state/`
- **No** copy into `docs/qa/**/approved/`
- **No** commit, tag, or push; **no** Phase 7 work
- Fictional / demo content labeled تجريبي; **no credentials** in fixtures or screenshots

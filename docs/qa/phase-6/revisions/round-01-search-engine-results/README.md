# Round 01 — Search engine & results

| Field | Value |
| --- | --- |
| **Revision name** | `round-01-search-engine-results` |
| **Status** | **AWAITING OWNER VISUAL APPROVAL** |
| **Capture date** | 2026-07-19 |
| **Git HEAD (at capture)** | `5fe07c822c9d055676dc835b3b4c035fa88b40fc` (Phase 6 work uncommitted) |
| **Credentials in fixtures / screenshots** | **None** |
| **Copied to `approved/`** | **No** (do not copy until owner visual approval) |
| **Phase 7 started** | **No** |

## Purpose

Owner visual review of the Phase 6 public Arabic search engine and results UI (replacing the ComingSoon placeholder).

## Required screenshots (18)

| Filename | Notes |
| --- | --- |
| `search-desktop-results-1440.png` | Results at 1440px |
| `search-tablet-results-768.png` | Results at 768px |
| `search-mobile-results-390.png` | Results at 390px |
| `search-mobile-results-360.png` | Results at 360px |
| `search-empty-query.png` | Empty query / prompt empty state |
| `search-no-results.png` | No-results empty state |
| `search-exact-title-ranking.png` | Exact title ranking |
| `search-alias-match.png` | Alias / alternate title match |
| `search-arabic-normalization.png` | Arabic normalization match |
| `search-category-filter.png` | Category filter applied |
| `search-agency-filter.png` | Agency filter applied |
| `search-service-center-filter.png` | Service center filter applied |
| `search-pagination.png` | Pagination UI |
| `search-keyboard-focus.png` | Keyboard focus on search input |
| `search-loading-state.png` | Loading empty state (`ALLOW_QA_EMPTY_STATES=1`) |
| `search-error-state.png` | Error empty state (`ALLOW_QA_EMPTY_STATES=1`) |
| `search-no-javascript.png` | No-JS server-rendered shell |
| `search-public-safety-proof.png` | Public safety / draft-hidden proof |

Also present: `fixture-manifest.json`, `screenshot-inventory.json` (`gatePass: true`).

## Capture commands

```powershell
$env:ALLOW_QA_FIXTURE='1'
pnpm qa:phase6:fixture

$env:ALLOW_QA_EMPTY_STATES='1'
pnpm start

$env:QA_BASE_URL='http://localhost:3000'
pnpm qa:phase6:capture
```

## Gate pass (this round)

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass (exit 0) |
| `pnpm lint` | Pass (exit 0; after e2e structure fix) |
| `pnpm typecheck` | Pass (exit 0) |
| `pnpm test` | Pass — 106 passed (11 files) |
| `pnpm test:int` | Pass — 42 passed (6 files) |
| `pnpm build` | Pass (exit 0) |
| `pnpm test:e2e` | Pass — 23 passed, 1 skipped |
| `git diff --check` | Pass (exit 0; CRLF warnings only) |
| `screenshot-inventory.json` | `gatePass: true` (18/18 PNGs non-zero) |

## Policy confirmation

- Written only under `docs/qa/phase-6/revisions/round-01-search-engine-results/`
- Phase 1–5 QA folders **not** modified
- **No** copy into `docs/qa/**/approved/`
- **No** `phase-6-complete` tag; nothing pushed
- Fictional / demo content labeled تجريبي; no credentials in fixtures or screenshots

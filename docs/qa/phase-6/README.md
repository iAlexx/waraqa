# Phase 6 QA

Arabic search engine and results visual review.

**Status:** Phase 6 — **COMPLETE — OWNER APPROVED**

## Folders

### Revisions (archives — do not modify)

- `revisions/round-01-search-engine-results/` — initial search capture
- `revisions/round-02-search-results-visual-closure/` — result-card visual closure
- `revisions/round-03-duplicate-results-closure/` — unique IDs / count closure

### Approved evidence

- `approved/round-02-search-results-visual-closure/` — **complete** Round 02 (canonical cards)
- `approved/round-03-duplicate-results-closure/` — **complete** Round 03 (unique IDs / counts)
- `approved/round-01-search-engine-results-curated/` — **curated** Round 01 baseline (superseded layout shots excluded)
- `approved/APPROVED_MANIFEST.json` — SHA-256 hashes + source paths

### Fixture state

- `fixture-state/fixture-manifest.json` — idempotent seed state (not a visual revision)

## Policy

- Never overwrite Phase 1–5 QA folders
- Never write Phase 6 screenshots into an older round
- Fictional / demo content must be labeled تجريبي
- Fixture requires `ALLOW_QA_FIXTURE=1`
- Revision archives remain unchanged after owner approval copies

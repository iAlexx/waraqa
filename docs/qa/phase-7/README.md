# Phase 7 QA

Public transaction detail visual review.

**Status:** Phase 7 — **COMPLETE — OWNER APPROVED**

## Folders

### Revisions (archives — do not modify)

- `revisions/round-01-public-transaction-details/` — technical baseline
- `revisions/round-02-transaction-detail-visual-closure/` — desktop width + card/state visual closure

### Approved evidence

- `approved/round-02-transaction-detail-visual-closure/` — **complete** Round 02 (canonical layout/cards/states)
- `approved/round-01-public-transaction-details-curated/` — **curated** Round 01 baseline (superseded layout shots excluded)
- `approved/APPROVED_MANIFEST.json` — SHA-256 hashes + source paths

### Fixture state

- `fixture-state/fixture-manifest.json` — idempotent seed state (not a visual revision)

## Commands

```bash
ALLOW_QA_FIXTURE=1 pnpm qa:phase7:fixture
# server: pnpm build && ALLOW_QA_EMPTY_STATES=1 pnpm start
pnpm qa:phase7:capture
pnpm qa:phase7:capture:r02
```

## Policy

- Never overwrite Phase 1–6 QA folders
- Never modify revision archives after capture
- Fixture requires `ALLOW_QA_FIXTURE=1` and only touches `qa-p7-r1-*`
- Capture inventory fails on missing, zero-byte, wrong-viewport, overflow, or Round 01 hash drift

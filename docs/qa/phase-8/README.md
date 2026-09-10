# Phase 8 QA

Interactive guide visual review.

**Status:** Phase 8 — **TECHNICAL PASS — AWAITING OWNER VISUAL APPROVAL**

## Folders

### Revisions (capture target)

- `revisions/round-01-interactive-guide/` — Round 01 technical + visual baseline

### Fixture state

- `fixture-state/fixture-manifest.json` — idempotent seed state (not a visual revision)

### Approved evidence

- **Not created** — owner visual approval pending

## Commands

```bash
ALLOW_QA_FIXTURE=1 pnpm qa:phase8:fixture
# server: pnpm build && ALLOW_QA_EMPTY_STATES=1 pnpm start
pnpm qa:phase8:capture
```

## Policy

- Never overwrite Phase 1–7 QA folders or `approved/` archives
- Fixture requires `ALLOW_QA_FIXTURE=1` and only touches `qa-p8-r1-*`
- Answers are in-memory only — screenshots must not imply saved progress or share/export UI
- Do not capture WhatsApp/print/saved-checklist UI (Phase 9 scope)

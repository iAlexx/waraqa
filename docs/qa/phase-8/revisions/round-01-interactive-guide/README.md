# Phase 8 — Round 01 — Interactive Guide

| Field | Value |
| --- | --- |
| **Phase** | 8 |
| **Round** | 01 — interactive guide |
| **Status** | TECHNICAL PASS — awaiting owner visual approval |
| **Branch** | `phase-8-interactive-guide` |
| **Capture** | **Complete** — 12/12 PNGs, `screenshot-inventory.json` `gatePass: true` |
| **Phase 9 started** | **No** |
| **Commit / tag** | Uncommitted (owner review) |

## Scope

- CTA «ابدأ الدليل التفاعلي» on eligible detail only
- `/transactions/[slug]/guide` step flow + in-session result
- Variant selection, conditional documents, notices, why text
- In-memory answers (refresh restarts)
- Noscript fallback, loading/error QA states

## Out of scope

- WhatsApp, print, export, saved checklists, accounts, localStorage persistence

## Capture

```bash
ALLOW_QA_FIXTURE=1 pnpm qa:phase8:fixture
pnpm build
# terminal 1: ALLOW_QA_EMPTY_STATES=1 pnpm start
pnpm qa:phase8:capture
```

Inventory: `screenshot-inventory.json` (`status: captured_complete`, `missingCount: 0`, `zeroByteCount: 0`, `gatePass: true`).

## Visual limitations (non-blocking for Round 01)

1. **`guide-variant-selected-1440.png`** is the same result path as the checklist shot (variant block in view) — not a separate answer path.
2. **`guide-keyboard-focus-1440.png`** focuses «التالي»; focus ring is present but relatively subtle on the filled primary button compared to the question heading focus ring.
3. **`guide-no-javascript.png`** shows the intended noscript fallback **and** SSR-rendered guide shell beneath it (non-interactive without JS). Not a loading screen; progressive enhancement remains honest via noscript copy.

No Round 02 opened — none of these are visual blockers for owner review.

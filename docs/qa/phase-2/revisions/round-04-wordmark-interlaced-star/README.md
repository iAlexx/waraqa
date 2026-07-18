# Round 04 — Wordmark + Interlaced Star

| Field | Value |
| --- | --- |
| **Revision name** | `round-04-wordmark-interlaced-star` |
| **Status** | Awaiting owner review |
| **Capture date** | 2026-07-18 |
| **Git HEAD** | `b0d52458796f8f90da1e9927a877c68ac695c999` (`b0d5245 chore: complete phase 1 project bootstrap`) |
| **Capture command** | `ALLOW_DESIGN_SYSTEM_QA=1 pnpm exec next start -p 3017` then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3017 pnpm exec tsx scripts/capture-phase2-qa.ts` |
| **Overwrite policy** | Confirmed: no earlier-round archive was overwritten. Files here were **copied** from `docs/qa/phase-2/*.png` roots that held the latest capture. Root copies remain unchanged. |

## Implementation changes (this revision)

- Production wordmark: **Aref Ruqaa Ink Bold** (`BrandMark` only); Lateef removed from public bundle.
- Motif rebuilt as **interlaced overlapping diamonds** (not a single perimeter / compass silhouette).
- Assets: `public/brand/waraqa-interlaced-star.svg`, `waraqa-interlaced-star-dark.svg`.
- Home hero: max two corner motifs (`HeroCornerMotifs`), ~3% opacity.
- Dark band: sparse `DarkBandMotifs` (no giant repeating tiles).
- Divider: compact horizontal composition (~64–88px central star).

## Viewport dimensions

| Screenshot | Viewport / capture mode |
| --- | --- |
| `*-mobile*.png` | 390×844 (element or body-clipped home) |
| `*-desktop*.png` / home desktop | 1440×900 (element or body-clipped home) |
| Star / divider / dark band | Element screenshots at the viewport active during capture |

## Screenshot inventory

| Filename | Source | Notes |
| --- | --- | --- |
| `wordmark-aref-ruqaa-mobile.png` | Copied from root Phase 2 QA | Newly captured in implementation run, then copied here |
| `wordmark-aref-ruqaa-desktop.png` | Copied from root Phase 2 QA | Same |
| `waraqa-interlaced-star-light.png` | Copied from root Phase 2 QA | Same |
| `waraqa-interlaced-star-dark.png` | Copied from root Phase 2 QA | Same |
| `home-shell-mobile-390.png` | Copied from root Phase 2 QA | Same |
| `home-shell-desktop-1440.png` | Copied from root Phase 2 QA | Same |
| `pattern-dark-band-mobile.png` | Copied from root Phase 2 QA | Same |
| `pattern-dark-band-desktop.png` | Copied from root Phase 2 QA | Same |
| `geometric-divider.png` | Copied from root Phase 2 QA | Same |
| `comparison-contact-sheet.png` | Generated for this folder | BEFORE/AFTER composite |
| `README.md` | This manifest | — |
| `CHANGES.md` | Visible diffs only | — |

## Test results (at capture time)

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | 20 passed |
| `pnpm test:int` | Pass |
| `pnpm build` | Pass |
| `pnpm test:e2e` | 7 passed, 1 skipped |
| `git diff --check` | Pass |

## Known visual limitations

- Aref Ruqaa Ink has a distinctive ink/calligraphic texture; color rendering may read warmer than flat `brand-900` in some environments.
- Corner hero motifs are intentionally very low opacity (~3%) and may be subtle in compressed screenshots.
- Pre-policy rounds were overwritten in `docs/qa/phase-2/` root; true Round 01–03 archives were not versioned. Contact-sheet BEFORE panels use surviving related root assets (e.g. Lateef wordmark, prior compass star) where available.

## Policy confirmation

- No screenshot from an earlier *versioned* round was overwritten (no prior `revisions/` folders existed).
- Root `docs/qa/phase-2/*.png` files were **not** deleted, renamed, or moved.
- Nothing was copied into `docs/qa/phase-2/approved/` (owner approval required).

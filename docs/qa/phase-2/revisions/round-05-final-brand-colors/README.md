# Round 05 — Final Brand Colors (OWNER APPROVED)

| Field | Value |
| --- | --- |
| **Revision name** | `round-05-final-brand-colors` |
| **Status** | **OWNER APPROVED** — Phase 2 complete |
| **Capture date** | 2026-07-18 |
| **Git HEAD (at capture)** | `b0d52458796f8f90da1e9927a877c68ac695c999` (Phase 1 complete; Phase 2 uncommitted until closure) |
| **Owner approval** | Visual direction approved with one mandatory correction: **Waraqa wordmark must not be red** |
| **Required red-color removal** | Done — COLR `@font-palette-values` + explicit `BrandMark` variant classes |
| **Round 04 preserved** | **Yes** — archive untouched (mtime/size checked during capture) |
| **Phase 3 started** | **No** |

## Final wordmark variants

| Variant | Color | Surfaces |
| --- | --- | --- |
| `primary` | `brand-900` (`#0a3d37`) | White, canvas, ivory |
| `reversed` | ivory / white (`#fbf8f0`) | `brand-900` / `brand-950` |
| `ink` | `ink-950` (`#14201e`) | Print / monochrome |

Never used on «ورقة»: red, danger, destructive, orange, gradients, text-shadow, glow, filters, blend modes, or opacity that weakens readability.

## Viewport sizes

| Screenshot | Viewport / mode |
| --- | --- |
| `wordmark-aref-ruqaa-mobile.png` | 390×844 element |
| `wordmark-aref-ruqaa-desktop.png` | 1440×900 element |
| `home-shell-mobile-390.png` | 390×844 body-clipped |
| `home-shell-desktop-1440.png` | 1440×900 body-clipped |
| `wordmark-reversed-dark.png` | 1440×900 element |
| `wordmark-ink-print.png` | 1440×900 element |
| `pattern-dark-band-*` | Element at active viewport |
| Stars / divider | Element screenshots |
| `comparison-contact-sheet.png` | Generated composite |

## Capture commands

```powershell
$env:ALLOW_DESIGN_SYSTEM_QA='1'
corepack pnpm@11.14.0 exec next start -p 3018

$env:QA_BASE_URL='http://127.0.0.1:3018'
$env:QA_REVISION_DIR='docs/qa/phase-2/revisions/round-05-final-brand-colors'
corepack pnpm@11.14.0 exec tsx scripts/capture-phase2-qa.ts

corepack pnpm@11.14.0 exec tsx scripts/build-qa-contact-sheet.ts round-05-final-brand-colors
```

## Screenshot inventory

| Filename | Notes |
| --- | --- |
| `wordmark-aref-ruqaa-mobile.png` | Primary brand-900 (not red) |
| `wordmark-aref-ruqaa-desktop.png` | Primary brand-900 (not red) |
| `home-shell-mobile-390.png` | Public home, green wordmark |
| `home-shell-desktop-1440.png` | Public home, green wordmark |
| `wordmark-reversed-dark.png` | Ivory on brand-950 |
| `wordmark-ink-print.png` | ink-950 print |
| `pattern-dark-band-mobile.png` | Sparse dark band |
| `pattern-dark-band-desktop.png` | Sparse dark band |
| `waraqa-interlaced-star-light.png` | Motif light |
| `waraqa-interlaced-star-dark.png` | Motif dark |
| `geometric-divider.png` | Compact divider |
| `comparison-contact-sheet.png` | BEFORE Round 04 red / AFTER Round 05 green–ivory |
| `README.md` | This manifest |
| `CHANGES.md` | Visible diffs only |

## Test results

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | 23 passed |
| `pnpm test:int` | 1 passed |
| `pnpm build` | Pass |
| `pnpm test:e2e` | 9 passed, 1 skipped |
| `git diff --check` | Pass (CRLF warnings only) |
| Capture not-red pixel checks | Pass (redHeavy ≪ 0.12) |
| Round 04 archive integrity | Pass |

## Route smoke (prod server `:3018`)

| Route | Result |
| --- | --- |
| `/` | OK (home shell captured) |
| `/admin` | HTTP 200 |
| `/api/health` | `{"status":"ok","database":"ok"}` |
| `/dev/wordmark-lab` (with `ALLOW_DESIGN_SYSTEM_QA=1`) | HTTP 200 |
| Dev QA routes in production without allow | Protected (`notFound` / e2e coverage) |

## Policy confirmation

- Round 04 folder **not** overwritten, deleted, renamed, or moved.
- New captures written **only** into this Round 05 folder.
- Approved copy: `docs/qa/phase-2/approved/round-05-final-brand-colors/`
- Phase 3 **not** started.

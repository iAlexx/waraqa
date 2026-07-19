# Round 03 — Admin Workflow UX Closure

| Field | Value |
| --- | --- |
| **Status** | Phase 4 — TECHNICAL PASS — **AWAITING OWNER VISUAL APPROVAL** |
| **Capture date** | 2026-07-19 |
| **Branch** | `phase-4-editorial-workflow` |
| **Git HEAD** | `461a2292204f3b889c220f8b0c08028c1b8271b9` (Phase 3 complete base; Phase 4 work uncommitted) |
| **Migration** | `20260718_234422_phase_4_editorial_workflow` |
| **Viewport** | Desktop 1440×900 |
| **Screenshot count** | **16 / 16** required (`gatePass: true`; 0 missing; 0 zero-byte) |
| **Fixture policy** | Local-only; `ALLOW_QA_FIXTURE=1`; fictional Arabic labels; credentials in gitignored `docs/qa/phase-4/.local-credentials` |
| **Phase 2/3 QA** | Untouched |
| **Round 01 / Round 02** | Unchanged (not overwritten; capture writes only under this folder) |
| **Copied to approved/** | No |
| **Phase 5** | Not started |
| **Commit / tag / push** | None |

## Exact capture commands (production server)

Capture **requires** production (`pnpm build` + `pnpm start`). The capture script fails if the Next.js development indicator is present.

```powershell
# 1) Build
corepack pnpm@11.14.0 build

# 2) Ensure port 3000 is free, then start production
# (Windows: if pnpm start -- -p 3000 mangles args, use exec form below)
$env:PORT='3000'
corepack pnpm@11.14.0 exec next start -p 3000

# 3) Wait until healthy
# GET http://localhost:3000/api/health → {"status":"ok","database":"ok"}

# 4) Fixture only if credentials missing
# $env:ALLOW_QA_FIXTURE='1'
# corepack pnpm@11.14.0 qa:phase4:fixture

# 5) Capture against production
$env:QA_BASE_URL='http://localhost:3000'
corepack pnpm@11.14.0 qa:phase4:capture
```

Use `localhost` (not `127.0.0.1`) when matching the Next.js bind host.

## Tests / gates run (this closure pass)

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | pass (`WorkflowActions` already reads `publishedAt` for draft-with-published-version labeling) |
| `pnpm build` | pass |
| Production `/api/health` | pass (`status=ok`, `database=ok`) |
| `pnpm qa:phase4:capture` | pass (16 screenshots; existing Round 03 fixture credentials reused) |
| `pnpm test:e2e` | pass (**9 passed, 1 skipped**) — production server stopped first so Playwright `webServer` could start `pnpm dev` |

## Spot-check: admin login wordmark color

**Honest result: the login wordmark is not red.**
Admin brand uses Aref Ruqaa Ink at **brand-900** (`#0a3d37` dark teal/ink) with a gold star motif (`AdminLogo` + `custom.scss`). Pixel sampling of `admin-login-final-brand-desktop-1440.png` is dominated by near-`#303030` / ink tones, not red. This matches the public BrandMark e2e expectation (not painted red).

## Admin English residual strings (unsupported — no unsafe DOM replacement)

Documented honestly; Payload chrome remains partially English:

- Login: `Email`, `Password`, `Login`, `Forgot password?`
- Collection chrome: `Create New`, `Search by …`, `Columns`, `Filters`, `Draft`, `Published`, `Updated At`
- Versions UI labels may remain English (`Versions`)
- Some enum keys may still appear in English alongside Arabic Admin labels

Custom Waraqa surfaces in this round: role-aware Arabic workflow toolbar, dual Arabic workflow/publication status cards, readable audit actors, parent category empty cell, Arabic list statuses.

## Confirmations

- Round 01 and Round 02 directories were **not** modified by this capture (mtime check during capture window; script refuses paths outside Round 03).
- Nothing copied to `docs/qa/phase-4/approved/`.
- Screenshots and `fixture-manifest.json` redact passwords (`secretRedacted: true` on inventory entries). Live password only in gitignored `.local-credentials`.
- No git commit / tag / push performed for this pass.

## Inventory

See [screenshot-inventory.json](./screenshot-inventory.json) (`gatePass: true`).

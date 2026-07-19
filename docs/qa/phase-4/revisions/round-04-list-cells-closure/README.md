# Round 04 - List Cells Closure

| Field | Value |
| --- | --- |
| **Status** | Phase 4 - TECHNICAL PASS - **AWAITING OWNER VISUAL APPROVAL** |
| **Capture date** | 2026-07-19 |
| **Branch** | `phase-4-editorial-workflow` |
| **Git HEAD** | `461a2292204f3b889c220f8b0c08028c1b8271b9` (Phase 3 complete base; Phase 4 work uncommitted) |
| **Viewport** | Desktop 1440x900 |
| **Screenshot count** | **3 / 3** required (`gatePass: true`; 0 missing; 0 zero-byte) |
| **Fixture policy** | Local-only; `ALLOW_QA_FIXTURE=1`; fictional Arabic labels; credentials in gitignored `docs/qa/phase-4/.local-credentials` |
| **Phase 2/3 QA** | Untouched |
| **Round 01 / Round 02 / Round 03** | Unchanged (not overwritten; capture writes only under this folder) |
| **Copied to approved/** | No |
| **Phase 5** | Not started |
| **Commit / tag / push** | None |

## Exact capture commands (production server)

Capture **requires** production (`pnpm build` + `next start`). The capture script fails if the Next.js development indicator is present.

```powershell
# 1) Build
corepack pnpm@11.14.0 build

# 2) Ensure port 3000 is free, then start production
corepack pnpm@11.14.0 exec next start -p 3000

# 3) Wait until healthy
# GET http://localhost:3000/api/health -> {"status":"ok","database":"ok"}

# 4) Fixture
$env:ALLOW_QA_FIXTURE='1'
corepack pnpm@11.14.0 qa:phase4:fixture

# 5) Capture against production
$env:QA_BASE_URL='http://localhost:3000'
corepack pnpm@11.14.0 qa:phase4:capture:r04
```

Use `localhost` (not `127.0.0.1`) when matching the Next.js bind host.

## Tests / gates run (this closure pass)

| Gate | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass (`AuditEvents.defaultSort` moved to collection root; actor relationship uses `Number(actorId)`) |
| `pnpm test` | pass (75) |
| `pnpm test:int` | pass (31) |
| `pnpm build` | pass |
| Production `/api/health` | pass (`status=ok`, `database=ok`) |
| `pnpm qa:phase4:fixture` | pass |
| `pnpm qa:phase4:capture:r04` | pass (3 screenshots) |
| `pnpm test:e2e` | pass (**9 passed, 1 skipped**) - production server stopped first so Playwright `webServer` could start `pnpm dev` |
| `git diff --check` | pass |

## Spot-check: list cells

**Publication status** (live scrape after capture): cells show Arabic labels including `مسودة`, `منشورة`, `مسودة مع نسخة منشورة` — not em-dash alone.

**Audit actors** (live scrape): cells show readable names (e.g. `مدير تجريبي ر2`, `مراجع تجريبي ر2`, `باحث تجريبي ر2`) — not em-dash alone.

## Confirmations

- Round 01 (0 PNG / 2 MD), Round 02 (27 PNG), Round 03 (16 PNG) counts unchanged; script refuses paths outside Round 04.
- Nothing copied to `docs/qa/phase-4/approved/`.
- Screenshots and `fixture-manifest.json` redact passwords (`secretRedacted: true` on inventory entries). Live password only in gitignored `.local-credentials`.
- No git commit / tag / push performed for this pass.

## Inventory

See [screenshot-inventory.json](./screenshot-inventory.json) (`gatePass: true`).

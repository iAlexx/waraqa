# Round 02 — Owner Review Closure

| Field | Value |
| --- | --- |
| **Status** | Phase 4 — **COMPLETE — OWNER APPROVED** |
| **Capture date** | 2026-07-19 |
| **Branch** | `phase-4-editorial-workflow` |
| **Git HEAD** | `461a2292204f3b889c220f8b0c08028c1b8271b9` (Phase 3 complete base; Phase 4 work uncommitted) |
| **Migration** | `20260718_234422_phase_4_editorial_workflow` |
| **Viewport** | Desktop 1440×900; mobile preview 390×844 |
| **Screenshot count** | **27 / 27** required (gatePass: true; 0 missing; 0 zero-byte) |
| **Fixture policy** | Local-only; `ALLOW_QA_FIXTURE=1`; fictional Arabic labels; credentials in gitignored `docs/qa/phase-4/.local-credentials` |
| **Phase 2/3 QA** | Untouched |
| **Round 01** | Unchanged (not overwritten) |
| **Copied to approved/** | No |
| **Phase 5** | Not started |
| **Commit / tag / push** | None |

## Exact capture commands

```powershell
$env:ALLOW_QA_FIXTURE='1'
corepack pnpm@11.14.0 qa:phase4:fixture
$env:QA_BASE_URL='http://localhost:3000'
corepack pnpm@11.14.0 qa:phase4:capture
```

Use `localhost` (not `127.0.0.1`) when the Next.js dev server is bound to localhost to avoid cross-origin HMR blocking Admin hydration.

## Tests run (Round 02 gate re-run)

| Gate | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass (60) |
| `pnpm test:int` | pass (31) — includes `phase4-public-access.int.spec.ts` |
| `pnpm build` | pass |
| `pnpm test:e2e` | pass (9 passed, 1 skipped) |
| `pnpm db:migrate:status` | all Ran=Yes |
| `git diff --check` | pass |

## Public access-control result

**Primary Where** (`publicTransactionRead` → `publicTransactionWhere` on `transactions` only):

```ts
{
  and: [
    { _status: { equals: 'published' } },
    { active: { equals: true } },
    { markedOutdated: { not_equals: true } },
    { workflowState: { not_equals: 'archived' } },
  ],
}
```

Anonymous list for draft / archived / outdated / inactive → `docs: []`, `totalDocs: 0` (proven by int tests + Round 02 API screenshots).  
`afterRead` (`stripPrivateEditorialFields`) is **defense in depth only** (field strip + null archived/outdated + sanitize prerequisite IDs).

Also fixed: `markOutdated` / `archive` now mutate the **live** published row (`draft: false`), so public queries see the hide immediately.

## Admin English residual strings (unsupported — no unsafe DOM replacement)

Documented honestly; Payload chrome remains partially English:

- Login: `Email`, `Password`, `Login`, `Forgot password?`
- Collection chrome: `Create New`, `Search by …`, `Columns`, `Filters`, `Draft`, `Published`, `Updated At`
- Versions UI labels may remain English (`Versions`)
- Workflow **state option values** in preview metadata may show English enum keys (`draft`, `published`) alongside Arabic labels in Admin selects

Custom Waraqa surfaces verified: login wordmark ورقة, RTL Admin, workflow action buttons in Arabic, نعم/لا boolean cells, `بدون تصنيف أب` parent empty, preview banner `معاينة داخلية — هالمحتوى غير منشور`.

## No secrets confirmation

Screenshots and `fixture-manifest.json` redact passwords. Live password only in gitignored `.local-credentials`. `secretRedacted: true` on all inventory entries.

## Inventory

See [screenshot-inventory.json](./screenshot-inventory.json) (`gatePass: true`).

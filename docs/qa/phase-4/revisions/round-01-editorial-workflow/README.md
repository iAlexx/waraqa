# Round 01 — Editorial Workflow

| Field | Value |
| --- | --- |
| **Status** | Technical scaffolding — visual captures may be partial; authorization proven in integration tests |
| **Capture date** | 2026-07-19 |
| **Branch** | `phase-4-editorial-workflow` |
| **Migration** | `20260718_234422_phase_4_editorial_workflow` |
| **Fixture** | Local-only; `ALLOW_QA_FIXTURE=1`; fictional Arabic labels |
| **Viewport** | 1440×900 desktop; 390 mobile preview |
| **Phase 2/3 QA** | Untouched |
| **Copied to approved/** | No |
| **Phase 5** | Not started |

## Screenshot inventory (target)

See owner brief §28 filenames. Integration tests cover workflow authorization when Admin E2E is limited.

## Capture commands

```powershell
$env:ALLOW_QA_FIXTURE='1'
corepack pnpm@11.14.0 qa:phase4:fixture
$env:QA_BASE_URL='http://127.0.0.1:3000'
corepack pnpm@11.14.0 qa:phase4:capture
```

## Known limitations

- Payload Admin chrome remains partially English (no unsafe i18n fork).
- Full Playwright Admin workflow E2E is best-effort; critical gates are in `tests/int/phase4-workflow.int.spec.ts`.

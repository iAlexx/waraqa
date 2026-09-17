# Phase 13 — Quality Hardening Report

**Status:** PASS / COMPLETE  
**Branch:** `phase-13-quality-hardening`  
**Performance hardening commit:** `53ec75e9fc6f3953e7b7c48456bd7df96819f4f5`  
**Docs closure:** this report + Print Preview sign-off on the same PR tip after that commit  
**Report updated:** 2026-09-15  

---

## 1. Environment

| Item | Value |
| --- | --- |
| Node | 24.18.0 |
| pnpm | 11.14.0 |
| Postgres | Docker `waraqa` / disposable int DB on host **5433** |
| Content mode (E2E) | `WARAQA_PUBLIC_CONTENT_MODE=demo` + `WARAQA_PHASE13_CI=1` |
| CI secrets | CI-only placeholders only (see workflow) |

---

## 2. Test matrix

| Area | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — see closure run counts |
| `pnpm test:int` | PASS — see closure run counts |
| `pnpm test:e2e:ci` | PASS — **14** (critical + Phase 12) |
| `pnpm build` | PASS |
| `pnpm audit:deps` | PASS — 0 high / 0 critical after overrides |
| `pnpm scan:secrets` | PASS |
| Backup/restore smoke | PASS |
| Empty DB / empty UI | PASS (int + unit) |
| Fresh clone | PASS |

---

## 3. Counts (closure gate re-run 2026-09-15)

Local re-run on Docker Postgres `5433` after Print Preview owner sign-off (same product tip `53ec75e`):

| Suite | Passing |
| --- | ---: |
| Unit | 407 |
| Integration | 144 |
| E2E critical closure (`pnpm test:e2e:ci`) | 14 |

---

## 4. Accessibility

| Check | Result |
| --- | --- |
| axe home / transaction / guide result (critical) | **0 critical** in Phase 13 critical E2E |
| Skip link / keyboard / RTL shell | PASS in critical E2E |
| Waived axe rules | none silenced globally |

---

## 5. RTL

| Check | Result |
| --- | --- |
| Public shell + Golden Demo | PASS (`dir=rtl`, overflow checks) |
| Critical L/R layout bugs | none found in gated flows |

---

## 6. Viewport

| Check | Result |
| --- | --- |
| Home matrix (roadmap sizes) | covered by `phase13-viewport-matrix.e2e` + critical overflow loop |
| Critical horizontal overflow | none observed in gated runs |

---

## 7. Print Preview (HARD GATE)

| Check | Result |
| --- | --- |
| Playwright print DOM | PASS (automated) |
| **Real OS/browser Print Preview** | **PASS** — owner manual sign-off 2026-09-15 |

Owner evidence (Chrome / Windows Print Preview, A4 Portrait):

- Arabic RTL correct
- Browser headers/footers disabled
- No navigation/header/footer clutter
- No checklist/card split mid-item
- Checklist marks readable
- Title, selected answers/situation, requirements, steps, notes, sources visible
- DEMO warning visible
- Independence disclaimer visible
- Review/generated date visible
- 3-page PDF visually reviewed by owner

Checklist: [PRINT_PREVIEW_MANUAL_CHECKLIST.md](./phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md)

---

## 8. Security

See [SECURITY_REVIEW.md](./phase-13/SECURITY_REVIEW.md). **Critical/High unmitigated: 0.**

---

## 9. Dependency audit

See [DEPENDENCY_AUDIT.md](./phase-13/DEPENDENCY_AUDIT.md). High advisories mitigated via `pnpm-workspace.yaml` overrides (dev tooling paths).

---

## 10. Secret scan

`pnpm scan:secrets` — OK on tracked files. Credentials remain gitignored under `docs/qa/**/.local-credentials`.

---

## 11. Source health

See [SOURCE_HEALTH.md](./phase-13/SOURCE_HEALTH.md). All **7** Phase 12 source URLs HTTP **200** on 2026-09-14.

---

## 12. Performance

Query-shape hardening shipped in `53ec75e9fc6f3953e7b7c48456bd7df96819f4f5` (batched claim/source graph; no category N+1; batched featured). Shape notes: [HOME_QUERY_SHAPE.md](./phase-13/HOME_QUERY_SHAPE.md).

**Deployed / preview real-browser TTFB (owner-measured, not a CI wall-clock gate):**

| Measurement | TTFB |
| --- | ---: |
| Before batching (prior production/preview) | ≈ **8.92 s** |
| After `53ec75e` — reload 1 | **61 ms** |
| After `53ec75e` — reload 2 | **74 ms** |
| After `53ec75e` — reload 3 | **43 ms** |
| After average (3 reloads) | ≈ **59 ms** |

No invented CI wall-clock benchmarks. Automated evidence remains query-count / unit+int assertions only.

---

## 13. Empty DB

- Home/search empty UI unit coverage + int empty-find / report fail-closed / health shape.
- Expected UX: calm Arabic empty states; unknown slug → not-found; report without target fails safely.

---

## 14. Fresh clone

Temp clone of branch → `pnpm install --frozen-lockfile` → `.env.local` from documented placeholders → disposable DB → migrate → lint/typecheck/test/int/build — **PASS**.

---

## 15. Backup / restore / rollback

- Runbooks: [BACKUP_RESTORE.md](../ops/BACKUP_RESTORE.md), [MIGRATION_ROLLBACK.md](../ops/MIGRATION_ROLLBACK.md)
- Smoke: `pnpm phase13:backup-restore-smoke` PASS
- Prefer backup/restore + forward-fix; enums often non-reversible

---

## 16. Privacy / legal copy

Privacy, terms, methodology updated to match **actual** product behavior (independent, no national ID, no uploads, optional report contact, localStorage disclosure, DEMO labeling). Explicitly **not** a formal Syrian legal compliance opinion.

---

## 17. Known limitations / deferred

- Full offline PWA intentionally **not** implemented; guide localStorage survives reload
- Category detail still ComingSoon (pre-existing); category→tx deep E2E not expanded
- Remaining moderate npm advisories (non-blocking)
- Full Admin browser journey still largely covered by integration tests + admin smoke login

---

## 18. Verdict

**PHASE 13 PASS / COMPLETE**

All automated gates green; owner manual Print Preview signed off; homepage performance hardening validated on the deployed tip after `53ec75e`.

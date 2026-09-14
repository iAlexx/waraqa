# Phase 13 — Dependency audit

**Tool:** `pnpm audit` / `pnpm audit:deps`  
**Date:** 2026-09-14  
**Policy:** fail CI on **high** or **critical** (`pnpm audit --audit-level high`).

## Summary (after Phase 13 overrides)

| Severity | Count |
|----------|------:|
| critical | 0 |
| high | **0** (`pnpm audit:deps` exits 0) |
| moderate | 19 (non-blocking; documented) |
| low | 4 |

## High findings mitigated

### brace-expansion (eslint tooling)

| Item | Detail |
| --- | --- |
| Package | `brace-expansion` (via `minimatch` → ESLint / `eslint-config-next`) |
| Advisories | GHSA-mh99-v99m-4gvg / GHSA-rgw5-rvv9-x895 (DoS via unbounded expansion) |
| Reachable in production citizen UI? | **No** — lint/CI/dev only |
| Mitigation | `pnpm-workspace.yaml` overrides: `brace-expansion@<2` → `1.1.18`, `brace-expansion@>=4` → `5.0.9` |

### undici (vitest/jsdom)

| Item | Detail |
| --- | --- |
| Package | `undici` via `jsdom` / `vitest` |
| Advisory | GHSA-4cwx-7wf7-3272 |
| Reachable in production citizen UI? | **No** — unit-test tooling only |
| Mitigation | `pnpm-workspace.yaml` override: `undici` → `7.29.0` |

## Follow-up

- Re-run `pnpm audit:deps` after every lockfile change.
- Remaining **moderate** advisories are not Phase 13 blockers unless production reachability changes.
- Do not blindly upgrade Payload/Next majors solely for moderate advisories.

# Content isolation (P0-06)

**Status:** IMPLEMENTED (wiring) — awaiting owner review / deploy.

**Migration:** `20260722_100000_p0_06_content_class_isolation`

**Related:** [CLAIMS_EVIDENCE.md](./CLAIMS_EVIDENCE.md), [SECURITY.md](./SECURITY.md), [CONTENT_MODEL.md](./CONTENT_MODEL.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md)

## Purpose

Explicit `contentClass` on Transactions, Claims, and Sources so QA / demo data cannot leak onto the production public surface. Independent of verification, `claimTrustOk`, and `_status`.

| Class | Meaning | Public (mode=`production`) | Public (mode=`demo`) |
| --- | --- | --- | --- |
| `PRODUCTION` | Real guidance | Yes | Yes |
| `DEMO` | Intentional public demo | **No** | Yes (labeled) |
| `QA_TEST` | Fixtures / internal QA | **Never** | **Never** |

Env: `WARAQA_PUBLIC_CONTENT_MODE=production|demo` (optional; default **production**; invalid → production). Do **not** infer from `NODE_ENV`.

## IMPLEMENTED

- Shared `contentClass` field (DB column `content_class`) + admin Cell
- Migration: enum + columns on `tx` / `claims` / `sources` (+ version tables); legacy rows → `QA_TEST`
- Governance: default create `QA_TEST`; researchers cannot promote to `PRODUCTION`
- Public Where: `getPublicTransactionWhere()` / `publicSourceRead` filter by allowed classes
- Claim trust / publication gates respect class compatibility (tx ← claim ← source)
- `demoLabeled` from `contentClass === 'DEMO'` (not title/slug heuristics)
- DEMO UI uses `DEMO_PUBLIC_LABEL_AR`; DEMO pages set `robots: noindex`
- Fingerprint includes `contentClass`

## NOT IMPLEMENTED

- Separate demo hostname / CDN purge rules
- Admin bulk promote/demote tooling
- Category-level `contentClass` (categories stay unlabeled)
- Verified Vercel Preview DB ≠ Production DB (ops — see [ops/ENVIRONMENT_MATRIX.md](./ops/ENVIRONMENT_MATRIX.md))
- Automatic DEMO → PRODUCTION promotion (forbidden by policy)

## Fail-safe defaults

Missing / unknown class → treat as `QA_TEST` (never public). Seed bypass may set an explicit class; omitted seed creates still default to `QA_TEST`.

**Seed / test overrides:** `allowSeedBypass` never runs when `NODE_ENV=production` or `VERCEL_ENV=production` (even if `ALLOW_QA_FIXTURE=1`). `setPublicContentModeForTests` is a no-op outside Vitest / `NODE_ENV=test`.

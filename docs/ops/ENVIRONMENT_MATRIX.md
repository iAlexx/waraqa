# Environment matrix (Phase 14-A)

**Status:** Documented policy for Phase 14 readiness.  
**Verification:** This file describes **required** isolation. It does **not** claim the live Vercel Preview vs Production databases are already separate unless an owner verification checklist below is marked complete.

Related: [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md), [SECURITY.md](../SECURITY.md), [CONTENT_ISOLATION.md](../CONTENT_ISOLATION.md), [PREVIEW_SECURITY.md](../PREVIEW_SECURITY.md).

---

## Matrix

| Concern | LOCAL | PREVIEW (Vercel) | PRODUCTION (Vercel) |
| --- | --- | --- | --- |
| Database | Disposable Docker / local Postgres (`pnpm db:up`) | **Must be** a separate Supabase (or Postgres) project from Production | Dedicated Production project only |
| `DATABASE_URL` / `_DIRECT` | Local-only secrets in `.env.local` (gitignored) | Preview-only secrets in Vercel Preview env | Production-only secrets in Vercel Production env |
| `PAYLOAD_SECRET` | Local-only (≥32) | Preview-only (different from Production) | Production-only; **do not rotate blindly** (invalidates sessions) |
| `PREVIEW_SECRET` | Local-only (≥32) | Preview-only | Production-only |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` | Preview deployment origin | Canonical public origin |
| `WARAQA_PUBLIC_CONTENT_MODE` | Usually unset → fail-closed `production`, or explicit `demo` for local DEMO QA | Explicitly permitted `demo` for private demos | Owner decision: keep `demo` only while DEMO content is intentional; switch to `production` only after PRODUCTION content exists |
| QA / seed fixtures | Only with `ALLOW_QA_FIXTURE=1` (blocked when `NODE_ENV`/`VERCEL_ENV`=production) | Never use production DB; never enable seed against Production | Seed bypass **hard-blocked** on production runtime |
| Search indexing | Irrelevant locally | **noindex** (`VERCEL_ENV` ≠ `production`) | Index **only** when `VERCEL_ENV=production` **and** content mode=`production` **and** force-noindex unset |
| Access protection | Local machine | **Required:** Vercel Deployment Protection / SSO / password (robots alone are insufficient) | Public citizen site + Payload Admin auth |

---

## Fail-closed public content (all environments)

| Mode | Public classes | QA_TEST | Draft / inactive / archived / outdated / trust-blocked |
| --- | --- | --- | --- |
| missing / invalid / `production` | `PRODUCTION` only | Never | Never |
| `demo` | `PRODUCTION` + `DEMO` (DEMO labeled + page noindex) | Never | Never |

Central policy: `src/lib/content-class/public-content-policy.ts`.  
Public Where: `getPublicTransactionWhere()` in `src/access/index.ts`.

DEMO is **never** auto-promoted to PRODUCTION.

---

## What is verified vs not (as of Phase 14-A)

| Check | State |
| --- | --- |
| Code fail-closed content mode | Implemented + unit/int coverage |
| Robots/sitemap respect Preview + DEMO mode | Implemented in Phase 14-A |
| Existing Production Vercel `DATABASE_URL` project ref | Owner-accepted evidence earlier (ref prefix `oyqolfoa…`); **Vercel Sensitive values not independently decryptable via CLI** |
| Preview uses a **different** database than Production | **NOT VERIFIED** — treat as open owner ops item |
| Preview Deployment Protection enabled | **NOT VERIFIED** — owner must confirm in Vercel |

---

## Owner verification checklist (no secrets in chat)

1. Vercel → Project → Settings → Environment Variables.
2. Confirm Production `DATABASE_URL` / `_DIRECT` project ref (username `postgres.<ref>`) is the intended WARAQA project.
3. Confirm Preview `DATABASE_URL` / `_DIRECT` project ref is **different** from Production (or document intentional exception with risk acceptance).
4. Confirm `PAYLOAD_SECRET` and `PREVIEW_SECRET` differ across Preview vs Production.
5. Confirm Preview Deployment Protection is on.
6. Record completion date in [PHASE_14_A_READINESS_REPORT.md](../qa/PHASE_14_A_READINESS_REPORT.md) without pasting URLs or secrets.

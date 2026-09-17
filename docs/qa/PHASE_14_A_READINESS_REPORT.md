# Phase 14-A — Deployment readiness report

**Milestone status:** **ENGINEERING READY** (code + docs + automated gates for this PR)  
**Not:** DEPLOYMENT READY · **Not:** PRODUCTION LAUNCHED · **Not:** Phase 14 COMPLETE

**Branch:** `phase-14-deployment-readiness`  
**Base:** `main` (post Phase 13 merge)  
**Report date:** 2026-09-17

---

## 1. Audit summary

### Already existed
- P0-06 content isolation (`WARAQA_PUBLIC_CONTENT_MODE`, public Where, DEMO labels/noindex on DEMO pages)
- Preview HMAC auth + `docs/PREVIEW_SECURITY.md`
- `/api/health`, backup/restore + migration rollback ops docs
- Phase 13 quality report PASS/COMPLETE; CI critical E2E

### Added in Phase 14-A
- Indexing policy (Preview + DEMO mode → noindex)
- `robots.ts` + `sitemap.ts` (empty sitemap when indexing disabled; public Where for procedure URLs)
- Baseline security headers in `next.config.ts`
- Environment matrix + production deployment runbook + smoke checklist
- TechTown demo outline (DEMO honesty)
- Unit tests for indexing policy
- Read-only `pnpm smoke:deploy` script

### Explicitly NOT done (stop conditions)
- No Production/Preview env var changes
- No DB create/migrate against live WARAQA Supabase
- No DEMO → PRODUCTION promotion
- No secret rotation
- No Production redeploy / PR merge from this milestone alone

---

## 2. Environment isolation claim

| Claim | Verdict |
| --- | --- |
| Code documents LOCAL / PREVIEW / PRODUCTION matrix | Yes — [ENVIRONMENT_MATRIX.md](../ops/ENVIRONMENT_MATRIX.md) |
| Live Preview DB ≠ Production DB | **NOT VERIFIED** — owner checklist open |
| Vercel Deployment Protection on Preview | **NOT VERIFIED** — owner checklist open |
| Production DB identity | Owner-accepted evidence previously (ref prefix `oyqolfoa…`); Sensitive values not CLI-decryptable |

---

## 3. Content safety

| Requirement | Status |
| --- | --- |
| Missing/invalid mode → production (fail closed) | Existing + unit tests |
| Production mode → PRODUCTION only | Existing |
| Demo mode → PRODUCTION + DEMO | Existing; current hosted site may still use `demo` |
| QA_TEST never public | Existing |
| Draft/inactive/archived/outdated/trust-blocked | Existing public Where + live trust |
| Sitemap/metadata consistency | Phase 14-A indexing + sitemap helpers |
| Preserve public DEMO experience | Yes — no mode flip in Vercel |

---

## 4. Robots / SEO

| Item | Status |
| --- | --- |
| DEMO deployments not indexed as authoritative | Sitewide noindex when mode=`demo` |
| Preview not indexed | `VERCEL_ENV=preview` → noindex + robots disallow |
| Draft preview noindex | Existing page metadata |
| Sitemap excludes admin/preview/QA_TEST | Public Where only; empty when noindex |
| Independence wording in default description | Updated in frontend layout |
| robots ≠ access control | Documented; Preview Protection is owner ops |

---

## 5. Quality gates (recorded 2026-09-17 on this branch)

| Gate | Result |
| --- | --- |
| `pnpm lint` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** — 413 |
| `pnpm test:int` | **PASS** — 144 (local Docker `5433` only) |
| `pnpm build` | **PASS** (`/robots.txt`, `/sitemap.xml` present) |
| `pnpm test:e2e:ci` | **PASS** — 14 |
| `pnpm scan:secrets` | **PASS** |
| `pnpm audit:deps` | **PASS** — 0 high / 0 critical |
| `pnpm smoke:deploy` | Optional against public URL; not required for ENGINEERING READY |

---

## 6. Outstanding risks

1. Preview and Production may still share one database — **highest ops risk**.  
2. Hosted site may remain in `demo` mode — correct for DEMO demo, wrong if mistaken for PRODUCTION launch.  
3. `vercel link` can overwrite local `.env.local` — never trust blindly for prod ops.  
4. Full CSP not shipped (baseline headers only).  
5. Sitemap lists guide URLs for eligible procedures; DEMO pages retain page-level noindex when labeled.

---

## 7. Owner approval required before DEPLOYMENT READY

- [ ] Confirm Preview DB ≠ Production DB (ref check, no secrets in chat)
- [ ] Enable/verify Vercel Preview Deployment Protection
- [ ] Decide when to set Production `WARAQA_PUBLIC_CONTENT_MODE=production`
- [ ] Approve any Production migration / redeploy window
- [ ] Approve any DEMO → PRODUCTION editorial promotions (per procedure)
- [ ] Sign post-deploy smoke (Admin + Golden path)

---

## 8. Final labels

| Label | Phase 14-A |
| --- | --- |
| ENGINEERING READY | **YES** (when PR gates green) |
| DEPLOYMENT READY | **NO** |
| PRODUCTION LAUNCHED | **NO** |
| Phase 14 COMPLETE | **NO** |

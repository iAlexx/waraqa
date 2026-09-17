# Production / deployment smoke checklist (Phase 14-A)

**Scope:** Non-destructive checks against a deployed origin.  
**Does not:** write to the database, embed credentials, or prove Admin password validity.

Automated helper:

```powershell
$env:WARAQA_SMOKE_BASE_URL = "https://waraqa-eta.vercel.app"
# When the target intentionally serves DEMO public content:
# $env:WARAQA_SMOKE_EXPECT_DEMO = "1"
pnpm smoke:deploy
```

`WARAQA_SMOKE_BASE_URL` is **required** (no `.env.local` fallback). Health must be HTTP **200** (503 is a diagnosed failure). Missing transaction slugs must return HTTP **404**.

---

## Automated (read-only)

| Check | Expected |
| --- | --- |
| Homepage | HTTP 200; RTL; independence / brand signal |
| Arabic search | HTTP 200 |
| Transaction detail | DEMO mode (`WARAQA_SMOKE_EXPECT_DEMO=1`): Golden Demo **200** + DEMO label; production mode: Golden Demo **404** |
| `/api/health` | **200 only** (503 = unhealthy — fail + diagnose) |
| `/robots.txt` | 200; under DEMO expectation, Disallow:/ present |
| `/sitemap.xml` | 200; no `/admin` or `/preview/`; under DEMO expectation, no `p12-demo` procedure URLs |
| `/admin` | Responds with auth UI (no login attempt) |
| Security header | `X-Content-Type-Options: nosniff` |
| Unknown slug | **HTTP 404** (200 is a failure) |

---

## Manual owner checks

| Check | Notes |
| --- | --- |
| Admin login | Use personal admin only; never paste password into chat |
| Golden path | Home → Search → Procedure → Guide → Result |
| DEMO label | Visible on DEMO procedures when mode=`demo` |
| Independence disclaimer | Visible on public shell / result |
| Draft isolation | Unpublished draft not on public URL |
| QA_TEST isolation | Never on public search/detail |
| Print Preview | Already signed off in Phase 13; spot-check after major print CSS changes |
| Mobile RTL | 360px: no critical horizontal overflow |
| Preview protection | Vercel Deployment Protection enabled (robots ≠ auth) |

---

## Pass criteria for DEPLOYMENT READY (later)

All automated checks green **and** owner signs the manual Admin + Golden path rows after a controlled deploy of an approved SHA.

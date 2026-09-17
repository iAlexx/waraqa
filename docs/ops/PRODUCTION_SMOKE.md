# Production / deployment smoke checklist (Phase 14-A)

**Scope:** Non-destructive checks against a deployed origin.  
**Does not:** write to the database, embed credentials, or prove Admin password validity.

Automated helper:

```powershell
$env:WARAQA_SMOKE_BASE_URL = "https://waraqa-eta.vercel.app"
pnpm smoke:deploy
```

---

## Automated (read-only)

| Check | Expected |
| --- | --- |
| Homepage | HTTP 200; RTL; independence / brand signal |
| Arabic search | HTTP 200 |
| Transaction detail | 200 if publicly eligible, or 404 if mode hides DEMO |
| `/api/health` | 200 or 503; no secrets in body |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200; no `/admin` or `/preview/` URLs |
| `/admin` | Responds with auth UI (no login attempt) |
| Security header | `X-Content-Type-Options: nosniff` (when Phase 14-A headers shipped) |
| Unknown slug | Not HTTP 500 |

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

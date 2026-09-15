# Phase 13 — Source health (seven Phase 12 Sources)

**Checked:** 2026-09-14 (HTTP GET/HEAD from developer machine)  
**Policy:** Do not silently rewrite Claims from a transient HTTP response. If facts changed, mark Claims for review.

| Slug | URL | HTTP | Notes |
|------|-----|------|-------|
| `p12-demo-src-sana-secondary-equivalency` | https://sana.sy/education/2542204/ | 200 | Reachable |
| `p12-demo-src-sana-eq-anan` | https://sana.sy/education/2542861/ | 200 | Reachable |
| `p12-demo-src-sana-eq-supp-suspension` | https://sana.sy/education/2425127/ | 200 | Reachable |
| `p12-demo-src-mofa-poa` | https://mofaex.gov.sy/services/…تنظيم-وكالات… | 200 | Reachable |
| `p12-demo-src-mofa-marriage` | https://mofaex.gov.sy/services/…تسجيل-الزواج | 200 | Reachable |
| `p12-demo-src-mofa-civil-extract` | https://mofaex.gov.sy/services/…استخراج-وثيقة… | 200 | Reachable |
| `p12-demo-src-mofa-passport-renew` | https://mofaex.gov.sy/services/…تجديد-جواز… | 200 | Reachable |

**Broken/stale links:** none observed at check time.  
**Material fact drift:** not re-transcribed in this pass; Phase 12 forensic content remains authoritative until an editorial Claim review.

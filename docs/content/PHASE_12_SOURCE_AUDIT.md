# Phase 12 — Source Audit

**Initial open:** 2026-09-13 (`PHASE12_CHECKED_AT` in catalog markers)  
**Forensic pass:** 2026-09-14 (durations, Anan clarification, supplementary-exam conflict, POA branch completeness)  
**contentClass for all seeded items:** `DEMO`  
**Independence:** WARAQA is not a government service; sources remain with the state.  
**Catalog truth:** `src/lib/content/phase12/catalog.ts` + `markers.ts` — this audit must match those files.

## Governance note (seed path)

Phase 12 seeding does **not** forge trust:

- Taxonomy / documents / sources may use `context.seed` under `ALLOW_QA_FIXTURE=1` + `WARAQA_ALLOW_PHASE12_SEED=1`.
- Claims are scaffolded DRAFT / INTERNAL_ONLY (no `reviewedBy` / `verifiedAt`), then promoted by a real reviewer update **without** seed context.
- Transactions stay draft until `submitForReview` → `approve` → `publish` via the workflow service; the seed never sets `claimTrustOk` or the approval fingerprint.

See header comments in `src/lib/content/phase12/seed.ts`.

---

## Selection summary

### Selected (5) — DEMO seed procedures

| # | Procedure slug | Title | Why qualified |
|---|---------------|-------|---------------|
| 1 | `p12-demo-tx-secondary-equivalency` | معادلة شهادة ثانوية غير سورية | Three opened SANA items; real CONFLICTED supplementary-exam claim; Golden Demo |
| 2 | `p12-demo-tx-poa-mission` | تنظيم وكالة في بعثة دبلوماسية سورية | Opened MFA page; same-day duration; conditional doc branches incl. company / minor / guardianship / other_special |
| 3 | `p12-demo-tx-marriage-mission` | تسجيل زواج عبر بعثة دبلوماسية سورية | Opened MFA page; 15–25 min duration + workload caveat; nationality-dependent attendance |
| 4 | `p12-demo-tx-civil-extract-mission` | استخراج وثيقة أحوال مدنية عبر البعثة | Opened MFA page; same-day duration; document kinds |
| 5 | `p12-demo-tx-passport-renew-mission` | تجديد جواز سفر منتهٍ عبر البعثة | Opened MFA page; minor / national-id / residence branches; **no** published processing duration |

### Deferred / rejected candidates (still listed)

| Candidate | Why deferred / rejected |
|-----------|-------------------------|
| إصدار جواز سفر لأول مرة عبر البعثة | Avoid passport-family duplication; renew-expired chosen instead |
| تصديق وثائق داخل سورية عبر مكاتب الخارجية | Service page not opened to the same depth as the five selected MFA pages |
| رسوم جواز عبر أنجز / أرقام رسوم ثانوية | Secondary fee figures without an opened official fee schedule — fabrication risk |
| قبول جامعي عبر uni.sy | Access blocked / unreliable during audit (Cloudflare) |
| خدمات عبر ecsc.gov.sy | Fetch timeout — not used as evidence |
| تسجيل ولادات عبر البعثة | Strong candidate; deferred to keep five journeys diverse without excess civil-status overlap |

---

## All opened sources (7)

| Slug | URL | Type | Agency | Role |
|------|-----|------|--------|------|
| `p12-demo-src-sana-secondary-equivalency` | https://sana.sy/education/2542204/ | announcement | MoE via SANA | Earlier MoE rules; SUPPORTS on several eq claims; SUPPORTS side of supplementary CONFLICT |
| `p12-demo-src-sana-eq-anan` | https://sana.sy/education/2542861/ | announcement | MoE via SANA | **Preferred** clarification: year-round intake, attestation chain, proxy submitter, Arabic+social cancel; CONTRADICTS on general supplementary claim |
| `p12-demo-src-sana-eq-supp-suspension` | https://sana.sy/education/2425127/ | announcement | MoE via SANA | Scoped Syrian complementary-exam suspension 2025-2026 / 2026-2027; CONTRADICTS on general supplementary claim |
| `p12-demo-src-mofa-poa` | [MFA — تنظيم الوكالات](https://mofaex.gov.sy/services/%D8%AA%D9%86%D8%B8%D9%8A%D9%85-%D9%88%D9%83%D8%A7%D9%84%D8%A7%D8%AA-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B9%D8%AB%D8%A7%D8%AA-%D8%A7%D9%84%D8%AF%D8%A8%D9%84%D9%88%D9%85%D8%A7%D8%B3%D9%8A%D8%A9) | official_webpage | MFA | Primary for POA |
| `p12-demo-src-mofa-marriage` | [MFA — تسجيل الزواج](https://mofaex.gov.sy/services/%D8%A3%D8%AD%D9%88%D8%A7%D9%84-%D9%85%D8%AF%D9%86%D9%8A%D8%A9-%D8%AA%D8%B3%D8%AC%D9%8A%D9%84-%D8%A7%D9%84%D8%B2%D9%88%D8%A7%D8%AC) | official_webpage | MFA | Primary for marriage |
| `p12-demo-src-mofa-civil-extract` | [MFA — استخراج وثيقة أحوال مدنية](https://mofaex.gov.sy/services/%D8%A7%D8%B3%D8%AA%D8%AE%D8%B1%D8%A7%D8%AC-%D9%88%D8%AB%D9%8A%D9%82%D8%A9-%D8%A3%D8%AD%D9%88%D8%A7%D9%84-%D9%85%D8%AF%D9%86%D9%8A%D8%A9) | official_webpage | MFA | Primary for civil extract |
| `p12-demo-src-mofa-passport-renew` | [MFA — تجديد جواز بدل عن منتهي](https://mofaex.gov.sy/services/%D8%AA%D8%AC%D8%AF%D9%8A%D8%AF-%D8%AC%D9%88%D8%A7%D8%B2-%D8%A7%D9%84%D8%B3%D9%81%D8%B1-%D8%A8%D8%AF%D9%84-%D8%B9%D9%86-%D9%85%D9%86%D8%AA%D9%87%D9%8A) | official_webpage | MFA | Primary for passport renew |

---

## 1. معادلة شهادة ثانوية غير سورية

- **Responsible authority (as cited):** وزارة التربية والتعليم (via SANA)
- **Primary source (preferred where sources differ):** https://sana.sy/education/2542861/ (Anan clarification)
- **Supporting sources:** https://sana.sy/education/2542204/ (earlier announcement, MoE statement dated 2026-08-01); https://sana.sy/education/2425127/ (scoped complementary-exam suspension)
- **Source type:** `announcement` (official news agency — not ministry webpages)
- **Dates checked:** opened 2026-09-13; forensic reconciliation 2026-09-14
- **Sections supported:** channel (exam departments in governorate education directorates); year-round intake; attestation chain; base documents + PDF bundle; non-Arab sworn Arabic translation; proxy submitter; conditional acceptance before full attestation; outcome (equivalency document); fee *existence* without amount; supplementary-exam conflict surface
- **Processing duration:** **None published** as a processing-time estimate. Year-round intake is **not** a duration — transaction intentionally has no `estimatedDuration`.
- **Fees:** Amount/currency **unknown** — source mentions a determined financial fee without a number → `NEEDS_OFFICIAL_CONFIRMATION`
- **Attestation chain (from Anan / 2542861):** issuing education authority → issuing-country MFA → Syrian MFA (وزارة الخارجية والمغتربين السورية)
- **Year-round intake (from Anan / 2542861):** applications accepted throughout the year, including during the university admission period
- **CONFLICTS — supplementary / complementary exams (do not claim “no conflicts”):**
  1. **Earlier SANA (2542204):** language about possible complementary / make-up exams when core branch subjects are missing
  2. **Later Anan clarification (2542861):** cancellation of complementary exams in Arabic + social studies for foreign certificate holders
  3. **Scoped suspension (2425127):** complementary exam suspended for **Syrian students** for school years **2025-2026** and **2026-2027** only
  - Catalog models this as claim `claim_p12_eq_supplementary_exams` = **CONFLICTED** / `PUBLIC_WITH_WARNING`, with SUPPORTS + CONTRADICTS evidence rows. Scoped cancel and Syrian suspension are separate VERIFIED warning claims, not a resolution of the general conflict.
- **Known gaps:** fee amount; Telegram originals not separately archived; no MoE HTML service page opened
- **Freshness:** Anan clarification preferred over the August announcement where they differ; conflict on exams remains explicit

---

## 2. تنظيم وكالة في بعثة دبلوماسية سورية

- **Authority:** وزارة الخارجية والمغتربين
- **URL:** MFA official services page (slug `p12-demo-src-mofa-poa`)
- **Type:** `official_webpage`
- **Dates checked:** 2026-09-13 open; 2026-09-14 forensic (duration + branch completeness)
- **Sections:** channel (consular services hall + MOFA SY appointment); eligibility (Syrians / equivalents + foreigners); base docs; conditional docs by purpose; validity (1 calendar year for acceptance/attestation in Syria); same-day completion; outcome (e-stamp sticker copy)
- **Duration (present):** **same-day** completion stated on the service page → recorded as `estimatedDuration` (0–1 calendar day) and claim `claim_p12_poa_duration` VERIFIED. No invented multi-day business range.
- **Fees:** Page defers to «دليل الرسوم» — **amount unknown** → `claim_p12_poa_fee_amount` NEEDS_OFFICIAL_CONFIRMATION
- **Guide / conditional branches modeled:** property, marriage, vehicle, **company**, **minor**, **guardianship**, **other_special** (explicit unmodeled path — do not pretend the list is complete)
- **Conflicts:** None among opened MFA material for this procedure
- **Gaps:** Numeric fee only

---

## 3. تسجيل زواج عبر بعثة دبلوماسية سورية

- **Authority:** وزارة الخارجية والمغتربين
- **URL:** MFA official services page (slug `p12-demo-src-mofa-marriage`)
- **Type:** `official_webpage`
- **Dates checked:** 2026-09-13 open; 2026-09-14 forensic (duration + attendance)
- **Sections:** channel (attestations hall + MOFA SY); eligibility (Syrians and equivalents); documents (incl. Syrian wife civil extract ≤6 months); **nationality-dependent personal attendance**; instruction that the mission does not register the marriage in the foreign country (two proxies needed inside Syria); outcome
- **Duration (present):** **15–25 minutes** on the service page, **may extend with mission workload** → `estimatedDuration` + claim `claim_p12_mar_duration` VERIFIED
- **Attendance:** Husband attends in person if Syrian; if husband is not Syrian, the Syrian wife attends in person
- **Fees:** Amount **unknown** (pay fees / fee guide mentioned without a number)
- **Conflicts:** None in opened page
- **Gaps:** Numeric fee only

---

## 4. استخراج وثيقة أحوال مدنية عبر البعثة

- **Authority:** وزارة الخارجية والمغتربين
- **URL:** MFA official services page (slug `p12-demo-src-mofa-civil-extract`)
- **Type:** `official_webpage`
- **Dates checked:** 2026-09-13 open; 2026-09-14 forensic (duration)
- **Sections:** channel; eligibility (Syrian citizens); document kinds (individual/family extract, marriage, divorce, birth, death); identity proof ≤6 months; outcome
- **Duration (present):** **same-day** completion stated → `estimatedDuration` + claim `claim_p12_civ_duration` VERIFIED
- **Fees:** Amount **unknown** / not published in opened page body
- **Conflicts:** None
- **Gaps:** Numeric fee only

---

## 5. تجديد جواز سفر منتهٍ عبر البعثة

- **Authority:** وزارة الخارجية والمغتربين
- **URL:** MFA official services page (slug `p12-demo-src-mofa-passport-renew`)
- **Type:** `official_webpage`
- **Dates checked:** 2026-09-13 open; 2026-09-14 forensic (confirm **no** duration)
- **Sections:** channel (passport issuance system / attestations hall + MOFA SY); eligibility; document list; minor/guardian rules; fingerprint ages 15–70; long-validity residence/visa condition; outcome
- **Duration:** **Not published** on the service page — transaction intentionally carries **no** `estimatedDuration` and **no** duration claim. Do not invent one.
- **Fees:** Amount **unknown**
- **Conflicts:** None
- **Gaps:** Numeric fee; processing time absent by design in the catalog

---

## Cross-cutting forensic closure notes

| Topic | Forensic finding |
|-------|------------------|
| Fees | All five procedures: amounts still **unknown** / NEEDS_OFFICIAL_CONFIRMATION — never invent numbers |
| MFA durations | POA same day; marriage 15–25 min + workload caveat; civil same day — **present** and claimed |
| Passport duration | **Absent** — no claim, no `estimatedDuration` |
| Equivalency duration | **Absent** as processing time — year-round intake ≠ duration |
| Equivalency exams | **Real conflict** across 2542204 / 2542861 / 2425127 — CONFLICTED claim retained |
| Attestation + intake | From Anan source 2542861 |
| contentClass | DEMO only — **not PRODUCTION** |
| Evidence rule | Search snippets alone never used; paraphrase only from opened pages |

---

## Policy reminders

- No long source passages copied into the product.
- No invented addresses, phones, hours, fee amounts, or processing times.
- All Phase 12 seeded Sources / Claims / Transactions use `contentClass = DEMO`.
- Deferred candidates remain documented above for audit transparency.

# Phase 12 — Content Review Matrix

**Reviewer identity (seed):** `phase12-content-reviewer@waraqa.local`  
**Catalog open date:** 2026-09-13 (`PHASE12_CHECKED_AT`)  
**Forensic content review:** 2026-09-14  
**contentClass:** `DEMO` for **all** claims, sources, and transactions  
**Public visibility:** only when `WARAQA_PUBLIC_CONTENT_MODE=demo`  
**Public label:** بيانات تجريبية للعرض — ليست معلومات رسمية  
**PRODUCTION promotion:** none

## Governance coherence (required for READY_FOR_DEMO)

READY_FOR_DEMO requires content coherence **and** passed closure gates on this forensic head: real reviewer/workflow governance, canonical P11-B readiness for all five, unit/int/build green, Phase 12 Playwright with healthy DB (seeded twice), and GitHub CI SUCCESS.

| Gate | Content expectation |
|------|---------------------|
| Claims | Catalog statuses match evidence (incl. honest CONFLICTED); authoritative candidates only on VERIFIED PUBLIC (or equivalent) claims used as required bindings |
| Seed | Claims scaffolded DRAFT/INTERNAL_ONLY → reviewer promotes without seed context; txs go submit → approve → publish |
| Trust stamps | Seed never forges `reviewedBy` / `verifiedAt` / `claimTrustOk` / approval fingerprint |
| contentClass | DEMO everywhere — never mark PRODUCTION in this review |
| Fees / durations | Fee amounts never invented; durations only where the opened page states them |
| Taxonomy | Production mode does not leak empty Phase12 DEMO-only category filters |

### Catalog claim status snapshot (forensic)

| Status | Approx. role in Phase 12 |
|--------|--------------------------|
| VERIFIED | Channel, docs, outcomes, MFA durations where present, year-round intake, attestation chain, scoped warning claims |
| CONFLICTED | `claim_p12_eq_supplementary_exams` only (three-source conflict) |
| NEEDS_OFFICIAL_CONFIRMATION | All five `*_fee_amount` claims |
| UNKNOWN | none in current catalog |

---

## 1. معادلة شهادة ثانوية غير سورية — READY_FOR_DEMO (Golden Demo)

**Slug:** `p12-demo-tx-secondary-equivalency`  
**Primary source:** SANA Anan clarification (2542861)  
**Supporting:** SANA 2542204 + SANA 2425127  
**Duration row:** none (no processing duration published; year-round intake ≠ duration)

| Section | Claim key | Status | Permission | Binding | Notes |
|---------|-----------|--------|------------|---------|-------|
| Channel | `claim_p12_eq_channel` | VERIFIED | PUBLIC | required | Exam departments; dual SUPPORTS |
| Year-round intake | `claim_p12_eq_intake_year_round` | VERIFIED | PUBLIC | required | From Anan; replaces retired freshness uncertainty |
| Attestation chain | `claim_p12_eq_attestation_chain` | VERIFIED | PUBLIC | required | Education authority → host MFA → Syrian MFA |
| Docs base | `claim_p12_eq_docs_base` | VERIFIED | PUBLIC | required | Certificate, transcript, ID, PDF |
| Non-Arab translation | `claim_p12_eq_docs_non_arab` | VERIFIED | PUBLIC | required | Sworn Arabic translation |
| Proxy submitter | `claim_p12_eq_proxy_submitter` | VERIFIED | PUBLIC | required | Any person may submit complete file |
| Conditional accept | `claim_p12_eq_conditional_accept` | VERIFIED | PUBLIC | required | Conditional before full attestation |
| Outcome | `claim_p12_eq_outcome` | VERIFIED | PUBLIC | required | Equivalency document after verification |
| Supplementary exams (general) | `claim_p12_eq_supplementary_exams` | **CONFLICTED** | PUBLIC_WITH_WARNING | optional | SUPPORTS 2542204; CONTRADICTS Anan + suspension — **do not treat as resolved** |
| Arabic + social cancel (scoped) | `claim_p12_eq_arabic_social_cancel` | VERIFIED | PUBLIC_WITH_WARNING | optional | Anan only; warn vs earlier announcement |
| Syrian suspension (scoped) | `claim_p12_eq_supp_syrian_suspension` | VERIFIED | PUBLIC_WITH_WARNING | optional | 2025-2026 / 2026-2027 Syrian students only |
| Fee amount | `claim_p12_eq_fee_amount` | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional | Amount unknown |

**Guide paths:** `arab` / `non_arab`; optional `missing_core_subjects` → conflict notice  
**contentClass:** DEMO  
**Verdict:** READY_FOR_DEMO (Golden Demo / حالة اختبار عملية)

---

## 2. تنظيم وكالة في بعثة دبلوماسية سورية — READY_FOR_DEMO

**Slug:** `p12-demo-tx-poa-mission`  
**Primary source:** MFA POA service page  
**Duration row:** same day (0–1 calendar day) — claim `claim_p12_poa_duration` VERIFIED / PUBLIC / required

| Section | Claim key | Status | Permission | Binding |
|---------|-----------|--------|------------|---------|
| Channel | `claim_p12_poa_channel` | VERIFIED | PUBLIC | required |
| Eligibility | `claim_p12_poa_eligibility` | VERIFIED | PUBLIC | required |
| Docs base | `claim_p12_poa_docs_base` | VERIFIED | PUBLIC | required |
| Docs conditional | `claim_p12_poa_docs_conditional` | VERIFIED | PUBLIC | required |
| Validity | `claim_p12_poa_validity` | VERIFIED | PUBLIC | required |
| Duration | `claim_p12_poa_duration` | VERIFIED | PUBLIC | required |
| Outcome | `claim_p12_poa_outcome` | VERIFIED | PUBLIC | required |
| Fee amount | `claim_p12_poa_fee_amount` | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide branches (purpose):** `property` | `marriage` | `vehicle` | `company` | `minor` | `guardianship` | `other_special` (unmodeled → warning notice; no false completeness)  
**contentClass:** DEMO  
**Verdict:** READY_FOR_DEMO

---

## 3. تسجيل زواج عبر بعثة دبلوماسية سورية — READY_FOR_DEMO

**Slug:** `p12-demo-tx-marriage-mission`  
**Primary source:** MFA marriage service page  
**Duration row:** 15–25 minutes; may extend with mission workload — claim `claim_p12_mar_duration` VERIFIED / PUBLIC / required  
**Attendance:** nationality-dependent — claim `claim_p12_mar_attendance` (Syrian husband attends; else Syrian wife attends)

| Section | Claim key | Status | Permission | Binding |
|---------|-----------|--------|------------|---------|
| Channel | `claim_p12_mar_channel` | VERIFIED | PUBLIC | required |
| Eligibility | `claim_p12_mar_eligibility` | VERIFIED | PUBLIC | required |
| Docs | `claim_p12_mar_docs` | VERIFIED | PUBLIC | required |
| Attendance | `claim_p12_mar_attendance` | VERIFIED | PUBLIC | required |
| Syria registration instruction | `claim_p12_mar_instruction` | VERIFIED | PUBLIC | required |
| Duration | `claim_p12_mar_duration` | VERIFIED | PUBLIC | required |
| Outcome | `claim_p12_mar_outcome` | VERIFIED | PUBLIC | required |
| Fee amount | `claim_p12_mar_fee_amount` | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide paths:** wife Syrian yes/no (extract doc); husband Syrian yes/no (attendance notices); both non-Syrian → mission-check warning  
**contentClass:** DEMO  
**Verdict:** READY_FOR_DEMO

---

## 4. استخراج وثيقة أحوال مدنية عبر البعثة — READY_FOR_DEMO

**Slug:** `p12-demo-tx-civil-extract-mission`  
**Primary source:** MFA civil-extract service page  
**Duration row:** same day (0–1 calendar day) — claim `claim_p12_civ_duration` VERIFIED / PUBLIC / required

| Section | Claim key | Status | Permission | Binding |
|---------|-----------|--------|------------|---------|
| Channel | `claim_p12_civ_channel` | VERIFIED | PUBLIC | required |
| Eligibility | `claim_p12_civ_eligibility` | VERIFIED | PUBLIC | required |
| Docs | `claim_p12_civ_docs` | VERIFIED | PUBLIC | required |
| Document kinds | `claim_p12_civ_doc_kinds` | VERIFIED | PUBLIC | required |
| Duration | `claim_p12_civ_duration` | VERIFIED | PUBLIC | required |
| Outcome | `claim_p12_civ_outcome` | VERIFIED | PUBLIC | required |
| Fee amount | `claim_p12_civ_fee_amount` | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** six document kinds (variant labeling; same base identity doc)  
**contentClass:** DEMO  
**Verdict:** READY_FOR_DEMO

---

## 5. تجديد جواز سفر منتهٍ عبر البعثة — READY_FOR_DEMO

**Slug:** `p12-demo-tx-passport-renew-mission`  
**Primary source:** MFA passport renew (expired) page  
**Duration row:** **absent** — no duration claim; no `estimatedDuration`

| Section | Claim key | Status | Permission | Binding |
|---------|-----------|--------|------------|---------|
| Channel | `claim_p12_pas_channel` | VERIFIED | PUBLIC | required |
| Eligibility | `claim_p12_pas_eligibility` | VERIFIED | PUBLIC | required |
| Docs | `claim_p12_pas_docs` | VERIFIED | PUBLIC | required |
| Minor / guardian rules | `claim_p12_pas_minor_rules` | VERIFIED | PUBLIC | required |
| Outcome | `claim_p12_pas_outcome` | VERIFIED | PUBLIC | required |
| Fee amount | `claim_p12_pas_fee_amount` | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** minor × missing national id × long validity (residence/visa)  
**contentClass:** DEMO  
**Verdict:** READY_FOR_DEMO

---

## Aggregate

| Procedure | contentClass | Duration in catalog | Verdict |
|-----------|--------------|---------------------|---------|
| معادلة شهادة ثانوية غير سورية | DEMO | none (processing) | READY_FOR_DEMO |
| تنظيم وكالة في بعثة دبلوماسية سورية | DEMO | same day | READY_FOR_DEMO |
| تسجيل زواج عبر بعثة دبلوماسية سورية | DEMO | 15–25 min + workload caveat | READY_FOR_DEMO |
| استخراج وثيقة أحوال مدنية عبر البعثة | DEMO | same day | READY_FOR_DEMO |
| تجديد جواز سفر منتهٍ عبر البعثة | DEMO | none published | READY_FOR_DEMO |

**Five READY_FOR_DEMO:** yes  
**Honest CONFLICTED claim retained:** `claim_p12_eq_supplementary_exams`  
**PRODUCTION promotion:** none  
**PRODUCTION:** none  
**QA_TEST:** none

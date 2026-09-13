# Phase 12 — Content Review Matrix

**Reviewer identity (seed):** `phase12-content-reviewer@waraqa.local`  
**Checked:** 2026-09-13  
**contentClass:** DEMO for all five  
**Public visibility:** only when `WARAQA_PUBLIC_CONTENT_MODE=demo`  
**Label:** بيانات تجريبية للعرض — ليست معلومات رسمية

Claim status counts (catalog): see seed/unit reports — VERIFIED authoritative + NEEDS_OFFICIAL_CONFIRMATION for fee/freshness gaps.

---

## 1. معادلة شهادة ثانوية غير سورية — READY_FOR_DEMO

| Section | Claim key | Status | Permission | Source(s) | Trust | Class | Uncertainty | Guide paths |
|---------|-----------|--------|------------|-----------|-------|-------|-------------|-------------|
| Channel | claim_p12_eq_channel | VERIFIED | PUBLIC | SANA | AUTHORITATIVE (required) | DEMO | Confirm local intake | arab / non_arab / incomplete |
| Docs base | claim_p12_eq_docs_base | VERIFIED | PUBLIC | SANA | AUTHORITATIVE | DEMO | — | same |
| Non-Arab translation | claim_p12_eq_docs_non_arab | VERIFIED | PUBLIC | SANA | AUTHORITATIVE | DEMO | — | non_arab includes translation |
| Conditional accept | claim_p12_eq_conditional_accept | VERIFIED | PUBLIC | SANA | AUTHORITATIVE | DEMO | — | notices |
| Supplementary exams | claim_p12_eq_supplementary_exams | VERIFIED | PUBLIC | SANA | AUTHORITATIVE | DEMO | — | optional yes path |
| Fee amount | claim_p12_eq_fee_amount | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | SANA | WARNING_ONLY (optional) | DEMO | Amount unknown | fee notice |
| Intake freshness | claim_p12_eq_intake_freshness | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | SANA | WARNING_ONLY (optional) | DEMO | Post-Aug window | freshness notice |

**Guide coverage:** arab, non_arab, non_arab+missing subjects, incomplete origin  
**Verdict:** READY_FOR_DEMO (Golden Demo / حالة اختبار عملية)

---

## 2. تنظيم وكالة في بعثة دبلوماسية سورية — READY_FOR_DEMO

| Section | Claim key | Status | Permission | Trust role |
|---------|-----------|--------|------------|------------|
| Channel | claim_p12_poa_channel | VERIFIED | PUBLIC | required AUTHORITATIVE |
| Eligibility | claim_p12_poa_eligibility | VERIFIED | PUBLIC | required |
| Docs base | claim_p12_poa_docs_base | VERIFIED | PUBLIC | required |
| Docs conditional | claim_p12_poa_docs_conditional | VERIFIED | PUBLIC | required |
| Validity | claim_p12_poa_validity | VERIFIED | PUBLIC | required |
| Fee amount | claim_p12_poa_fee_amount | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** general / property / marriage / vehicle  
**Verdict:** READY_FOR_DEMO

---

## 3. تسجيل زواج عبر بعثة دبلوماسية سورية — READY_FOR_DEMO

| Claim key | Status | Permission | Role |
|-----------|--------|------------|------|
| claim_p12_mar_channel | VERIFIED | PUBLIC | required |
| claim_p12_mar_eligibility | VERIFIED | PUBLIC | required |
| claim_p12_mar_docs | VERIFIED | PUBLIC | required |
| claim_p12_mar_instruction | VERIFIED | PUBLIC | required |
| claim_p12_mar_fee_amount | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** wife Syrian yes/no + incomplete  
**Verdict:** READY_FOR_DEMO

---

## 4. استخراج وثيقة أحوال مدنية عبر البعثة — READY_FOR_DEMO

| Claim key | Status | Permission | Role |
|-----------|--------|------------|------|
| claim_p12_civ_channel | VERIFIED | PUBLIC | required |
| claim_p12_civ_eligibility | VERIFIED | PUBLIC | required |
| claim_p12_civ_docs | VERIFIED | PUBLIC | required |
| claim_p12_civ_doc_kinds | VERIFIED | PUBLIC | required |
| claim_p12_civ_fee_amount | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** six document kinds (variant labeling only; same base doc)  
**Verdict:** READY_FOR_DEMO

---

## 5. تجديد جواز سفر منتهٍ عبر البعثة — READY_FOR_DEMO

| Claim key | Status | Permission | Role |
|-----------|--------|------------|------|
| claim_p12_pas_channel | VERIFIED | PUBLIC | required |
| claim_p12_pas_eligibility | VERIFIED | PUBLIC | required |
| claim_p12_pas_docs | VERIFIED | PUBLIC | required |
| claim_p12_pas_minor_rules | VERIFIED | PUBLIC | required |
| claim_p12_pas_fee_amount | NEEDS_OFFICIAL_CONFIRMATION | PUBLIC_WITH_WARNING | optional |

**Guide coverage:** 2×2×2 matrix (minor × missing national id × long validity)  
**Verdict:** READY_FOR_DEMO

---

## Aggregate

| Procedure | Verdict |
|-----------|---------|
| معادلة شهادة ثانوية غير سورية | READY_FOR_DEMO |
| تنظيم وكالة في بعثة دبلوماسية سورية | READY_FOR_DEMO |
| تسجيل زواج عبر بعثة دبلوماسية سورية | READY_FOR_DEMO |
| استخراج وثيقة أحوال مدنية عبر البعثة | READY_FOR_DEMO |
| تجديد جواز سفر منتهٍ عبر البعثة | READY_FOR_DEMO |

**Five READY_FOR_DEMO:** yes  
**PRODUCTION promotion:** none (intentionally DEMO)  
**QA_TEST:** none

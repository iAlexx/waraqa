# Waraqa Content Model (Phase 3)

**Status:** Phase 3–12 COMPLETE (Phase 12 = DEMO seed content; not PRODUCTION certification)

**Migrations:** Phase 3 + Phase 4–6 + Phase 8 `20260720_041000_phase_8_interactive_guide` + P0-05A `20260721_051000_p0_05a_claims_foundation` + P0-06 `20260722_100000_p0_06_content_class_isolation` (+ Phase 11 reviewDueAt indexes). Phase 12 adds **no schema migration** — content via Payload seed APIs.

**Last updated:** 2026-09-13

**Related:** [RBAC.md](./RBAC.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md), [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md), [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md), [CONTENT_ISOLATION.md](./CONTENT_ISOLATION.md), [content/PHASE_12_SOURCE_AUDIT.md](./content/PHASE_12_SOURCE_AUDIT.md), [content/PHASE_12_CONTENT_REVIEW.md](./content/PHASE_12_CONTENT_REVIEW.md)

## Naming / scope decisions (documented)

| Topic | Decision |
| --- | --- |
| Collection slug | Roadmap slug **`transactions`** (Arabic labels معاملة / المعاملات). Owner Phase 3 brief preferred `procedures` — **roadmap wins**. |
| Roles | Roadmap: `admin` \| `reviewer` \| `researcher` \| `viewer`. Owner brief editor/publisher mapped as: **researcher ≈ editor** (cannot publish); **reviewer + admin** publish (**publisher** is not a separate role). |
| Site Settings | **Phase 3 minimum** Payload global `site-settings` (see below). Roadmap §14.15 / Phase 3 tasks include it; implementation is the minimal field set matching code — not the full §14.15 surface. **Public UI consumption = Phase 5.** |
| Outcome A — `transactions` timing | **Resolved 2026-07-18.** Original roadmap: Phase 3 had no Transaction collection; Phase 4 said “implement Transaction collection.” Owner authorized retaining the full `transactions` content model in Phase 3 (**COMPLETE — OWNER APPROVED**). Phase 4 extends **workflow only** (blocks, audit events, scheduled review, preview, approval invalidation) and **must not** rebuild/duplicate the schema. Phase 4 remains **not started**. |

## Shared conventions

| Convention | Rule |
| --- | --- |
| Locales | `ar` (default) + `en`, Payload `fallback: true` |
| Canonical slug | Non-localized, unique, normalized; Arabic/Latin lowercase + hyphens |
| Drafts / versions | Content collections use `versions.drafts` (`autosave: false`, `maxPerDoc: 20`) |
| Public read | Anonymous and `viewer`: `_status = published` **and** `active = true` |
| Content class (P0-06) | `transactions` / `claims` / `sources`: required `contentClass` (`PRODUCTION` \| `DEMO` \| `QA_TEST`, column `content_class`). Default create `QA_TEST`. Public surface filters via `WARAQA_PUBLIC_CONTENT_MODE` — see [CONTENT_ISOLATION.md](./CONTENT_ISOLATION.md). **IMPLEMENTED.** |
| Delete | **Admin only** (`adminOnlyDelete`) |
| Audit fields | `createdBy`, `lastUpdatedBy`, `publishedBy`, `publishedAt` (hook-populated, read-only in admin) |
| No Media uploads | No upload/Media collection — identity files out of scope; Vercel FS ephemeral |
| GraphQL | Disabled in Payload config |
| Postgres name length | Short `dbName` shortcuts on collections/fields that would exceed the **63-character** identifier limit (especially with localization + versions) |

### `dbName` shortcuts (Phase 3)

| Config path | `dbName` |
| --- | --- |
| `transactions` collection | `tx` |
| `service-centers` collection | `svc_centers` |
| `sources` collection | `sources` (explicit) |
| Document type / source type / verification | `dtype`, `stype`, `vstatus` |
| Transaction arrays / groups | `req_docs`, `steps`, `fees`, `duration`, `prereqs`, `srcs`, `reviewed_at`, `notes_int` |
| Phase 8 guide arrays | `questions`, `qopts`, `variants`, `notices`, `dec_rules`, `fx` |
| Nested field shortcuts | `rtype`, `qty`, `orig_req`, `copies`, `cert_req`, `cur`, `min`, `max`, `unit`, `gov` |
| Audience enum | `tx_audience` |

Migration file: `migrations/20260718_052746_phase_3_core_collections.ts` (+ `.json`).

---

## Collections

### 1. `users` — مستخدم / المستخدمون

**Purpose:** Payload auth users and RBAC roles. Admin group: النظام.

| Area | Detail |
| --- | --- |
| Auth | Payload local email/password |
| Key fields | `email`, `password` (auth), `name`, `displayName`, `role`, `isActive`, `preferredLocale` (`ar` \| `en`) |
| Localized | No (user prefs only) |
| Drafts/versions | No |
| Public read | None — not publicly readable |
| Delete | Admin only |
| Bootstrap | First user create allowed when zero users exist → forced `role: admin`, `isActive: true`. Later creates: admin only; default role `researcher`; no silent admin |

See [RBAC.md](./RBAC.md).

---

### 2. `categories` — تصنيف / التصنيفات

**Purpose:** Hierarchical taxonomy for procedures.

| Area | Detail |
| --- | --- |
| Key fields | Localized `name`, `description`; non-localized `slug`, `parent` → `categories`, `sortOrder`, `featured`, `active` + audit |
| Localized | `name`, `description` |
| Relationships | Optional self `parent` (self-parent blocked by hook) |
| Drafts/versions | Yes |
| Public read | Published + active |
| Delete | Admin only |

---

### 3. `agencies` — جهة / الجهات

**Purpose:** Official bodies that own or issue procedures and sources.

| Area | Detail |
| --- | --- |
| Key fields | Localized `name`, `shortName`, `description`, `mainAddress`; non-localized `slug`, `type`, `officialWebsite`, `contactEmail`, `phones[]`, `active` + audit |
| `type` | `ministry` \| `directorate` \| `public_institution` \| `municipality` \| `syndicate` \| `university` \| `other` |
| Localized | Names, description, main address |
| Drafts/versions | Yes |
| Public read | Published + active |
| Delete | Admin only |

---

### 4. `service-centers` — مركز خدمة / مراكز الخدمة (`dbName: svc_centers`)

**Purpose:** Physical/service locations linked to an agency. Governorate is a fixed enum — no automatic geolocation of the user.

| Area | Detail |
| --- | --- |
| Key fields | Localized `name`, `city`, `address`, `workingHours`, `accessibilityNotes`; non-localized `slug`, `agency` → `agencies` (required), `governorate`, `phones[]`, optional `latitude` / `longitude`, `active` + audit |
| Localized | Name, city, address, hours, accessibility notes |
| Drafts/versions | Yes |
| Public read | Published + active |
| Delete | Admin only |

---

### 5. `documents` — وثيقة / الوثائق

**Purpose:** Catalog of citizen-facing document *types* required by procedures — **metadata only**, not file uploads.

| Area | Detail |
| --- | --- |
| Key fields | Localized `name`, `description`, `validityNote`, alias values; non-localized `slug`, `documentType`, `reusable`, `active` + audit |
| `documentType` | `identity` \| `civil_record` \| `application` \| `photograph` \| `receipt` \| `certificate` \| `approval` \| `contract` \| `form` \| `other` |
| Localized | Name, aliases, description, validity note |
| Drafts/versions | Yes |
| Public read | Published + active |
| Delete | Admin only |

---

### 6. `sources` — مصدر / المصادر

**Purpose:** Citable official sources for verification and public attribution.

| Area | Detail |
| --- | --- |
| Key fields | Localized `title`; localized private `notes`; non-localized `slug`, `sourceType`, `agency` → `agencies`, `officialUrl` (required HTTP(S)), `archiveUrl`, `referenceNumber`, `issuedAt`, `lastVerifiedAt`, `verificationStatus`, `active` + audit |
| `sourceType` | `official_webpage` \| `law` \| `decree` \| `decision` \| `circular` \| `official_form` \| `official_pdf` \| `announcement` \| `other` |
| `verificationStatus` | `needs_review` (default) \| `verified` \| `outdated` \| `unavailable` |
| Private | `notes` — editorial only; stripped for anonymous/viewer via `afterRead` |
| Drafts/versions | Yes |
| Public read | Published + active (without private notes / audit ids for non-editorial) |
| Delete | Admin only |

---

### 6b. `claims` — ادعاء / الادعاءات (P0-05A foundation)

**Purpose:** First-class discrete government-service facts that can be independently verified and linked to existing `sources` as evidence.

**IMPLEMENTED NOW (P0-05A storage + P0-05B1 publication safety):**
- Claim statement + stable `key`
- Status: `DRAFT` \| `NEEDS_REVIEW` \| `VERIFIED` \| `UNKNOWN` \| `CONFLICTED` \| `NEEDS_OFFICIAL_CONFIRMATION` \| `OUTDATED` \| `SUPERSEDED` \| `REJECTED`
- Publication permission: `INTERNAL_ONLY` \| `PUBLIC` \| `PUBLIC_WITH_WARNING` \| `BLOCKED`
- Evidence rows → `sources` with relation `SUPPORTS` \| `CONTRADICTS` \| `PARTIALLY_SUPPORTS` \| `SUPERSEDES` \| `CONTEXT_ONLY`
- Optional `transaction`, light `kind` / `scopeKind`+`scopeKey` for later binding
- Review metadata: `reviewedBy`, `verifiedAt`, `validFrom`, `validUntil`, `reviewDueAt`
- Drafts/versions + audit fields; editorial-only Admin read (not public API)
- Central `evaluateClaimTrust` / `evaluateSourceTrust`; transaction `claimBindings` + denormalized `claimTrustOk`
- Approve/publish gate + dynamic public fail-closed when claim/source trust collapses

**NOT IMPLEMENTED YET (P0-05B2+):**
- Evidence-bound Decision Engine / guide rule activation
- Citizen-facing UNKNOWN/CONFLICTED / warning UI
- Golden Demo content; per-field claim retrofit; separate Evidence collection

| Area | Detail |
| --- | --- |
| Key fields | Localized `statement`, `editorialNotes`; non-localized `key` (unique, stable), `status`, `publicationPermission`, `kind`, `scopeKind`, `scopeKey`, `transaction` → `transactions`, `evidence[]`, review dates, `active` + audit |
| `evidence[]` (`dbName: claim_ev`) | `source` → `sources`, `relationType`, optional `note`, `quoteOrLocator`, `checkedAt` |
| Drafts/versions | Yes (`maxPerDoc: 20`) |
| Public read | **None for claims** — editorial roles only (`authenticatedEditorialRead`) |
| Delete | Admin only |
| Migrations | `20260721_051000_p0_05a_claims_foundation`, `20260721_120000_p0_05b1_claim_trust_publication` |

Sources remain the citable URL/legal artifacts. Claims do **not** duplicate Source records.

---

### 7. `transactions` — معاملة / المعاملات (`dbName: tx`)

**Purpose:** Central guidance collection (administrative procedures). Full field model included in Phase 3 (**Outcome A** — owner-authorized; Phase 4 must not re-implement this schema).

#### Core fields

| Field | Localized? | Notes |
| --- | --- |
| `title` | Yes | Required; Arabic required to publish |
| `slug` | No | Canonical |
| `summary` | Yes | Required; Arabic required to publish |
| `category` | No | → `categories` (required) |
| `agency` | No | → `agencies` (required) |
| `serviceCenters` | No | → `service-centers` (hasMany) |
| `audiences` | No | Multi-select: citizen, resident, student, employee, business, visitor, other |
| `eligibility` | Yes | |
| `aliases[]` | Yes (`value`) | Phase 6 public search (exact / contains) |
| `searchText` | No | Phase 6 generated normalized blob (admin-hidden; stripped from public responses) |
| `outcome` | Yes | |
| `prerequisiteProcedures` | No | → `transactions` (hasMany); self-ref blocked |
| `lastReviewedAt` | No | **Required to publish** |
| `internalNotes` | No | Editorial-only; never returned on anonymous REST |
| `active` | No | Must be true for public visibility even when published |

**Phase 7 public detail:** maps the fields above into `PublicTransactionDetail` for `/transactions/[slug]` — see [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md). No schema rebuild; `aliases` / `searchText` / `internalNotes` / workflow fields stay off the public page. There is **no** `commonMistakes` field in this model.

**Phase 8 interactive guide (additive):** `guideEnabled`, `questions[]`, `variants[]`, `notices[]`, `decisionRules[]`; stable `key` on questions/options/variants/notices and on `requiredDocuments` / `steps` / `fees` rows. Public DTO + pure evaluator — see [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md). Answers are **not** persisted server-side in Phase 8.

#### Procedure document structure

**`requiredDocuments[]` (`dbName: req_docs`)**

- `document` → `documents` (required)
- `requirementType`: `required` \| `conditional` \| `alternative`
- `condition` (localized) — required when type is `conditional`
- `quantity`, `originalRequired`, `copiesRequired`, `certificationRequired`
- Localized `notes`
- No duplicate document rows on one transaction

**`steps[]` (min 1 row to publish)**

- Localized `title`, `description` (required), optional `locationNote`

**`fees[]`**

- Localized `label` (required)
- `amount` and/or localized `amountText` (at least one required per row)
- `currency`: SYP \| USD \| EUR \| other
- Localized `notes`

**`estimatedDuration` group**

- `minimum`, `maximum`, `unit` (minutes \| hours \| business_days \| calendar_days \| weeks)
- Localized `note`; max ≥ min when both set

**`sources[]` (`dbName: srcs`, min 1 row to publish)**

- `source` → `sources` (required)
- `primary` checkbox
- Localized `citationNote`
- No duplicate source rows on one transaction

#### Publish gates (server validation)

When `_status` becomes `published`, validation requires Arabic title + summary, category, agency, ≥1 step, ≥1 source, and `lastReviewedAt`. Researchers cannot set published status (see [RBAC.md](./RBAC.md)).

| Area | Detail |
| --- | --- |
| Drafts/versions | Yes |
| Public read | Published + active |
| Delete | Admin only |
| Hooks | Publish auth, audit stamps, self-prereq guard, procedure validation, strip `internalNotes` for non-editorial reads |

#### Admin information architecture (P11-A)

Payload **unnamed tabs** (presentation only — stored document shape stays flat; no migration). Sidebar fields stay outside tabs.

| Tab / area | Purpose |
| --- | --- |
| الأساسيات | Identity: title, slug, summary, category, agency, centers, audiences, aliases |
| محتوى الخدمة | Citizen-facing eligibility, outcome, duration, prerequisites |
| المتطلبات والخطوات | requiredDocuments, steps, fees |
| الدليل التفاعلي | Guide questions / variants / notices / decision rules (stable keys warned) |
| المصادر والأدلة | sources + claimBindings (`Source ≠ Claim`; filling a source does not permit publication) |
| المراجعة والنشر | lastReviewedAt, internalNotes, changeRequestComment, reviewDueOverrideReason, archiveReason |
| إعدادات متقدمة | Generated/internal (`searchText`) |
| Sidebar | publicationStatus, claimTrustOk, guideEnabled, workflow*, contentClass, active, audit |

**Editorial rules (admin help only):** `contentClass` ≠ verification; `PRODUCTION` does not mean verified; claim trust remains **server-enforced** (P0-05); public filtering remains P0-06. P11-A does not add blocker widgets (P11-B).

#### Admin readiness panel (P11-B)

Informational panel beside WorkflowActions (`GET /api/transactions/:id/readiness`, active `admin`/`reviewer`/`researcher` only).

| Axis | Meaning |
| --- | --- |
| جاهزية سير العمل / النشر | Same content gates as approve/publish (procedure + source evidence + required AUTHORITATIVE claims) + transition/hash notes |
| أهلية الظهور للعامة | P0-05 live claim trust + P0-06 contentClass + published/active/outdated/archived |

**Rules:**
- Workflow readiness ≠ public eligibility (e.g. QA_TEST may pass CMS gates but never public).
- `contentClass` ≠ verification.
- Stored `claimTrustOk` ≠ live authority; stale `true` surfaces as blocked.
- Panel is **informational**; approve/publish still re-run all server checks independently.
- Evaluation uses **last saved** draft document only.

#### Admin guide rule preview (P11-C)

Informational panel **معاينة قواعد الدليل** at the top of tab `الدليل التفاعلي` (`GET`/`POST /api/transactions/:id/guide-preview`, active `admin`/`reviewer`/`researcher` only).

**Rules:**
- Preview uses the **last saved** Transaction guide only; answers are ephemeral (not persisted to DB / localStorage / cookies).
- Evaluation reuses the **canonical** Decision Engine (`evaluateGuide`) + Phase 9 prune/sanitize — no alternate evaluator.
- `firedRuleKeys` are **diagnostic** only; they are not publication authority and do not bypass P0-05/P0-06.
- Preview does **not** mutate content, workflow, claims, or `contentClass`.
- Per-condition UNKNOWN detail is limited to rule keys whose `when` group is UNKNOWN (deeper condition diagnostics deferred).

#### Admin editorial dashboard + review-due (Phase 11 closure)

- **Dashboard:** `BeforeDashboard` + `GET /api/admin-ops/dashboard` — active `admin`/`reviewer` only. Cheap indexed `payload.count` cards (in_review txs, reviewDueAt ≤ now, open/in_review reports, changes_requested, assigned-to-me). No Claim-graph / readiness walks. Arabic labels; links to Admin list filters.
- **reviewDueAt:** List default column + cell labels متأخر / قريب / قادم (text + color). Separate from P11-B publication readiness. Filter via native Payload `reviewDueAt <= now`.
- **Transaction hard delete:** Server `beforeDelete` blocks previously published/approved/archived content **and** any Transaction with immutable `audit-events` actions `approved` | `published` | `archived` (so `restoreRevision` / `restoreArchived` cannot make historically published content hard-deletable). Linked reports blocked. Prefer archive. Never-published drafts may hard-delete. Seed/test cleanup only via `context.seed` + non-prod `allowSeedBypass`.
- **Report assignment:** Optional `assignedTo` validated only when the field is **changed**; stale inactive/demoted assignees are preserved until explicitly reassigned (new assignment still requires active admin/reviewer).

---

## Collection: `user-reports` — بلاغات المواطنين (Phase 10)

**Purpose:** Citizens report changed/outdated information about a publicly eligible Transaction. Reports are **never** public content.

| Field | Notes |
| --- | --- |
| `transaction` | Required relationship → `transactions` |
| `section` | `documents` \| `fees` \| `steps` \| `location` \| `duration` \| `source` \| `other` |
| `message` | Plain-text: what appears incorrect (required; max 2000). MVP collapses roadmap `reportedValue` into this field. |
| `encountered` | Plain-text: what the citizen encountered (required; max 2000). |
| `serviceCenter` | Optional relationship → `service-centers`; public submit accepts only centers linked to the Transaction |
| `sourceUrl` | Optional http(s) URL |
| `contactEmail` / `contactPhone` | Optional; **field-level read only for admin/reviewer** |
| `consentAccepted` | Required at submit |
| `status` | `open` \| `in_review` \| `resolved` \| `rejected` \| `spam` |
| `assignedTo` | Optional relationship → active `admin`/`reviewer` (Phase 11) |
| `reviewNotes` | Internal editorial notes |
| `resolutionSummary` | Authoritative closing reason; stamped only on transition into resolved/rejected |
| `lastResolutionSummary` | Preserved after reopen for editorial continuity (immutable detail also in audit-events) |
| `resolvedAt` / `resolvedBy` | Server-stamped **only** when entering resolved/rejected |

**Public entry:** CTA on eligible transaction detail → `/report-information?transaction=<slug>` → `POST /api/public/reports`.

**Eligibility:** Same P0-05 live claim trust + P0-06 `contentClass` gate as `loadPublicTransactionBySlug`. `QA_TEST` is never reportable. `DEMO` only when `WARAQA_PUBLIC_CONTENT_MODE=demo`.

**ACL:** Anonymous create only via the public submit path (`overrideAccess` + `context.publicReportSubmit`). Collection `create` is always false for clients. Read/update: active `admin` \| `reviewer` only. Delete: `admin` only. Researchers have **no** report access (minimum for roadmap: reviewers resolve reports).

**Spam controls:** Invisible honeypot (`website`); filled honeypot → HTTP success without persistence. PostgreSQL fixed-window rate limit on **IP-only** HMAC identity hash (User-Agent excluded; raw IP never stored). Buckets table `report_rate_buckets`; retain ~7 days. Vercel: trust `x-forwarded-for` / `x-real-ip`; missing/malformed IP → fail closed (503).

**Audit:** Editorial status transitions write `audit-events` **before** persist; failure aborts the update. Metadata includes recoverable `resolutionReason` (sanitized, capped). Citizen `report_received` remains best-effort so submit stays resilient. Assignment / reassignment writes `report_assigned` with `fromAssigneeId` / `toAssigneeId` only (no contact/message PII); audit write failure aborts the assignment change.

**Assignment (Phase 11):** Optional `assignedTo` → active `admin` \| `reviewer` only. Public submit rejects / strips `assignedTo`. Researchers and inactive users are not assignable and cannot triage. List column + filters support unassigned / assigned workflows. No notification system.

**Hard delete policy:** Admin-only. Prefer terminal status over delete for routine triage. Audit events remain by `entityId` after deletion.

**Notifications:** Deferred — no email adapter configured; Admin triage is sufficient.

**Out of scope / MVP schema decisions:** attachments; national ID; `reportedValue`/`suggestedValue` collapsed into `message`+`encountered`.

---

## Global: `site-settings` — إعدادات الموقع

**Purpose:** Minimal platform settings for later public shell wiring. **Phase 3 ships the CMS global only**; public UI reads these fields in **Phase 5**.

| Field | Notes |
| --- | --- |
| `siteName` | Localized; required |
| `tagline` | Localized |
| `independenceDisclaimer` | Localized; required |
| `footerDisclaimer` | Localized |
| `contactEmail` | Non-localized email |
| `supportPhone` | Non-localized; optional |
| `verificationPolicyDays` | Number; default `90` (editorial internal policy, not a public deadline) |
| `maintenanceMode` | Checkbox; Phase 3 internal flag only — does not drive public UI yet |
| `featuredTransactions` | Relationship → `transactions` (hasMany); consumed in Phase 5 home |

**Not in Phase 3 minimum** (roadmap §14.15 may list later): `socialLinks[]`, `searchExamples[]`, `homePageSections`, `analyticsEnabled`.

**Access (Phase 3):** authenticated active CMS users may read; `admin` / `reviewer` / `researcher` may update. No anonymous public read until Phase 5 wiring.

---

## Relationship overview

```text
categories (parent → categories)
agencies
service-centers → agencies
documents
sources → agencies
transactions → categories, agencies, service-centers[], documents (via requiredDocuments),
               sources (via sources[]), transactions (via prerequisiteProcedures)
site-settings → featuredTransactions[] → transactions
users ← audit fields on all content collections
```

## Explicitly not in Phase 3

- Full Site Settings surface beyond the minimal global above (social links, search examples, home sections, analytics)
- Public consumption of Site Settings (Phase 5)
- Reports / Audit event collections
- Public search APIs (Phase 7+). Interactive guide engine = **Phase 8**. **Phase 12 DEMO seed** of five procedures: `src/lib/content/phase12/` + `scripts/phase12-seed-content.ts` (opt-in `WARAQA_ALLOW_PHASE12_SEED=1`; never auto-PRODUCTION)
- Media / file uploads
- Phase 4 workflow features (blocks, audit events collection, scheduled review, preview, approval invalidation) — **not started**; schema already in Phase 3 per Outcome A
- Phase 4 Admin UI polish debt (non-blocking): mixed EN/AR Admin chrome; empty parent category label; boolean نعم/لا badges; Admin login branding — see [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md)

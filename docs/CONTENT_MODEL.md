# Waraqa Content Model (Phase 3)

**Status:** Phase 4 — COMPLETE — OWNER APPROVED (Phase 3 COMPLETE)

**Migrations:** Phase 3 + `20260718_234422_phase_4_editorial_workflow`

**Last updated:** 2026-07-19

**Related:** [RBAC.md](./RBAC.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md)

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
| `aliases[]` | Yes (`value`) | For later search |
| `outcome` | Yes | |
| `prerequisiteProcedures` | No | → `transactions` (hasMany); self-ref blocked |
| `lastReviewedAt` | No | **Required to publish** |
| `internalNotes` | No | Editorial-only; never returned on anonymous REST |
| `active` | No | Must be true for public visibility even when published |

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
- Public guide engine, search APIs, seeds of five procedures
- Media / file uploads
- Phase 4 workflow features (blocks, audit events collection, scheduled review, preview, approval invalidation) — **not started**; schema already in Phase 3 per Outcome A
- Phase 4 Admin UI polish debt (non-blocking): mixed EN/AR Admin chrome; empty parent category label; boolean نعم/لا badges; Admin login branding — see [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md)

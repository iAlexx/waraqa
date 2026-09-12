# Public Transaction Detail Architecture (Phase 7)

**Status:** Phase 7 — COMPLETE — OWNER APPROVED

**Baseline:** `phase-6-complete` (`3ad7a08f7bc10fb318bae27da1f2c430965dacda`)

**Completion tag:** `phase-7-complete`

**Related:** [CONTENT_MODEL.md](./CONTENT_MODEL.md), [SEARCH_ARCHITECTURE.md](./SEARCH_ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md)

## Purpose

Replace the Phase 6 placeholder at `/transactions/[slug]` with a server-rendered Arabic RTL public transaction page that presents the existing Phase 3 content model honestly, under Phase 4 public access rules.

## Loader

- `src/lib/public/transaction-detail.ts` — `loadPublicTransactionBySlug(slug)`
- React `cache()` wrapped
- Payload Local API: `overrideAccess: false`, `locale: 'ar'`, `depth: 2`
- Where: `{ slug equals } AND publicTransactionWhere`
- Maps via `mapPublicTransactionDetail` only — raw Payload documents never reach React components
- Ineligible / missing / mapper-null → `{ ok: false }` → route calls `notFound()`

## Public DTO (`PublicTransactionDetail`)

| Field | Source |
| --- | --- |
| `id`, `title`, `slug`, `summary` | transaction |
| `demoLabeled` | heuristic on title/slug (تجريبي / qa-) |
| `lastReviewedAt`, `lastReviewedLabel` | `lastReviewedAt` |
| `category` | published+active category (name, slug) |
| `agency` | published+active agency (name, slug, shortName) |
| `serviceCenters[]` | published+active centers (name, location, phones, hours) |
| `audiences[]` | Arabic labels from enum |
| `eligibility` | localized textarea |
| `overview` | always `null` (no schema field) |
| `prerequisites[]` | eligible `prerequisiteProcedures` only |
| `requiredDocuments[]` | array order preserved; unpublished docs dropped |
| `steps[]` | required; order preserved |
| `fees[]` | order preserved |
| `duration` | formatted `estimatedDuration` |
| `outcome` | localized textarea |
| `sources[]` | public-safe links only; `notes` / editorial source fields omitted |

### Never on the DTO

`internalNotes`, `searchText`, `approvedContentHash`, `approvedVersionId`, `workflowState`, `markedOutdated`, `_status`, actor stamps, change-request comments, raw relationship IDs, source `notes`, preview tokens.

## Access / not-found

Publicly resolvable only when Phase 4 eligibility holds: published, active, not archived, not marked outdated.

Draft, inactive, archived, outdated, and nonexistent slugs all use the same not-found experience — no existence leak, no “outdated warning” page.

Roadmap draft text mentioning an outdated warning is **intentionally not followed** in Phase 7; owner authorization requires total public unavailability.

## Source-link safety

`src/lib/public/safe-url.ts` — only `http:` / `https:` URLs. Unsafe protocols discarded. External anchors use `target="_blank"` + `rel="noopener noreferrer"`.

## Optional sections

Empty arrays/null omit section headings entirely (audience, eligibility, prerequisites, documents, fees, duration, centers, outcome, sources). Steps always render (mapper requires ≥1 step).

## Public layout (Round 02)

Centered single-column reading rail inside `waraqa-container`: `mx-auto w-full min-w-0 max-w-5xl`. Long prose uses `max-w-[40rem]`. Round 01 used uncentered `max-w-3xl` (RTL edge alignment) — corrected without changing DTO/access.

## Search integration

Phase 6 result cards link to `/transactions/[slug]` with CTA `عرض تفاصيل المعاملة`. Normalization, ranking, filters, pagination, and dedupe are unchanged.

## Metadata

Per-slug Arabic `title` + summary-derived `description` + basic Open Graph. Ineligible slugs get a generic non-indexing title only (no private content).

## Schema fields not shown publicly

| Field | Reason |
| --- | --- |
| `aliases` | Search-only; not page content |
| `searchText` | Private index text |
| `internalNotes` | Editorial-only |
| Workflow / approval / audit fields | Phase 4 private |
| Source `notes`, coverage debugging | Editorial |
| `overview` N/A | No Phase 3 overview field (summary + eligibility cover the need) |
| `commonMistakes` | **Not in schema** — limitation documented; not invented |

## Boundaries (not Phase 7)

No eligibility personalization, accounts, submission/upload, Phase 11 sitemap/robots/structured data/advanced revalidation, AI recommendations, or buttons implying Waraqa submits to government.

**Phase 10:** Public CTA «بلّغنا عن معلومة تغيّرت» links to `/report-information?transaction=<slug>` only for Transactions that pass the same public eligibility loader as this page (P0-05/P0-06).

## Migration

**No new migration.** Phase 7 uses the existing Phase 3 model + Phase 4 access + Phase 6 `searchText` (untouched).

## QA

- Fixture: `ALLOW_QA_FIXTURE=1` → `pnpm qa:phase7:fixture` (`qa-p7-r1-*`)
- Captures: `pnpm qa:phase7:capture` → `docs/qa/phase-7/revisions/round-01-public-transaction-details/`
- Never write `approved/` until owner visual approval

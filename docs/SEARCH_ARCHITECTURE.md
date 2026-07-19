# Search Architecture (Phase 6)

Arabic-first public search over eligible published transactions.

**Status:** Phase 6 — **COMPLETE — OWNER APPROVED** (`phase-6-complete`)

## Goals

- Help users find publicly eligible transactions via `/search?q=`
- Deterministic Arabic normalization and ranking (not semantic / AI)
- Stay on PostgreSQL + Payload Local API (no Elasticsearch, no paid search SaaS)
- Never expose draft / inactive / archived / outdated or private editorial fields

## Public eligibility

Reuses Phase 4 `publicTransactionWhere` / `isPubliclyEligibleTransaction`:

- `_status = published`
- `active = true`
- `markedOutdated != true`
- `workflowState != archived`

All public queries use `overrideAccess: false`.

## Normalization

Implemented in `src/lib/search/normalize.ts`:

- trim + whitespace collapse
- NFKC
- Arabic diacritic + tatweel removal
- Alef forms → `ا`
- `ى` / `ئ` → `ي`; Persian `ک` → `ك`
- `ة` → `ه` (looser Syrian typing match)
- Arabic / Persian digits → Latin
- Latin lowercasing
- punctuation stripped to spaces

Stored editorial titles are **not** rewritten. A generated `searchText` blob stores normalized candidate text for SQL prefiltering.

## Searchable fields

| Source | Role |
| --- | --- |
| Arabic title (+ EN via locale fallback when present) | primary |
| Aliases | exact / contains |
| Summary | weaker contains |
| Slug | related / token |
| Category / agency / service-center names | related labels |

Included in `searchText` at save time via `populateSearchText` hook.

## Ranking (deterministic)

Lower score wins (`src/lib/search/rank.ts`):

1. Exact normalized title
2. Exact alias
3. Title prefix
4. Title contains
5. Alias contains
6. Summary match
7. Related category / agency / center / slug label
8. Stable Arabic title + id fallback

Multi-token queries require every token to appear in the searchable haystack.

## Filters

Query params: `category`, `agency`, `center` (public slugs).

- Resolved only if the related entity is published + active
- Invalid slugs fail safe (ignored)
- Preserve `q` + `page` via native GET form

## Pagination

- `page` (1…100), page size **10**
- Candidate cap **200** after eligibility + filters (+ optional `searchText` contains)
- Sort in-process, then slice
- Stable `prev` / `next` hrefs

## Indexes / migration

Migration `20260719_083000_phase_6_search_text`:

- `tx.search_text`
- `_tx_v.version_search_text`
- `pg_trgm` GIN on `search_text` + btree helper

Justified: Arabic-normalized `contains` prefilter without rewriting display fields.

## Empty / no-result / error

- Empty `q` and no filters → empty-state + Site Settings `searchExamples`
- Empty `q` with filters → filtered browse
- No matches → Arabic no-result copy + examples
- Recoverable error UI; QA-only `?qaLoading=1` / `?qaError=1` when `ALLOW_QA_EMPTY_STATES=1`

## Security

- Cap query length (120)
- No raw SQL string interpolation in app code (Payload Where / parameterized migration SQL only)
- Strip `searchText` + editorial fields in `stripPrivateEditorialFields` / result mapper
- GraphQL remains disabled
- Phase 4 preview security unchanged
- No autocomplete service, search history, personalization, or analytics beyond existing infra
- Document-ID dedupe after ranking (defense in depth; does not merge different docs that share a title)

## QA fixture

- Idempotent seed under `ALLOW_QA_FIXTURE=1` cleans only `qa-p6-r1-*` rows, then reseeds stable slugs
- State manifest: `docs/qa/phase-6/fixture-state/fixture-manifest.json` (not revision archives)
- Repeated runs keep published eligible count stable (14)

## Boundaries

**Not Phase 6:** transaction detail pages (Phase 7), decision guide (Phase 8), reporting (Phase 10), sitemap / revalidation (Phase 11).

## Known limitations

- Candidate set capped at 200 matching rows before in-memory rank (adequate for MVP catalog; revisit if seed grows large)
- `searchText` backfill requires save/update (new writes populate automatically; fixture seeds do)
- Not semantic search
- English aliases/titles participate only when present via locale data / fallbacks

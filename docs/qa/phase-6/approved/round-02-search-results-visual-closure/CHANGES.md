# Round 02 — What changed (visible)

## Root cause (Round 01)

Result rows used a `border-b`-only divider with no card chrome (no full border, radius, or surface fill). In RTL Arabic, titles/meta read as floating text against the page background instead of as discrete, scannable result containers.

## Card redesign

- Full-width `<article data-search-result-card>` with `border`, `rounded-[0.8125rem]`, `bg-surface`, and a light hairline shadow.
- Title, clamped summary, meta chips (category / agency / verified date), demo badge when applicable, and an explicit CTA link (`data-search-result-cta`).
- Cards stay ≥ ~65% viewport width with consistent vertical gaps (~8–28px) so the list reads as stacked containers, not a hairline list.

## Density

- Tighter internal gap (`gap-2.5` / `md:gap-3`) and list spacing (`gap-3` / `md:gap-3.5`) so multiple results remain scannable without sparse whitespace.

## Pagination

- Pagination sits in a matching bordered surface bar with prev/next controls and “صفحة X من Y”, aligned with the card language.

## Count wording

- Status line uses deterministic Arabic result-count copy via `formatSearchResultCount` (0 / 1 / 2 / 3–10 / 11+) instead of a raw English-style count string.

## Out of scope

- Round 01 evidence folder left untouched; no `approved/` promotion; transaction detail remains Phase 7.
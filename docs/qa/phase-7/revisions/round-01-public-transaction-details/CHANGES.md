# Round 01 changes — Public transaction details

## Added

- Public loader + DTO mapper (`transaction-detail.ts`, `transaction-detail-map.ts`, `safe-url.ts`, labels)
- SSR `/transactions/[slug]` detail view (Arabic RTL sections, disclaimer, sources)
- Shared `(frontend)/not-found` for inaccessible slugs
- Search CTA copy: `عرض تفاصيل المعاملة` (route unchanged)
- Idempotent QA fixture `qa-p7-r1-*` + Round 01 capture script
- Unit / integration / E2E coverage for eligibility, field safety, SSR, axe
- Docs: `TRANSACTION_DETAIL_ARCHITECTURE.md` + checklist/roadmap/security/content-model updates

## Intentionally not done

- No Phase 8 guide engine / decision rules
- No Phase 10 reporting CTA
- No Phase 11 sitemap/robots/structured data
- No new Payload migration
- No `commonMistakes` field (absent from schema)
- No outdated warning page (hidden → not-found)
- No commit / tag / push / `approved/` promotion

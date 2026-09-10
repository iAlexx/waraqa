# Interactive Guide Architecture (Phase 8)

**Status:** Phase 8 — **TECHNICAL PASS — AWAITING OWNER VISUAL APPROVAL**

**Last updated:** 2026-07-20

**Related:** [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md), [CONTENT_MODEL.md](./CONTENT_MODEL.md), [SECURITY.md](./SECURITY.md), [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md)

## 1. Purpose

Phase 8 delivers an anonymous, in-session **interactive guide** on eligible public transactions. Visitors answer structured questions; a pure rule engine produces a personalized preparation checklist (documents, steps, fees, notices, optional variant) with explanations. Waraqa does not submit applications or guarantee outcomes.

## 2. Owner decisions (authoritative)

These override conflicting roadmap wording about persistence:

| Topic | Phase 8 contract |
| --- | --- |
| Answer state | **In-memory React state only** — no `localStorage`, `sessionStorage`, cookies, DB, analytics, or URL query parameters for answers |
| Refresh / reopen | Restarts the guide (no saved progress) |
| Result scope | In-session checklist + kinds + why + steps/fees/notices + variant + disclaimer + last-reviewed + official sources + link back to Phase 7 detail |
| Explicitly deferred | WhatsApp share, print, saved checklists, export/download, user accounts, server-side answer storage (**Phase 9+**) |
| Variants | Minimal additive model + `selectVariant`; at most one final variant; conflicting variant keys fail validation (fail closed) |
| Rule format | Stable `key` references only — no Payload row IDs, array indices, eval, or executable code |

## 3. Public routes

| Route | Behavior |
| --- | --- |
| `/transactions/[slug]` | Phase 7 detail; shows CTA **«ابدأ الدليل التفاعلي»** only when `transactionHasPublicGuide(slug)` |
| `/transactions/[slug]/guide` | Phase 8 guide page; SSR shell + client Q&A; hidden/ineligible → same `notFound()` as Phase 7 |

CTA element: `[data-start-guide]`. Guide page markers: `[data-guide-page]`, `[data-guide-client]`.

## 4. Eligibility gate

Public guide requires **all** of:

1. Transaction passes Phase 4/7 public eligibility (`publicTransactionWhere`, `overrideAccess: false`, published + active + not archived/outdated).
2. `guideEnabled === true`.
3. `validateGuideData()` passes (stable keys, valid references, no conflicting `selectVariant` targets).
4. At least one **active** question with Arabic prompt.

Implemented in `isPublicGuideAvailable()` → `mapPublicGuide()` → `loadPublicGuideBySlug()`.

Publishing with `guideEnabled` and invalid guide configuration **throws** in Admin (`validateGuideOnTransaction`).

## 5. Content model (additive on `transactions`)

| Area | Fields |
| --- | --- |
| Toggle | `guideEnabled` (sidebar) |
| Questions | `questions[]` — `key`, `questionType` (`single` \| `multi` \| `boolean`), localized prompt/help, `required`, `active`, `options[]`, `visibleWhen` |
| Variants | `variants[]` — `key`, localized title/explanation, `active` |
| Notices | `notices[]` — `key`, title/body, `severity`, `active` |
| Rules | `decisionRules[]` — `key`, `priority`, `active`, explanation, `when`, `effects[]` |
| Stable targets | `key` on `requiredDocuments`, `steps`, `fees` (backfilled on save via `ensureStableContentKeys`; migration backfill for existing rows) |

Short Postgres `dbName`s: `questions`, `qopts`, `variants`, `notices`, `dec_rules`, `fx`, enums `qtype`, `op`, `sev`, `fx_type`.

Migration: `20260720_041000_phase_8_interactive_guide`.

## 6. Rule engine (pure)

Location: `src/lib/guide/evaluate.ts`

**Condition operators:** `equals`, `notEquals`, `includes`, `exists`

**Condition groups:** `all` (AND), `any` (OR) — both must pass when present.

**Effects:** `includeDocument` \| `excludeDocument` \| `includeStep` \| `excludeStep` \| `includeFee` \| `excludeFee` \| `includeNotice` \| `excludeNotice` \| `selectVariant`

**Baseline inclusion:** `requirementType=required` documents + all steps/fees from catalog; conditional docs/notices via rules; exclude effects override include when applied later (lower `priority` first, then higher).

**Runtime failures (fail closed):** incomplete required visible answers; multiple distinct fired `selectVariant` targets; inactive/missing variant key.

**Static validation:** `validateGuideData()` — duplicate keys, invalid references, boolean values `yes`/`no`, conflicting static `selectVariant` targets across rules.

## 7. Public DTO

`mapPublicGuide()` → `PublicGuideDTO` — no editorial fields, no raw Payload graph in React. Evaluation via `runPublicGuideEvaluation(guide, answers)` on the client only.

Checklist item kinds:

- `generally_required`
- `required_by_answers`
- `verify_with_authority`

## 8. Privacy and security

- Answers never sent to the server in Phase 8.
- No answer persistence APIs.
- Guide page metadata may describe the transaction; answers stay client-side for the session.
- GraphQL remains disabled (`404`).
- QA fixtures use `qa-p8-r1-*` slugs and fictional Arabic labels.

See [SECURITY.md](./SECURITY.md) §7 (updated for Phase 8 in-memory policy).

## 9. UI behavior

- Step-by-step questions with back/next/restart.
- Result: variant (if any), grouped checklist, notices, independence disclaimer, last-reviewed, official source links, link to Phase 7 detail.
- `<noscript>` honest fallback on guide route (no empty interactive shell).
- Reduced-motion safe; keyboard-operable radios/checkboxes and focus management on step change.

## 10. Explicit non-goals (Phase 8)

- Phase 9: WhatsApp, print stylesheet, local persistence, share URLs
- Phase 10: outdated-information reporting from guide
- Phase 11: sitemap/structured data for guide paths
- AI inference, arbitrary expressions, admin live rule preview (deferred)
- Media uploads, citizen accounts

## 11. QA

```bash
ALLOW_QA_FIXTURE=1 pnpm qa:phase8:fixture
# server: pnpm build && ALLOW_QA_EMPTY_STATES=1 pnpm start
pnpm qa:phase8:capture
```

Evidence: `docs/qa/phase-8/revisions/round-01-interactive-guide/` only — **no** `approved/` until owner signs off.

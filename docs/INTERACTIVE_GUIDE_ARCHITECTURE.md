# Interactive Guide Architecture (Phase 8–9)

**Status:** Phase 8–9 complete (P9-A…P9-E). OS Print Preview owner-signed in Phase 13 (PASS 2026-09-15).

**Last updated:** 2026-09-12

**Related:** [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md), [CONTENT_MODEL.md](./CONTENT_MODEL.md), [SECURITY.md](./SECURITY.md), [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md)

## 1. Purpose

Phase 8 delivers an anonymous, in-session **interactive guide** on eligible public transactions. Visitors answer structured questions; a pure rule engine produces a personalized preparation checklist (documents, steps, fees, notices, optional variant) with explanations. Waraqa does not submit applications or guarantee outcomes.

Phase 9 finishes the citizen result UX: **P9-A** documents checklist, **P9-B** device-local persistence, **P9-C** A4 RTL print, **P9-D** WhatsApp share (no personalized answer URL), **P9-E** answer summary + edit/recalculate from the result.

## 2. Owner decisions (authoritative)

| Topic | Contract |
| --- | --- |
| Answer / checklist state | Client-only. **P9-B:** schema-versioned `localStorage` on the citizen device. Never cookies, DB, Payload, server actions, analytics, or URL query params for answers/checklist |
| Refresh / reopen | **P9-B:** restores compatible local progress; incompatible payloads are ignored and cleared |
| Restart | **ابدأ من جديد** clears React state **and** deletes this transaction’s local payload |
| Result scope | Checklist + kinds + why + steps/fees/notices + variant + disclaimer + last-reviewed + official sources + link back to Phase 7 detail |
| Print (P9-C) | Browser `window.print()` + `@media print` / `@page` A4 portrait RTL. Existing result DOM + print chrome; generated print date is not a verification date. No PDF backend or server-stored results |
| WhatsApp (P9-D) | Client-built `https://wa.me/?text=` message from the **current** successful evaluation only. Absolute public **transaction detail** URL (`NEXT_PUBLIC_SERVER_URL` + `detailHref`). No answers/checklist state in the message or URL. DEMO warning when `demoLabeled`. Recipient reruns the guide independently |
| Edit answers (P9-E) | Result shows **إجاباتك** with human-readable labels + **تعديل** per row. Edit exits result, jumps to that question, preserves applicable answers, prunes inapplicable downstream answers, recalculates via Decision Engine, reconciles checklist, updates P9-B. Print includes read-only summary (edit controls `data-print-hide`). WhatsApp still omits raw answers |
| Explicitly deferred | Share permalinks / tokens, user accounts, server-side citizen state; OS Print Preview → Phase 13 |
| Variants | Minimal additive model + `selectVariant`; at most one final variant; conflicting variant keys fail validation (fail closed) |
| Rule format | Stable `key` references only — no Payload row IDs, array indices, eval, or executable code |

## 2.1 Local persistence (P9-B)

| Item | Detail |
| --- | --- |
| Key | `waraqa:guide:<transactionSlug>` — stable public slug identity (not Arabic title) |
| Envelope | `storageVersion` (blob format; currently `1`), `guideSchemaVersion` (fingerprint of current public guide structure: question/option/document/rule/step/fee/variant/notice keys — derived from loaded DTO, not a separate CMS version field), `transactionKey`, `transactionId`, `answers`, `checkedDocumentKeys`, `stepIndex`, `showResult`, `updatedAt` |
| Invalidation | Fail closed on storage version mismatch, schema fingerprint mismatch, wrong transaction identity, or malformed JSON/shape — ignore and remove key |
| Answer validation | Untrusted input: whitelist active `boolean` / `single` / `multi` only; drop unknown keys and invalid option values |
| Checklist | Restore catalog keys only; after evaluation, reuse P9-A `pruneCheckedDocumentKeys` for active result docs |
| Trust | Persisted state cannot bypass `loadPublicGuideBySlug` (P0-05 claim trust + P0-06 contentClass). If the public guide does not load, local blobs are useless |
| Privacy | No national IDs, free text, uploads, contacts, auth, or claim/editorial fields. Device-local only — no server sync |

Implementation: `src/lib/guide/guide-local-storage.ts` + `GuideClient` post-mount restore/write.

## 2.2 Print (P9-C)

| Item | Detail |
| --- | --- |
| Action | **طباعة النتيجة** on successful result only → `window.print()` |
| Styling | `src/app/(frontend)/globals.css` `@media print` + `@page { size: A4 portrait }` |
| DOM strategy | Existing result tree under `[data-guide-print-sheet]`; `[data-print-hide]` for chrome/controls/edit buttons; `[data-print-only]` for brand strip + generated date; answer summary prints from the screen section (read-only) |
| Generated date | Client-rendered Arabic label **تاريخ طباعة هذه النسخة** — not stored; not a source/verification date |
| Checklist | Print uses `[✓]` / `[ ]` via `::before` on `[data-checklist-item]`; native checkboxes hidden in print |
| Trust | DEMO warning + independence disclaimer print with the sheet; public eligibility unchanged (no QA_TEST on public routes) |
| Non-goals | No PDF backend, no letterhead/seal imitation, no WhatsApp/share |
| Known limitation | **OS/browser Print Preview** was not manually inspected at P9-C accept (`PASS WITH PRINT-PREVIEW LIMITATION`). Automated coverage uses Playwright `emulateMedia({ media: 'print' })` only. **Phase 13 owner manual Print Preview:** PASS 2026-09-15 — see [qa/phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md](./qa/phase-13/PRINT_PREVIEW_MANUAL_CHECKLIST.md). |

## 2.3 WhatsApp share (P9-D)

| Item | Detail |
| --- | --- |
| Action | **مشاركة عبر واتساب** on successful result only → `https://wa.me/?text=<encodeURIComponent(message)>` |
| Builder | Pure `src/lib/guide/whatsapp-share.ts` — titles/steps/docs/notice/verification label only; no answers, checklist checks, rule keys, or internal IDs |
| Public URL | Absolute transaction detail from `NEXT_PUBLIC_SERVER_URL` + `detailHref` (`/transactions/<slug>`). Fail closed if origin/path unsafe. Never encode answers |
| Length | Raw message max **1500** chars before encoding; truncate by document/step item boundaries; keep URL + independence disclaimer; add **شوف باقي التفاصيل على ورقة:** when truncated |
| DEMO | Include `بيانات تجريبية للعرض — ليست معلومات رسمية` when `demoLabeled`. QA_TEST never on public routes (P0-06) |
| Privacy | Checklist checked state not shared; no server result storage; recipient opens WARAQA and runs the guide themselves |

## 2.4 Edit answers (P9-E)

| Item | Detail |
| --- | --- |
| UI | Result section **إجاباتك** (`[data-guide-answer-summary]`) — prompt + human label + **تعديل** |
| Labels | `src/lib/guide/answer-labels.ts` — boolean نعم/لا; single/multi option labels; never fall back to raw keys |
| Edit | Exit result → jump to question index in current `visibleQuestions` → preserve applicable answers |
| Stale answers | `pruneInapplicableAnswers` removes answers for questions not currently visible (iterative). Applied on `setAnswer`, restore, and write — so hidden downstream answers cannot fire Decision Engine conditions |
| Recalc | Normal guide flow → `runPublicGuideEvaluation` → P9-A checklist prune → P9-B write → print/share from fresh evaluation |
| Print | Summary prints; edit buttons `data-print-hide` |
| WhatsApp | Unchanged privacy — no answer dump in share text |

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

- Answers / checklist are never sent to the server.
- **P9-B:** device-local `localStorage` only; no answer persistence APIs.
- Guide page metadata may describe the transaction; citizen progress stays on-device.
- GraphQL remains disabled (`404`).
- QA fixtures use `qa-p8-r1-*` slugs and fictional Arabic labels.
- Public loaders still enforce P0-05 claim trust and P0-06 contentClass on every request.

See [SECURITY.md](./SECURITY.md).

## 9. UI behavior

- Step-by-step questions with back/next/restart.
- Result: variant (if any), grouped checklist, notices, independence disclaimer, last-reviewed, official source links, link to Phase 7 detail.
- **P9-C:** **طباعة النتيجة** on successful result; print hides site chrome/controls; A4 RTL stylesheet; generated print date separate from verification.
- **P9-D:** **مشاركة عبر واتساب** on successful result; client-side `wa.me` text only; no personalized answer URL.
- **P9-E:** **إجاباتك** + **تعديل** on successful result; prune inapplicable answers; recalculate.
- `<noscript>` honest fallback on guide route (no empty interactive shell).
- Reduced-motion safe; keyboard-operable radios/checkboxes and focus management on step change.

## 10. Explicit non-goals (remaining)

- Share permalinks / tokens (not citizen Edit Answers)
- Phase 10: outdated-information reporting from guide
- Phase 11: sitemap/structured data for guide paths
- AI inference, arbitrary expressions, admin live rule preview (deferred)
- Media uploads, citizen accounts, server-side citizen state / PDF export service
- OS Print Preview — Phase 13 owner manual QA **PASS** (2026-09-15)

## 11. QA

```bash
ALLOW_QA_FIXTURE=1 pnpm qa:phase8:fixture
# server: pnpm build && ALLOW_QA_EMPTY_STATES=1 pnpm start
pnpm qa:phase8:capture
```

Evidence: `docs/qa/phase-8/revisions/round-01-interactive-guide/` only — **no** `approved/` until owner signs off.

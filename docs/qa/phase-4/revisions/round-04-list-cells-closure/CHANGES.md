# Round 04 CHANGES - List Cells Closure

## Admin list cells

- Transactions list: publication status cells render Arabic labels (`مسودة` / `منشورة` / draft-with-published-version) instead of em-dash-only placeholders.
- Audit events list: actor cells render readable names, emails, or `النظام` instead of em-dash-only placeholders.
- Typecheck/build: `defaultSort` on `audit-events` moved from `admin` to collection root (Payload `CollectionConfig`); audit write coerces `actorId` with `Number()` for the relationship field.

## Visual QA

- Full Round 04 capture set (**3 / 3**) under this folder only, against **production** (`next start` on port 3000).
- Fixture re-seeded with `ALLOW_QA_FIXTURE=1`; credentials in gitignored `.local-credentials`.
- Side-by-side `comparison-round03-vs-round04.png` generated from Round 03 + Round 04 sources (Round 03 files read-only).
- Round 01 / Round 02 / Round 03 left untouched; nothing copied to `approved/`.

## Status

**AWAITING OWNER VISUAL APPROVAL** - technical gates for this pass: lint, typecheck, unit, int, build, production health, fixture, capture inventory, e2e (9 passed / 1 skipped), `git diff --check`.

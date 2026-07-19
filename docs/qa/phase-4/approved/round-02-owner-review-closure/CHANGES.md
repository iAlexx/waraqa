# Round 02 CHANGES — Owner Review Closure

## Public access (blocker)

- Introduced **transactions-only** `publicTransactionRead` / `publicTransactionWhere` so archived + outdated exclusion happens at the Payload access / query layer (not shared with collections lacking those fields).
- Kept `publicPublishedRead` for categories/agencies/sources/documents/centers (`published` + `active` only).
- `afterRead` remains defense in depth + private-field strip + prerequisite ID sanitization.
- Fixed workflow live-row updates: `markOutdated` and `archive` use `draft: false` so anonymous queries hide records immediately.
- Added PostgreSQL integration suite: `tests/int/phase4-public-access.int.spec.ts`.

## Visual QA

- Full Round 02 capture set (27 required screenshots) under this folder only.
- Expanded fixture with fictional multi-state transactions (draft → archived/outdated/review-due/source-blocker/etc.).
- Round 01 left untouched; nothing copied to `approved/`.

## Docs

- `docs/EDITORIAL_WORKFLOW.md` updated to document the final access expression and afterRead role.

## Status

**OWNER APPROVED** — public-access and security closure; included in Phase 4 complete visual evidence (`docs/qa/phase-4/approved/`).

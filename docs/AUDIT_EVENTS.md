# Audit Events (Phase 4)

**Collection:** `audit-events` (`dbName: audit_ev`)

## Actions

`draft_created`, `submitted_for_review`, `changes_requested`, `resubmitted_for_review`, `approved`, `approval_invalidated`, `published`, `unpublished`, `archived`, `archive_restored`, `revision_restored`, `review_date_overridden`, `marked_outdated`

## Fields

`actor`, `action`, `entityType`, `entityId`, `transaction`, `entityVersionId`, `summary`, `beforeReference`, `afterReference`, `metadata` (allowlisted keys only), timestamps.

## Access

| Role | Read | Create/Update/Delete |
| --- | --- | --- |
| anonymous | no | no |
| researcher | no | no |
| viewer | no | no |
| reviewer | yes | no |
| admin | yes | no |

Writes only via `writeAuditEvent` with `overrideAccess` + `context.auditWrite`.

## Security

Never store passwords, tokens, cookies, full bodies, `.env`, or full before/after documents. Summaries capped; metadata allowlist only.

## Failure behavior

Publish/unpublish must not succeed silently without an audit row — service throws if audit write fails after those actions.

## Atomicity

Workflow update and audit insert are sequential Local API calls. Full DB transaction atomicity is **not** claimed unless verified — prefer fail-loud on audit failure for publish/unpublish.

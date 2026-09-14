# Migration rollback strategy

**Audience:** operators / developers  
**Last updated:** 2026-09-14  
**Related:** [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [SECURITY.md](../SECURITY.md) §8, Payload `migrations/` at repo root

WARAQA does **not** claim every migration is safely reversible. Prefer **backup/restore** plus **forward-fix** migrations over rewriting history or casual `migrate:down` on shared databases.

---

## 1. Classification

### Safely reversible (rare in practice)

- Additive-only changes that Payload/`down` can undo cleanly on a disposable DB (e.g. a new nullable column with no data dependency), **when** a tested `down` exists and no production row depends on the column yet.
- Always validate `down` only on a **disposable** database.

### Partially reversible

- New tables/collections that can be dropped, but leave orphaned references, Admin UI assumptions, or app code that still expects the fields.
- Index additions/removals: usually reversible, but concurrent load and lock timing matter on production-sized DBs.
- Data backfills: `down` may drop columns/tables without restoring prior values.

### Non-reversible (especially enums / value history)

PostgreSQL `ENUM` / Payload enum expansions are the main risk:

- Adding enum values is easy forward; **removing** or renaming values is hard or impossible without table rewrites.
- Historical rows may retain old enum labels; shrinking the type can fail or destroy meaning.
- Workflow state, claim status, contentClass, audit action enums, and similar: treat as **append-forward only** once applied in any shared environment.

Other non-reversible patterns:

- Destructive data migrations (delete/merge rows).
- Irreversible hash/token regenerations.
- Anything that already shipped to production without a matching pre-migration dump.

---

## 2. Preferred recovery order

1. **Restore** a known-good dump into a **new** database (see [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)).
2. Point a non-prod app at the restored DB and verify.
3. If the schema must move forward from an older dump, add a **new** forward migration (fix) — do not edit applied files.
4. Use Payload `migrate:down` **only** on disposable local DBs when explicitly testing a `down` function.

Never use production data for rollback experiments.

---

## 3. Payload migrate behavior (this repo)

- Migration directory: `migrations/` (see `payload.config.ts` → `migrationDir`).
- Commands:

```powershell
corepack pnpm@11.14.0 db:migrate          # apply pending
corepack pnpm@11.14.0 db:migrate:status   # list applied / pending
corepack pnpm@11.14.0 db:migrate:create   # scaffold new migration
```

- Runtime app connections use `DATABASE_URL` (pooler-friendly). Migrations/tooling use `DATABASE_URL_DIRECT`.
- Do **not** enable schema push against shared/production DBs; controlled migrations only.
- Preview/CI must never migrate the production database.
- Integration tests use a sibling DB name (`*_int`) so they do not mutate the primary local `waraqa` database.

Payload records applied migrations in the `payload-migrations` table. After a restore, `db:migrate:status` must match the dump’s era; then apply only newer forward migrations as needed.

---

## 4. Historical migrations must not be rewritten

Once a migration has been applied anywhere outside a throwaway local volume:

- **Do not** edit its SQL/TS to “fix” production.
- **Do not** reorder or renumber applied migrations.
- **Do not** delete applied migration files from git to force a clean slate on shared DBs.

Corrections ship as **new** forward migrations. Local-only experiments may `db:reset` the Docker volume; that is not a production rollback strategy.

---

## 5. Before you migrate (checklist)

- [ ] Backup / snapshot taken and verified readable  
- [ ] Migration reviewed for enum / destructive steps  
- [ ] Ran on disposable DB from zero (`db:reset` + `db:migrate`) when schema-impacting  
- [ ] Rollback path chosen: restore + forward-fix (default) or tested `down` (local only)  
- [ ] App code compatible with both “before” and “after” if a staged deploy is required  

---

## 6. If a migration fails mid-way

1. Stop retries that could double-apply partial DDL.
2. Capture error logs (no secrets).
3. Prefer restore-from-backup on a new DB over hand-editing production catalogs.
4. Fix via a new migration or corrected deploy pipeline; document the incident briefly in the Phase ops notes.

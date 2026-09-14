# Backup and restore runbook

**Audience:** operators / Phase 13+  
**Last updated:** 2026-09-14  
**Scope:** PostgreSQL used by Payload. Prefer restore into a **new disposable database**, never overwrite production in place without an explicit incident plan.

**Hard rules**

- Never commit dumps (`*.sql`, `*.dump`, `*.sql.gz`, … — already gitignored).
- Never use production data in local smoke tests.
- Never point local/preview tooling at production credentials for “practice restore”.

Related smoke: `pnpm phase13:backup-restore-smoke` (disposable local Docker only).

---

## 1. Principles

| Principle | Practice |
| --- | --- |
| Separate environments | Dev / preview / production each have their own DB and credentials |
| Secure storage | Encrypt at rest; restrict who can download dumps; treat dumps as secrets |
| Retention | Keep enough pre-migration + pre-demo copies to recover; delete expired dumps securely |
| Verify before trust | After restore: connect, `migrate:status`, spot-check Admin + public health |
| Prefer new DB | Restore into a **new** database name, validate, then cut over if needed |

Supabase Free has **no** automatic backups — manual export before important production migrations and demos is mandatory (see [SECURITY.md](../SECURITY.md) §9).

---

## 2. Local Docker (waraqa on host port 5433)

Compose maps `5433 → 5432`. Defaults from README / `docker-compose.yml` (disposable only):

```text
host: 127.0.0.1
port: 5433
user: waraqa
password: waraqa_dev_only
database: waraqa
```

Start Postgres:

```powershell
corepack pnpm@11.14.0 db:up
```

### Dump (custom format, to OS temp — do not put under the repo)

```powershell
$Dump = Join-Path $env:TEMP "waraqa-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
docker compose exec -T postgres pg_dump -U waraqa -d waraqa -Fc -f /tmp/waraqa.dump
docker compose cp postgres:/tmp/waraqa.dump $Dump
```

Plain SQL alternative (still never commit):

```powershell
docker compose exec -T postgres pg_dump -U waraqa -d waraqa --no-owner --no-acl > "$env:TEMP\waraqa-backup.sql"
```

### Restore into a **new** disposable database

```powershell
docker compose exec -T postgres psql -U waraqa -d postgres -c "DROP DATABASE IF EXISTS waraqa_restore_check;"
docker compose exec -T postgres psql -U waraqa -d postgres -c "CREATE DATABASE waraqa_restore_check OWNER waraqa;"
docker compose cp $Dump postgres:/tmp/restore.dump
docker compose exec -T postgres pg_restore -U waraqa -d waraqa_restore_check --no-owner --no-acl /tmp/restore.dump
```

### Verify after restore

1. Connect: `psql` / app with `DATABASE_URL` rewritten to `waraqa_restore_check` (local only).
2. Migration status: with that URL, `pnpm db:migrate:status` — expect applied migrations matching the dump era.
3. Spot-check: `/api/health`, Admin login on a non-prod instance pointed at the restored DB, one published public route if content was present.
4. Drop when done: `DROP DATABASE waraqa_restore_check;`

Automated local smoke (creates `waraqa_phase13_restore_smoke`, verifies, drops):

```powershell
$env:ALLOW_QA_FIXTURE='1'
corepack pnpm@11.14.0 phase13:backup-restore-smoke
```

---

## 3. Managed / production-shaped Postgres (outline)

1. Use the provider’s export or `pg_dump` over a **direct** connection (not the transaction pooler).
2. Store the artifact in encrypted object storage or an approved secrets vault path.
3. Restore only into a **new** project/database (or a named restore instance).
4. Run verification (migrate status, health, Admin, public smoke) **before** DNS or env cutover.
5. Record who restored, when, and which dump hash/name (not the dump contents) in the incident log.

Exact Supabase UI steps belong in the Phase 14 deploy runbook; keep dumps out of git.

---

## 4. Before-migration backup

Before any production (or shared) migration:

1. Take a dump or provider snapshot.
2. Confirm the artifact is readable (quick restore to disposable DB, or provider “download OK”).
3. Apply migration via controlled CI/deploy using `pnpm db:migrate` (wrapper prefers `DATABASE_URL_DIRECT` by temporarily assigning it to `DATABASE_URL` for the Payload process).
4. Re-check `pnpm db:migrate:status` / app health.

Local disposable DBs may skip long-term retention; still practice the dump → new DB → verify loop before trusting a new migration.

---

## 5. Incident restore

1. Freeze further writes if corruption/data-loss is suspected.
2. Identify the last known-good dump/snapshot (time + migration era).
3. Restore into a **new** database; do not blindly overwrite the only remaining copy.
4. Verify migrate status and critical flows.
5. Cut over credentials/env only after verification.
6. Rotate secrets if the incident involved credential exposure.
7. Prefer a **forward-fix** migration for schema drift after restore when needed — see [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md).

---

## 6. Retention (guidance)

| Environment | Suggestion |
| --- | --- |
| Local Docker | Ephemeral; delete temp dumps after smoke |
| Shared non-prod | Keep last few pre-migration dumps; expire on a schedule |
| Production | Keep pre-migration + pre-demo + post-incident copies per org policy; encrypt; access-logged |

When deleting dumps, use secure delete practices appropriate to the storage medium; treat filenames as mildly sensitive if they encode environment names.

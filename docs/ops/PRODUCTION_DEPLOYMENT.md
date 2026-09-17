# Production deployment runbook (Phase 14)

**Status:** Phase 14-A readiness documentation — **ENGINEERING READY** targets only.  
**Not:** automatic go-live. Do not treat this file as authorization to migrate, rotate secrets, or redeploy Production.

Related: [ENVIRONMENT_MATRIX.md](./ENVIRONMENT_MATRIX.md), [BACKUP_RESTORE.md](./BACKUP_RESTORE.md), [MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md), [PRODUCTION_SMOKE.md](./PRODUCTION_SMOKE.md), [SECURITY.md](../SECURITY.md).

---

## Status vocabulary (mandatory)

| Label | Meaning |
| --- | --- |
| **ENGINEERING READY** | Code + docs + automated gates for a milestone are green; no claim that live envs are isolated or launched |
| **DEPLOYMENT READY** | Owner verified env isolation, backups, and approval checklist; a controlled deploy may proceed |
| **PRODUCTION LAUNCHED** | Owner-confirmed public launch with PRODUCTION content policy and smoke sign-off |

Phase 14-A aims at **ENGINEERING READY** only.

---

## Absolute stop conditions (require explicit owner approval)

- Create / delete / alter Production or Preview databases
- Change Vercel Production or Preview environment variables
- Run migrations against the live WARAQA Supabase project
- Rotate `PAYLOAD_SECRET` / `PREVIEW_SECRET` / DB passwords
- Promote DEMO procedures to PRODUCTION
- Re-run Phase 12 seed against a shared/live database
- Merge without review, or redeploy Production from this runbook alone

---

## Preflight (owner + engineer)

1. **Database identity (no secret printing)**  
   - In Vercel Production env, confirm `DATABASE_URL` project ref matches the intended WARAQA project.  
   - Confirm Preview DB ref differs (see Environment Matrix).  
   - Never paste connection strings into tickets, PRs, or chat.

2. **Secrets present (names only)**  
   - `DATABASE_URL`, `DATABASE_URL_DIRECT`, `PAYLOAD_SECRET` (≥32), `PREVIEW_SECRET` (≥32), `NEXT_PUBLIC_SERVER_URL`.  
   - Optional: `WARAQA_PUBLIC_CONTENT_MODE` (`demo` only while DEMO public surface is intentional).

3. **Admin accounts**  
   - Preserve existing Production admin(s). Do not recreate via seed.  
   - Do not log or commit passwords.

4. **Backup**  
   - Follow [BACKUP_RESTORE.md](./BACKUP_RESTORE.md). On Supabase Free, perform a **manual export** before migrations.

5. **Content policy**  
   - Understand current mode: DEMO public surface vs PRODUCTION-only.  
   - Switching mode is an owner decision; DEMO content is not auto-promoted.

---

## Rollout sequence (when owner approves a later Phase 14 milestone)

1. Backup Production DB.  
2. Apply pending migrations using `DATABASE_URL_DIRECT` on a secure runner (**never** at request time).  
3. Deploy the approved git SHA to Vercel Production.  
4. Run [PRODUCTION_SMOKE.md](./PRODUCTION_SMOKE.md) / `pnpm smoke:deploy`.  
5. Owner verifies Admin login and citizen Golden path.  
6. Only then consider content-mode changes or PRODUCTION promotions (separate approval).

---

## Rollback

1. Prefer Vercel instant rollback to previous deployment SHA.  
2. If schema migration caused failure: restore DB from the pre-migrate backup into a **new** database, re-point credentials only with owner approval ([MIGRATION_ROLLBACK.md](./MIGRATION_ROLLBACK.md)).  
3. If wrong DB target was used: stop traffic, restore correct env vars (owner), invalidate sessions if secrets leaked, document incident.

---

## Incorrect DB target recovery

Symptoms: empty public site, missing DEMO/PRODUCTION procedures, admin users from another project, health 503.

1. Do **not** seed or migrate “to fix” blindly.  
2. Compare Vercel Production DB project ref to the known-good WARAQA project (prefix check only).  
3. Owner corrects env vars in Vercel; redeploy.  
4. Rotate credentials if the wrong project was writable from Production.

---

## Post-deploy smoke

See [PRODUCTION_SMOKE.md](./PRODUCTION_SMOKE.md). Automated read-only: `WARAQA_SMOKE_BASE_URL=… pnpm smoke:deploy`.

---

## Secret hygiene

- Never commit `.env*`, dumps, or `docs/qa/**/.local-credentials`.  
- `pnpm scan:secrets` must pass in CI.  
- `/api/health` must not return connection strings.  
- Client bundles must not embed server secrets (`PAYLOAD_*`, `DATABASE_*`, `PREVIEW_SECRET`).

# Waraqa Security Baseline

**Status:** Phase 4–13 delivered; Phase 14-A deployment readiness (ENGINEERING READY docs/gates — not PRODUCTION LAUNCHED)

**Last updated:** 2026-09-17

**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [RBAC.md](./RBAC.md), [PREVIEW_SECURITY.md](./PREVIEW_SECURITY.md), [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md), [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md), [ops/BACKUP_RESTORE.md](./ops/BACKUP_RESTORE.md), [ops/ENVIRONMENT_MATRIX.md](./ops/ENVIRONMENT_MATRIX.md), [ops/PRODUCTION_DEPLOYMENT.md](./ops/PRODUCTION_DEPLOYMENT.md), [qa/phase-13/DEPENDENCY_AUDIT.md](./qa/phase-13/DEPENDENCY_AUDIT.md), [.env.example](../.env.example)

## 1. Secret management

- Store secrets only in local `.env.local` (gitignored) and Vercel project environment variables.
- Never commit `.env`, service-role keys, database passwords, or `PAYLOAD_SECRET`.
- Rotate `PAYLOAD_SECRET` and DB passwords if exposure is suspected.
- Use **separate** Supabase projects (or at least separate credentials) for development, preview, and production.
- `.env.example` contains **placeholders only**.

## 2. Server-only vs public environment variables

| Variable | Exposure | MVP contract |
| --- | --- | --- |
| `DATABASE_URL` | Server-only | **Required** — transaction pooler `:6543` for Vercel runtime |
| `DATABASE_URL_DIRECT` | Server-only | **Required for migrations** — direct or session `:5432`. `pnpm db:migrate*` temporarily maps this onto `DATABASE_URL` for the Payload CLI (adapter reads `DATABASE_URL` only). |
| `PAYLOAD_SECRET` | Server-only | **Required** |
| `NEXT_PUBLIC_SERVER_URL` | Public | **Required** — canonical base URL (includes protocol) |
| `PREVIEW_SECRET` | Server-only | **Only when draft preview is implemented** — not in the initial contract |
| `WARAQA_PUBLIC_CONTENT_MODE` | Server-only | **Optional (P0-06)** — `production` (default) \| `demo`; invalid → production. See [CONTENT_ISOLATION.md](./CONTENT_ISOLATION.md) |
| `CRON_SECRET` | — | **Removed** from initial MVP contract; add only if a cron feature is introduced |
| `VERCEL_URL` | System-provided | Host without `https://`; do not use alone as canonical production URL |
| `NODE_ENV` | Runtime | Framework-managed — **owner must not configure manually** |

**Never** prefix database credentials or Payload secrets with `NEXT_PUBLIC_`.  
**Never** ship admin/service database keys to the browser.

## 3. Admin authentication

- Admin access only via Payload `/admin`.
- Strong passwords; create production admins manually (no shared demo passwords in public docs).
- First user bootstrap becomes admin; subsequent users are not silent admins (see [RBAC.md](./RBAC.md)).
- Use secure cookies in production (`secure`, `httpOnly`, appropriate `sameSite`) per Payload production guidance: https://payloadcms.com/docs/production/deployment
- Prefer account lockout / failure throttling as provided by Payload anti-abuse features.
- Do not link `/admin` from public navigation.

## 4. RBAC (Phase 3 implemented)

Full matrix, bootstrap rules, publish hook, and private-field stripping: **[RBAC.md](./RBAC.md)**.

Roles (roadmap): `admin` | `reviewer` | `researcher` | `viewer`.

| Role | Publish | Manage users | Draft content |
| --- | --- | --- | --- |
| admin | Yes | Yes | Yes |
| reviewer | Yes (per policy) | No | Review / approve |
| researcher | **No** | No | Yes (draft / submit) |
| viewer | No | No | Read-only (published + active) |

**Researchers cannot publish via API** — collection update access blocks published docs for researchers, and `enforcePublishAuthorization` rejects publish/unpublish transitions unless the actor is an active `admin` or `reviewer`. Covered by `pnpm test:collections` integration tests (fictional data only).

## 5. Published-content-only public APIs

- Public queries filter to published **and** `active` records only.
- **Transactions (Phase 4+):** also exclude `markedOutdated` and `workflowState = archived` via `getPublicTransactionWhere()` (search and Phase 7 detail use the same gate — [SEARCH_ARCHITECTURE.md](./SEARCH_ARCHITECTURE.md), [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md)).
- **P0-06 contentClass (IMPLEMENTED):** public transaction/source reads also require `contentClass` in the mode-allowed set (`PRODUCTION` only by default; `DEMO` only when `WARAQA_PUBLIC_CONTENT_MODE=demo`). `QA_TEST` is never public. See [CONTENT_ISOLATION.md](./CONTENT_ISOLATION.md).
- **Phase 7 detail:** `loadPublicTransactionBySlug` always uses `overrideAccess: false`, maps to a public DTO (no raw Payload document in React), and returns a uniform not-found for draft/inactive/archived/outdated/missing slugs (no existence leak; no outdated warning page).
- Phase 10 reporting CTA is on eligible transaction detail pages (see CONTENT_MODEL § user-reports).
- Draft preview requires authenticated admin session or a signed preview secret **after** preview is implemented.
- `internalNotes` (transactions), generated `searchText`, and editorial source `notes` are never returned to anonymous/viewer reads.
- Errors returned to clients must be safe (no stack traces, no secrets).
- Public search caps query length and page range; uses Payload `Where` (no string-interpolated SQL in app code).
- Public source links on the detail page allow **http(s) only**; unsafe protocols are dropped.

## 6. Web application hardening

| Control | MVP expectation |
| --- | --- |
| CSRF | Rely on framework/Payload cookie + same-site practices; avoid cookie auth on cross-site public POSTs |
| XSS | Sanitize / safely serialize rich text; never render raw user HTML from reports |
| Rate limiting | Public report POSTs: PostgreSQL `report_rate_buckets` + **IP-only** HMAC identity (User-Agent excluded; Vercel `x-forwarded-for`/`x-real-ip`; fail-closed if IP untrustworthy); no raw IP stored |
| Secure cookies | HTTPS-only in production; secure admin cookies |
| Input validation | Zod at all custom input boundaries |
| CSP | Plan and test before PRODUCTION LAUNCHED (full CSP still deferred; Phase 14-A ships baseline nosniff / referrer / frame / permissions headers) |
| User reports | Never publicly readable; plain text; honeypot; contact field ACL (admin/reviewer); no attachments; `assignedTo` editorial-only (Phase 11); public API rejects assignment |
| Transaction hard delete | Previously published/approved/archived blocked server-side; linked reports RESTRICT; seed bypass only `context.seed` + non-prod |
| Editorial dashboard | Internal `/api/admin-ops/dashboard` — active admin/reviewer; cheap counts only; no public exposure |

## 7. Data minimization

- **No** identity-document uploads in MVP.
- **No** national ID collection.
- **No** citizen accounts.
- Change reports (Phase 10): optional contact only; never published automatically; not in public DTOs/URLs. Rate-limit identity is a one-way **IP-only** HMAC — raw IP is not persisted; User-Agent cannot bypass buckets. Success UX is client-state only (not `?sent=1`). Editorial status transitions require audit-events (fail closed); citizen `report_received` audit is best-effort. Phase 11 `assignedTo` is editorial-only; assignment audits store assignee ids only (no contact/message).
- Phase 11 Admin dashboard is authenticated editorial-only; counts use indexed Payload queries (no claim-graph N+1 on load).
- **Guide answers / checklist (Phase 8–9):** never sent to the server; never in URLs. **P9-B:** schema-versioned device-local `localStorage` (`waraqa:guide:<slug>`) for answers + document checklist progress only — fail closed on version/identity/shape mismatch. Restart clears the blob. No cookies, DB, or server citizen state. **P9-C:** browser-native print does not transmit or persist answers; generated print date is local display only. **P9-D:** WhatsApp share is client-side text only — public transaction detail URL, no answers/checklist state, no server-stored personalized results. **P9-E:** edit-from-result prunes inapplicable answers before evaluation/persist so hidden answers cannot silently drive rules. See [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md) §2.1–§2.4.

## 8. Dependency and migration safety

- Pin major stack packages; keep all Payload packages at **`3.86.0`** until a deliberate upgrade.
- Bootstrap with `create-payload-app@3.86.0` — never `@latest` for the audited MVP.
- Do not disable ESLint/TypeScript to “pass” CI.
- Apply schema changes via Payload migrations—not manual production DDL.
- Migrations: `pnpm db:migrate*` prefers `DATABASE_URL_DIRECT` by mapping it onto `DATABASE_URL` for the Payload CLI (adapter reads `DATABASE_URL` only); production migrations run only in controlled CI/deploy steps.
- Preview must never migrate the production database.
- Do not run production migrations at application runtime.
- On Supabase Free: perform a **manual backup/export** before important production migrations.
- Review access control after every schema/workflow change.

## 9. Backups

- Free Supabase: **no** automatic backups on Free plan (per Supabase pricing). Manual export is mandatory before important production migrations and before major demos: https://supabase.com/pricing
- **Phase 13 runbook:** [ops/BACKUP_RESTORE.md](./ops/BACKUP_RESTORE.md) — `pg_dump`, restore into a **new** disposable DB, verify, retention, pre-migration backup, incident restore. Local Docker smoke: `pnpm phase13:backup-restore-smoke` (`ALLOW_QA_FIXTURE=1` only; never production data; never commit dumps).
- Rollback strategy (enums, forward-fix): [ops/MIGRATION_ROLLBACK.md](./ops/MIGRATION_ROLLBACK.md).
- Keep migration files in git so schema can be rebuilt; **do not rewrite** historical applied migrations.

## 10. Safe demo-data labeling

Any unverified or placeholder procedure content must be visibly labeled in Arabic, e.g.:

> بيانات تجريبية للعرض — ليست معلومات رسمية

Never present invented fees, requirements, or official claims as verified.

## 11. Phase 13 — dependency audit

- Run `pnpm audit` / `pnpm audit:deps` during hardening.
- Current baseline (2026-09-14): **0 critical**, **5 high** on **dev paths** (brace-expansion via ESLint; undici via jsdom/vitest). Citizen UI production runtime is not on those paths; mitigate with pnpm overrides — see [qa/phase-13/DEPENDENCY_AUDIT.md](./qa/phase-13/DEPENDENCY_AUDIT.md).

## 12. Phase 13 — seed bypass (production locked)

- `allowSeedBypass` (`src/lib/qa-seed-guard.ts`) returns **false** when `NODE_ENV=production` or `VERCEL_ENV=production`. `ALLOW_QA_FIXTURE` / Phase 12 seed flags **cannot** unlock bypass on production runtimes.
- Seed still requires `req.context.seed === true` plus test runtime or `ALLOW_QA_FIXTURE=1` in non-production.
- Phase 12 / Phase 13 CI prepare scripts refuse production and never log passwords.

## 13. Phase 13 — secret scan

- Tracked-file scanner: `pnpm scan:secrets` → `scripts/secret-scan.ts`.
- Exit non-zero on likely secrets; values are redacted in output. Placeholders in `.env.example` and disposable local Docker credentials are allowed.
- Never commit `.env*`, dumps, or `docs/qa/**/.local-credentials`.

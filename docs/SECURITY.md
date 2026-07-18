# Waraqa Security Baseline

**Status:** Phase 0 (amended after owner CONDITIONAL PASS)  
**Last updated:** 2026-07-18  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [.env.example](../.env.example)

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
| `DATABASE_URL_DIRECT` | Server-only | **Required for migrations** — direct or session `:5432` |
| `PAYLOAD_SECRET` | Server-only | **Required** |
| `NEXT_PUBLIC_SERVER_URL` | Public | **Required** — canonical base URL (includes protocol) |
| `PREVIEW_SECRET` | Server-only | **Only when draft preview is implemented** — not in the initial contract |
| `CRON_SECRET` | — | **Removed** from initial MVP contract; add only if a cron feature is introduced |
| `VERCEL_URL` | System-provided | Host without `https://`; do not use alone as canonical production URL |
| `NODE_ENV` | Runtime | Framework-managed — **owner must not configure manually** |

**Never** prefix database credentials or Payload secrets with `NEXT_PUBLIC_`.  
**Never** ship admin/service database keys to the browser.

## 3. Admin authentication

- Admin access only via Payload `/admin`.
- Strong passwords; create production admins manually (no shared demo passwords in public docs).
- Use secure cookies in production (`secure`, `httpOnly`, appropriate `sameSite`) per Payload production guidance: https://payloadcms.com/docs/production/deployment
- Prefer account lockout / failure throttling as provided by Payload anti-abuse features.
- Do not link `/admin` from public navigation.

## 4. RBAC

Enforce in Payload access control (and any custom server routes):

| Role | Publish | Manage users | Draft content |
| --- | --- | --- | --- |
| admin | Yes | Yes | Yes |
| reviewer | Per policy | No | Review / approve |
| researcher | **No** | No | Yes (draft / submit) |
| viewer | No | No | Read-only |

Researchers must not be able to publish via API manipulation. Cover with automated access-control tests in later phases.

## 5. Published-content-only public APIs

- Public queries filter to published (and non-archived) records only.
- Draft preview requires authenticated admin session or a signed preview secret **after** preview is implemented.
- Errors returned to clients must be safe (no stack traces, no secrets).

## 6. Web application hardening

| Control | MVP expectation |
| --- | --- |
| CSRF | Rely on framework/Payload cookie + same-site practices; avoid cookie auth on cross-site public POSTs |
| XSS | Sanitize / safely serialize rich text; never render raw user HTML from reports |
| Rate limiting | Public POSTs (reports, search abuse) rate-limited |
| Secure cookies | HTTPS-only in production; secure admin cookies |
| Input validation | Zod at all custom input boundaries |
| CSP | Plan and test before production demo (Phase later) |

## 7. Data minimization

- **No** identity-document uploads in MVP.
- **No** national ID collection.
- **No** citizen accounts.
- Change reports: optional contact only; never published automatically.
- Checklist state stays on-device (session/local storage).

## 8. Dependency and migration safety

- Pin major stack packages; keep all Payload packages at **`3.86.0`** until a deliberate upgrade.
- Bootstrap with `create-payload-app@3.86.0` — never `@latest` for the audited MVP.
- Do not disable ESLint/TypeScript to “pass” CI.
- Apply schema changes via Payload migrations—not manual production DDL.
- Migrations use `DATABASE_URL_DIRECT` only; production migrations run only in controlled CI/deploy steps.
- Preview must never migrate the production database.
- Do not run production migrations at application runtime.
- On Supabase Free: perform a **manual backup/export** before important production migrations.
- Review access control after every schema/workflow change.

## 9. Backups

- Free Supabase: **no** automatic backups on Free plan (per Supabase pricing). Manual export is mandatory before important production migrations and before major demos: https://supabase.com/pricing
- Document restore steps before production launch (Phase 14+).
- Keep migration files in git so schema can be rebuilt.

## 10. Safe demo-data labeling

Any unverified or placeholder procedure content must be visibly labeled in Arabic, e.g.:

> بيانات تجريبية للعرض — ليست معلومات رسمية

Never present invented fees, requirements, or official claims as verified.

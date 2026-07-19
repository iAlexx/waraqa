# Waraqa Architecture

**Status:** Phase 4 — COMPLETE — OWNER APPROVED (Phase 3 COMPLETE)

**Source of truth:** [WARAQA_MASTER_ROADMAP_EN.md](./WARAQA_MASTER_ROADMAP_EN.md)

**Last updated:** 2026-07-19

**Related:** [CONTENT_MODEL.md](./CONTENT_MODEL.md), [RBAC.md](./RBAC.md), [EDITORIAL_WORKFLOW.md](./EDITORIAL_WORKFLOW.md)

## 1. System context

Waraqa (ورقة) is an independent Syrian administrative-procedure guidance platform. It helps people discover the correct procedure for their situation, prepare required documents, and understand steps, fees, and sources—without acting as a government portal or completing procedures on behalf of users.

```text
[Citizen / expatriate on mobile]
        |
        v
[Public Next.js App Router site — Arabic RTL]
        |
        +-- published content only (SSR / RSC)
        |
        v
[Payload CMS (same Next.js app) — /admin]
        |
        v
[PostgreSQL on Supabase — separate DB per environment]
```

External actors:

| Actor | Interaction |
| --- | --- |
| Public visitor | Anonymous guide flows; optional change reports |
| Researcher / reviewer / admin | Authenticated Payload admin only |
| Vercel | Hosts the Next.js + Payload app (serverless) |
| Supabase | Hosts managed PostgreSQL (dev / preview / production separated) |
| GitHub (private) | Source control and CI trigger for Vercel |

## 2. Public web application

- **Framework:** Next.js App Router (React Server Components preferred).
- **Locale:** `html lang="ar-SY"` and `dir="rtl"` for all public surfaces.
- **Auth for citizens:** None in MVP. Full guide works anonymously.
- **Public APIs:** Return **published** records only; validate writes with Zod; rate-limit public POSTs.
- **Domain logic:** Guide evaluation (rules, variants, requirements) stays pure and unit-testable—no CMS I/O inside pure evaluators.
- **Client components:** Only where interaction requires them (guide answers, checklist, menus).

Primary public route families (from roadmap): home, search, categories, transactions + guide/result, static trust pages, report form.

## 3. Payload CMS administration

- Payload runs **inside** the same Next.js application (`(payload)` App Router segment).
- Admin UI at `/admin` (not linked from public navigation).
- **Phase 3 collections (implemented):** `users`, `categories`, `agencies`, `service-centers`, `documents`, `sources`, `transactions`.
- **Phase 3 global (minimal):** `site-settings` — fields: `siteName`, `tagline`, `independenceDisclaimer`, `footerDisclaimer`, `contactEmail`, `supportPhone`, `verificationPolicyDays`, `maintenanceMode`, `featuredTransactions`. Public UI consumption = **Phase 5**.
- **Outcome A (2026-07-18):** Owner authorized retaining the full `transactions` content model in Phase 3 (**COMPLETE — OWNER APPROVED**). Original roadmap conflict: Phase 3 tasks had no Transaction collection; Phase 4 said “implement Transaction collection.” Phase 4 is **COMPLETE — OWNER APPROVED** and must **not** rebuild/duplicate that schema — it extends workflow only (editorial transitions, audit events, scheduled review, preview, approval invalidation, Admin UX). See [CONTENT_MODEL.md](./CONTENT_MODEL.md).
- **Phase 4 Admin UI polish debt (non-blocking):** mixed EN/AR Admin chrome; empty parent category display; boolean نعم/لا badges; Admin login branding — documented in [PHASE_CHECKLIST.md](./PHASE_CHECKLIST.md); not implemented in Phase 3.
- **Naming:** collection slug is `transactions` (Arabic معاملة/المعاملات); owner brief preferred `procedures` — roadmap wins.
- Roles (roadmap): `admin`, `reviewer`, `researcher`, `viewer`. Researchers cannot publish. See [RBAC.md](./RBAC.md).
- Access control is enforced in Payload (collection access + publish hook) and re-checked in any custom server routes.
- **GraphQL:** disabled (`graphQL.disable: true`).
- **Localization:** locales `ar` / `en`, **default `ar`**, `fallback: true`.
- **Migrations directory:** repo-root `migrations/` (Payload `migrationDir`), not app runtime.

## 4. PostgreSQL data store

- Adapter: `@payloadcms/db-postgres` **3.86.0** (Drizzle + **node-postgres**).
- Hosted: Supabase PostgreSQL with **separate projects/databases and credentials** for development, preview, and production.
- Local: Docker Postgres **or** a dedicated non-production Supabase project.
- Schema changes: Payload migrations for non-local environments; Drizzle `push` only when `PAYLOAD_DATABASE_PUSH=1` on a disposable local DB.
- Phase 3 migrations: `20260718_052746_phase_3_core_collections`, `20260718_163635_phase_3_site_settings` (short `dbName` values for Postgres 63-char limits).

### Connection roles

| Variable | Mode | Port | Used for |
| --- | --- | --- | --- |
| `DATABASE_URL` | Supavisor **transaction** pooler | **6543** | Vercel / serverless runtime only |
| `DATABASE_URL_DIRECT` | **Direct** when IPv6 (or IPv4 add-on) is available; otherwise Supavisor **session** pooler | **5432** | Migrations and long-lived tooling only |

Sources: [Supabase connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres), [Payload Postgres adapter](https://payloadcms.com/docs/database/postgres).

## 5. Auth boundary

| Surface | Auth |
| --- | --- |
| Public site | Unauthenticated |
| Public write endpoints (reports) | No account; anti-abuse + Zod + rate limits |
| Draft preview | Only after implemented: signed preview token (`PREVIEW_SECRET`) — not in the initial env contract |
| Payload admin | Payload local auth (email/password); roles via access control |
| Database | Server-only connection strings; never in client bundles |

Citizen accounts, national IDs, and identity-document uploads are **out of MVP scope**.

## 6. Public vs protected data

**Public (published + active only):**

- Categories, transactions, documents metadata, fees, steps, sources citations as designed for public display, service-center guidance.

**Protected:**

- Draft / in-review / approved-unpublished content
- Admin users and credentials
- Change reports and reporter contact details
- Audit events
- Internal verification notes (`internalNotes`, source editorial `notes`)

## 7. Deployment topology

```text
GitHub (private)  -->  Vercel
                         |
                         +--> Production env  --> Production Supabase project
                         |         DATABASE_URL          (transaction :6543)
                         |         DATABASE_URL_DIRECT   (direct or session :5432)
                         |
                         +--> Preview env     --> Preview Supabase project (separate)
                         |
                         +--> Local / CI      --> Dev DB (Docker or separate Supabase)
```

Rules:

- Preview deployments **must never** use production database credentials.
- No custom domain required for MVP.
- No Redis, Kafka, Elasticsearch, Kubernetes, or microservices.
- Media: Vercel filesystem is ephemeral; MVP avoids identity uploads.

## 8. Migration workflow

**Hard rules**

1. Preview deployments **must never** run migrations against the production database.
2. Production migrations run **only** in a controlled production CI/deployment step.
3. Development, preview, and production use **separate credentials** and preferably **separate databases**.
4. **Do not** run production migrations at application runtime (no migrate-on-boot in serverless handlers).
5. While on Supabase Free (no automatic backups): perform a **manual backup/export** before important production migrations.

**Procedure**

1. **Local:** develop with disposable DB; optional `PAYLOAD_DATABASE_PUSH=1` for push-only local iteration.
2. **Create migration:** `pnpm db:migrate:create` when a feature is ready.
3. **Apply / status:** `pnpm db:migrate` / `pnpm db:migrate:status` (uses Payload migrate against `DATABASE_URL_DIRECT` as configured).
4. **Preview:** if migrations are needed, run them only against the **preview** database using that environment’s `DATABASE_URL_DIRECT`.
5. **Production:** after manual export, run migrate in the production CI/deploy pipeline with production `DATABASE_URL_DIRECT`, then build/deploy the app. Runtime uses `DATABASE_URL` (transaction pooler) only.

## 9. Local development workflow

Recommended:

1. Use Node **`24.18.0`** via `.nvmrc` / `.node-version`; Vercel/runtime policy is `engines.node: "24.x"`.
2. Use **`pnpm@11.14.0`** (`packageManager` field).
3. Bootstrap was with the audited CLI only: `pnpx create-payload-app@3.86.0 --use-pnpm` (do not use `@latest`).
4. Copy `.env.example` → `.env.local` and fill placeholders (separate non-prod DB).
5. `pnpm install` → `pnpm dev` (include Payload’s Next 16.2+ HMR workaround when required: `--no-server-fast-refresh`).
6. Open public site at `http://localhost:3000` and admin at `http://localhost:3000/admin`.
7. Quality gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (and `pnpm test:e2e` / `pnpm test:collections` as applicable).

## 10. Arabic RTL

- Public UI is Arabic-first (`ar-SY`).
- Prefer **logical CSS** (`ms`/`me`, `ps`/`pe`, `start`/`end`) over physical left/right.
- Use shadcn/ui with RTL mode enabled ([shadcn RTL docs](https://ui.shadcn.com/docs/rtl)).
- Fonts: IBM Plex Sans Arabic (preferred) or Noto Sans Arabic per roadmap; Phase 2 brand system uses Aref Ruqaa for the wordmark.
- Payload admin language may remain English initially; public copy must remain Arabic.
- CMS field localization: Arabic default + English fallback at the Payload layer.

## 11. Future scaling (without premature microservices)

Keep a modular monolith until measured need appears:

| Growth signal | Possible later move |
| --- | --- |
| Connection exhaustion | Larger Supabase compute; dedicated pooler; read replicas |
| Media growth | External blob storage adapter |
| Heavy search | Consider Postgres FTS first; Elasticsearch only if proven insufficient |
| Background jobs | Introduce cron/`CRON_SECRET` only when a real job exists |
| Multi-tenant offices | Separate product edition—not MVP |

Do **not** introduce NestJS, Redis, Kafka, Elasticsearch, or Kubernetes for the MVP.

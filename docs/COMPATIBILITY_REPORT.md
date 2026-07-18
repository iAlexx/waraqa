# Compatibility Report — Phase 0

**Audit date:** 2026-07-18  
**Amended:** 2026-07-18 (owner CONDITIONAL PASS)  
**Method:** Official docs + npm registry metadata only (no Reddit/unofficial tables as authority).

## 1. Repository inspection summary

| Item | Finding |
| --- | --- |
| Application framework | **Not initialized** (no `package.json`, no Next.js/Payload app) |
| Package manager | Not yet present; Phase 1 will pin **`pnpm@11.14.0`** via `packageManager` |
| Node policy | `engines.node`: **`24.x`**; local **`.nvmrc` / `.node-version`**: **`24.18.0`** |
| Env files | `.env.example` only (placeholders) |
| Dependencies | None installed |
| Suspicious/incomplete config | N/A (greenfield aside from planning docs) |
| Roadmap | `docs/WARAQA_MASTER_ROADMAP_EN.md` (+ root copy) |

## 2. Official compatibility matrix

| Technology | Official constraint (cited) | Compatible with MVP plan? |
| --- | --- | --- |
| Node.js | Payload engines: `^18.20.2 \|\| >=20.9.0` ([npm payload@3.86.0](https://www.npmjs.com/package/payload)); Next.js 16: `>=20.9.0` ([Next.js 16 blog](https://nextjs.org/blog/next-16)); Node LTS download: **24.18.0** ([nodejs.org](https://nodejs.org/en/download/)) | **Yes** — Vercel `24.x`; local pin `24.18.0` |
| pnpm | Preferred by Payload ([installation](https://payloadcms.com/docs/getting-started/installation)); pnpm 11 requires Node **≥22** ([pnpm install docs](https://pnpm.io/installation)) | **Yes** — pin **`pnpm@11.14.0`** |
| Next.js App Router | Payload peer on `@payloadcms/next@3.86.0`: `>=16.2.6 <17.0.0` ([npm @payloadcms/next](https://www.npmjs.com/package/@payloadcms/next)) | **Yes** — pin `16.2.10` |
| React | Next 16 peers `^18.2 \|\| ^19`; React `19.2.7` | **Yes** |
| Payload CMS | `3.86.0` ([npm payload](https://www.npmjs.com/package/payload)) | **Yes** — bootstrap with **`create-payload-app@3.86.0`**, not `@latest` |
| `@payloadcms/db-postgres` | `3.86.0`, peer `payload@3.86.0`; uses Drizzle + **node-postgres** ([Payload postgres docs](https://payloadcms.com/docs/database/postgres)) | **Yes** — lockstep `3.86.0` |
| TypeScript | Next 16 minimum **5.1.0**; **TS 7 not supported** by Next yet | **Yes** — pin **5.9.3**, not 7.x |
| Tailwind CSS | `4.3.3` | **Yes** |
| shadcn/ui | Official Next + RTL docs ([RTL](https://ui.shadcn.com/docs/rtl)) | **Yes** |
| Vitest | `4.1.10`, engines include Node 24 | **Yes** |
| Playwright | `@playwright/test@1.61.1` | **Yes** |
| PostgreSQL / Supabase | Direct / session / transaction modes ([Connecting](https://supabase.com/docs/guides/database/connecting-to-postgres)) | **Yes** with dual URLs |
| Vercel | Payload deploys where Next runs ([deployment](https://payloadcms.com/docs/production/deployment)) | **Yes** with pooling + no local disk media |

## 3. Exact recommended MVP pins

| Package / runtime | Exact pin / policy | Why | Must not upgrade alone |
| --- | --- | --- | --- |
| Node.js (engines) | **`24.x`** | Vercel guarantees the major runtime, not an exact patch | Do not pin patch in `engines` |
| Node.js (local) | **`24.18.0`** in `.nvmrc` / `.node-version` | Current LTS audited on 2026-07-18 | Align team local installs |
| pnpm | **`pnpm@11.14.0`** via `packageManager` | Exact Corepack pin; needs Node ≥22 | Do not use pnpm 11 on Node 20 |
| `next` | `16.2.10` | Within Payload peer `>=16.2.6 <17` | Do not jump to 17 until Payload allows |
| `react` / `react-dom` | `19.2.7` | Current stable matching Next peer range | Keep pair in lockstep |
| `payload` + all `@payloadcms/*` | **`3.86.0`** | Audited release; CLI pin matches | **Never** mix Payload package versions |
| `typescript` | `5.9.3` | Meets Next ≥5.1; avoids TS 7 | Do not use `typescript@7` |
| `tailwindcss` | `4.3.3` | Current stable | Coordinate with scaffold PostCSS packages |
| `zod` | `4.4.3` | App boundary validation | Watch scaffold Zod major |
| `vitest` | `4.1.10` | Current stable | Align Vite peer when configuring |
| `@playwright/test` | `1.61.1` | Current stable | Keep browsers via Playwright |

### Peer / runtime notes

1. **Payload lockstep:** every `@payloadcms/*` package must be **`3.86.0`**.
2. **Next.js 16.2+ HMR:** use `next dev --no-server-fast-refresh` when Payload HMR breaks.
3. **TypeScript 7:** excluded for MVP.

## 4. Bootstrap command (recommend only — not executed)

```bash
pnpx create-payload-app@3.86.0 --use-pnpm
```

Do **not** use `create-payload-app@latest`. After scaffolding, verify the lockfile still pins Payload packages to **3.86.0** before merging.

## 5. Supabase connections (owner amendment)

| Variable | Exact role |
| --- | --- |
| `DATABASE_URL` | Supavisor **transaction** pooler, port **6543**, for Vercel runtime |
| `DATABASE_URL_DIRECT` | **Direct** `:5432` when IPv6 (or IPv4 add-on) works; otherwise Supavisor **session** pooler `:5432` for migrations |

Official facts:

- Transaction mode is for serverless/transient clients and **does not support prepared statements** ([Supabase connecting](https://supabase.com/docs/guides/database/connecting-to-postgres), [Disabling prepared statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL)).
- Direct and session modes **do** support prepared statements.
- Free tier: pause after inactivity, 500 MB DB, **no automatic backups**, 2 active projects ([pricing](https://supabase.com/pricing), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).

### Payload + Drizzle + node-postgres vs transaction pooling

**Verified official behavior:**

| Fact | Source |
| --- | --- |
| `@payloadcms/db-postgres` uses **Drizzle ORM** and **node-postgres (`pg`)** | [Payload Postgres docs](https://payloadcms.com/docs/database/postgres) |
| Documented adapter config passes a `pool` object to node-postgres | Same docs — `pool: { connectionString: process.env.DATABASE_URL }` |
| Documented adapter options include `pool`, `push`, `migrationDir`, `transactionOptions`, etc. | Same docs |
| Supabase transaction pooler forbids prepared statements | [Supabase docs](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| Drizzle’s **postgres.js** guide sets `prepare: false` for transaction mode | [Drizzle ↔ Supabase](https://orm.drizzle.team/docs/connect-supabase) |
| node-postgres creates named prepared statements only when a query `name` is supplied | [node-postgres queries](https://node-postgres.com/features/queries) |
| Supabase’s node-postgres tip: omit query `name` | [Supabase troubleshooting](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL) |

**What we will not invent:** Payload’s official Postgres docs do **not** document a `prepare: false` (or equivalent) option on `postgresAdapter` / `pool` for the node-postgres path. That flag belongs to **postgres.js**, which is **not** Payload’s default driver. Phase 0 therefore does **not** claim an unsupported adapter option.

### Exact Phase 1 configuration to test

Documented starting config (runtime), using only Payload-documented options:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'

db: postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL, // transaction pooler :6543 on Vercel
    // Keep max small per serverless instance (standard pg Pool option; tune after measurement)
    max: 3,
  },
  // Non-local / migrate workflow: disable push; apply schema via migrations only
  push: false,
})
```

Migration / tooling process (separate from app runtime):

- Set `DATABASE_URL_DIRECT` to direct `:5432` **or** session pooler `:5432`.
- Run `payload migrate` only in controlled CI/deploy against the **target environment’s** direct/session URL.
- Never point preview migrate steps at production credentials.

**Phase 1 verification checklist (must pass before trusting prod pooler):**

1. Boot Payload admin + public health against transaction-pooled `DATABASE_URL`.
2. Exercise create/read/update/delete of a trivial collection (or first real collection once Phase 3 starts) under transaction pooling.
3. Run `payload migrate` against `DATABASE_URL_DIRECT` (session or direct) on a disposable DB.
4. If errors mention prepared statements / pooler incompatibility: record the exact error, file it in this report, and evaluate only **documented** mitigations (e.g. session-mode runtime tradeoffs, Payload release notes, official Supabase/node-postgres guidance). Do not invent adapter flags.

## 6. Migration policy (owner amendment)

| Rule | Requirement |
| --- | --- |
| Preview vs prod | Preview must **never** migrate the production database |
| Production migrate | Only in a controlled production CI/deployment step |
| Separation | Preview, development, and production use separate credentials and preferably separate databases |
| Free-tier backup | Manual backup/export required before important production migrations |
| Runtime | Do **not** run production migrations inside application request handlers |

## 7. Payload on Vercel (summary)

| Topic | Finding |
| --- | --- |
| Serverless | Supported via Next.js |
| Filesystem | Ephemeral — no local disk media in production |
| Media | MVP excludes identity uploads |
| DB | Runtime = transaction `:6543`; migrations = direct/session `:5432` |
| Build-time DB | Only if CI migrate step is intentional and uses the correct env DB |
| Admin | `/admin` Next routes |
| Duration | Hobby max **300s**; cold starts expected |
| Body limit | **4.5 MB** |

## 8. Environment-variable contract (amended)

| Variable | Public? | Required? | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Server-only | **Yes** | Transaction pooler `:6543` for Vercel runtime |
| `DATABASE_URL_DIRECT` | Server-only | **Yes** (migrations) | Direct or session `:5432` |
| `PAYLOAD_SECRET` | Server-only | **Yes** | Never in browser |
| `NEXT_PUBLIC_SERVER_URL` | Public | **Yes** | Canonical origin with `https://` |
| `PREVIEW_SECRET` | Server-only | **Only when draft preview is implemented** | Not in initial MVP contract |
| `CRON_SECRET` | — | **Removed** from initial MVP contract | Reintroduce only if a cron feature is added |
| `NODE_ENV` | Runtime | Framework-managed | Owner must **not** set manually |
| `VERCEL_URL` | System | Optional helper | Host only; **no** `https://` |

## 9. Conclusion

The selected stack remains **officially compatible** under the amended pins and policies. Highest care items: Payload **3.86.0** lockstep (no `@latest` CLI), Node `24.x` engines + local `24.18.0`, Supabase dual URLs, no preview→prod migrations, no invented pooler adapter options, and Phase 1 empirical testing of transaction pooling with Payload’s node-postgres path.

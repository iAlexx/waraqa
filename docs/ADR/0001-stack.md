# ADR 0001 — MVP Technology Stack

- **Status:** Accepted (Phase 0 COMPLETE — OWNER APPROVED; Phase 1 authorized 2026-07-18)
- **Date:** 2026-07-18
- **Deciders:** Product owner + engineering
- **Related:** [ARCHITECTURE.md](../ARCHITECTURE.md), [COMPATIBILITY_REPORT.md](../COMPATIBILITY_REPORT.md), [WARAQA_MASTER_ROADMAP_EN.md](../WARAQA_MASTER_ROADMAP_EN.md)

## Decision

Build the Waraqa MVP as a **single Next.js App Router application** that embeds **Payload CMS**, stores content in **PostgreSQL on Supabase**, styles the public UI with **Tailwind CSS + shadcn/ui**, validates custom inputs with **Zod**, tests with **Vitest + Playwright**, deploys to **Vercel**, and keeps source in a **private GitHub repository**. Package management is **pnpm@11.14.0**.

## Context

The roadmap requires:

- Arabic RTL public site + professional CMS admin
- Published-content-only public APIs and role-based publishing
- Free preview deployment without a custom domain
- Strict TypeScript, automated tests, and migrations
- Explicit exclusion of microservices and unnecessary infra (Redis, Kafka, Elasticsearch, Kubernetes)

## Selected stack (pinned for Phase 1 bootstrap)

| Layer | Choice | Pin / policy |
| --- | --- | --- |
| Runtime (Vercel / engines) | Node.js | `engines.node`: **`24.x`** (Vercel guarantees the major, not an exact patch) |
| Runtime (local pin) | Node.js | **`.nvmrc` / `.node-version`**: `24.18.0` |
| Package manager | pnpm | **`packageManager`: `pnpm@11.14.0`** (exact) |
| App + CMS host | Next.js App Router | `16.2.10` |
| UI library | React / React DOM | `19.2.7` |
| CMS | Payload | **`3.86.0`** (+ all `@payloadcms/*` at **`3.86.0`**) |
| DB adapter | `@payloadcms/db-postgres` | **`3.86.0`** (lockstep with `payload`) |
| Database | PostgreSQL via Supabase | Managed (separate DBs per environment) |
| Language | TypeScript | `5.9.3` (not 7.x) |
| CSS | Tailwind CSS | `4.3.3` |
| Components | shadcn/ui | CLI `shadcn@latest` (copy-in components; enable RTL) |
| Validation | Zod | `4.4.3` |
| Unit/integration | Vitest | `4.1.10` |
| E2E | Playwright | `@playwright/test@1.61.1` |
| Hosting | Vercel | Next.js deployment |

Exact citations and peer constraints: see [COMPATIBILITY_REPORT.md](../COMPATIBILITY_REPORT.md).

### Node and package-manager policy (owner amendment)

When `package.json` is created in Phase 1:

```json
{
  "engines": {
    "node": "24.x"
  },
  "packageManager": "pnpm@11.14.0"
}
```

- Local developers use **`.nvmrc`** and/or **`.node-version`** containing **`24.18.0`**.
- Do not pin an exact Node patch in `engines` — Vercel selects a compatible `24.x` runtime.

### Phase 1 bootstrap command (do not use `@latest`)

```bash
pnpx create-payload-app@3.86.0 --use-pnpm
```

After scaffolding, keep **every** Payload package at **`3.86.0`** in lockstep (`payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, and any other `@payloadcms/*` added later).

## Alternatives considered

| Alternative | Why not for MVP |
| --- | --- |
| NestJS + separate frontend | Extra service boundary, deploy surface, and auth/session complexity without MVP benefit |
| Headless CMS SaaS only (no self-hosted Payload) | Weaker control over RBAC/workflow co-located with the app; roadmap specifies Payload |
| MongoDB adapter | Roadmap mandates PostgreSQL; relational model fits procedures/sources |
| Redis | No measured caching/session need; adds ops cost |
| Kafka / event bus | Single writer workflow; overkill |
| Elasticsearch | Postgres search/aliases sufficient for five procedures |
| Kubernetes / Docker Swarm | Vercel + managed Postgres covers MVP |
| Microservices | Violates roadmap exclusions; slows demo delivery |
| Separate admin SPA | Payload already provides Next-native admin |

## Consequences

**Positive**

- One deployable unit aligned with Payload’s official Next.js integration
- Server Components can query published data without a separate BFF
- Clear path for migrations and RBAC inside Payload
- RTL-capable UI toolchain (Tailwind + shadcn RTL)

**Negative / accept**

- Tight Payload ↔ Next version coupling (must upgrade together)
- Serverless DB pooling discipline required on Supabase (transaction pooler for runtime; direct/session for migrations)
- Ephemeral filesystem on Vercel → external media later
- Free-tier Supabase pausing / connection limits / no auto backups need operational care and manual export before important production migrations

## Future review conditions

Revisit this ADR when any of the following is true:

- Payload or Next peer ranges force a major upgrade
- Connection or cold-start metrics show sustained production pain
- Search quality fails after many procedures despite Postgres FTS
- Media volume requires a storage adapter
- Multi-tenant commercial edition is funded

Until then, do not add NestJS, Redis, Kafka, Elasticsearch, Kubernetes, or microservices.

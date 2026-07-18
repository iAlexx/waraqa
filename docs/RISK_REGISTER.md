# Risk Register — Phase 0

**Last updated:** 2026-07-18 (owner CONDITIONAL PASS amendments)

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R01 | Unsupported or mismatched dependency versions (esp. Next outside Payload peer range, or TypeScript 7) | Medium | High | Pin versions from COMPATIBILITY_REPORT; upgrade Payload packages in lockstep at **3.86.0**; forbid `typescript@7` until Next supports it; bootstrap with `create-payload-app@3.86.0` not `@latest` |
| R02 | Payload ↔ Next tight coupling breaks on independent upgrades | High | High | Treat `next` and `@payloadcms/next` as a single upgrade unit; keep all `@payloadcms/*` at the same version |
| R03 | Supabase connection exhaustion on free/Nano under serverless concurrency | Medium | High | `DATABASE_URL` = transaction pooler `:6543`; small `max` pool per instance; separate DBs per environment; monitor Dashboard connections |
| R04 | Preview deployments write to or migrate production DB | Medium | Critical | Separate Supabase project + credentials for preview; preview must never run migrations against production; distinct Vercel env vars |
| R05 | Free-tier limits (pause after inactivity, 500 MB, no auto backups) | High | Medium | Warm project before demos; **manual backup/export before important production migrations**; plan Pro if durability needed |
| R06 | Migration failures (transaction mode used for migrate, IPv6-only direct, migrate-at-runtime) | Medium | High | Migrations use `DATABASE_URL_DIRECT` (direct or session `:5432` only); production migrate only in controlled CI/deploy; never migrate in app runtime handlers |
| R07 | Draft / unpublished content exposed via public API or ISR cache | Medium | Critical | Publication filters in every public query; access-control tests; preview secrets only when preview exists; robots exclude preview |
| R08 | Unauthorized publishing (researcher escalate) | Medium | Critical | Payload access control + API tests proving researcher cannot publish |
| R09 | Incorrect Arabic RTL (physical CSS, mirrored icons, admin/public mix) | Medium | Medium | Logical CSS; shadcn RTL mode; manual QA at 360px; font with Arabic coverage |
| R10 | Unverified admin information presented as official | High | Critical | Source + `lastVerifiedAt` required to publish; demo label; never invent fees/requirements |
| R11 | Vercel ephemeral filesystem loses uploads | Medium | High | No local disk media in prod; defer media or use external blob storage |
| R12 | Future vendor migration (leave Supabase/Vercel/Payload) | Low | Medium | Keep schema in Payload migrations; avoid proprietary Supabase Auth/Storage for core MVP data path; standard Postgres SQL |
| R13 | Cold starts / function timeouts; accidental migrate-on-boot | Medium | Medium | Prefer migrate-at-CI only; keep handlers under Hobby 300s; never run production migrations at request time |
| R14 | pnpm 11 used with Node 20; engines pin too exact for Vercel | Medium | High | `engines.node: "24.x"`; local `.nvmrc`/`.node-version` = `24.18.0`; `packageManager: "pnpm@11.14.0"` |
| R15 | Payload + node-postgres + Supabase transaction pooler prepared-statement / session incompatibility | Medium | High | Phase 1 must empirically test the documented adapter config against `:6543`; do not invent unsupported `prepare` flags; fall back only to officially documented mitigations if failures appear |
| R16 | `create-payload-app@latest` drifts past audited Payload 3.86.0 | Medium | High | Always scaffold with `pnpx create-payload-app@3.86.0 --use-pnpm` |

## Risk acceptance for MVP

Accept free-tier operational limits (R05) and serverless cold starts (R13) for the incubator demo, provided R04, R06, R07, and R15 mitigations are in place before any shared URL is circulated.

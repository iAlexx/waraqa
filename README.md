# Waraqa (ورقة)

Independent Syrian administrative-procedure guidance platform.

> **ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.**  
> Waraqa is an independent guidance platform and is not a government website.

**Current phase:** Phase 1 — Project Bootstrap (IN PROGRESS until gates pass)

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | **24.18.0** locally (`.nvmrc` / `.node-version`); `engines.node` = **`24.x`** |
| pnpm | **11.14.0** (`packageManager`: `pnpm@11.14.0`) |

If Corepack cannot write shims under Program Files on Windows, run pnpm via:

```powershell
corepack pnpm@11.14.0 <command>
```

## Clean-clone setup (Windows PowerShell)

```powershell
cd path\to\WARAQA
node --version   # expect v24.18.0
corepack pnpm@11.14.0 --version   # expect 11.14.0

# Start disposable local Postgres (Docker required)
corepack pnpm@11.14.0 db:up

# Create local secrets file (never commit)
Copy-Item .env.example .env.local
# Edit .env.local:
# - DATABASE_URL and DATABASE_URL_DIRECT for local Docker (see below)
# - PAYLOAD_SECRET: generate with [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
#   or: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# - NEXT_PUBLIC_SERVER_URL=http://localhost:3000

corepack pnpm@11.14.0 install
corepack pnpm@11.14.0 dev
```

Open:

- Public site: http://localhost:3000
- Admin: http://localhost:3000/admin (create first user on first visit)
- Health: http://localhost:3000/api/health

## Environment variables

See [`.env.example`](./.env.example). Required for Phase 1:

- `DATABASE_URL` (server-only)
- `DATABASE_URL_DIRECT` (server-only, migrations/tooling)
- `PAYLOAD_SECRET` (server-only, ≥32 chars)
- `NEXT_PUBLIC_SERVER_URL` (public canonical origin)

**Never commit** `.env`, `.env.local`, or real secrets.  
**Never** use production database credentials for local or preview work.

### Local Docker Postgres values (development only)

With `docker compose` from this repo:

```env
DATABASE_URL=postgresql://waraqa:waraqa_dev_only@127.0.0.1:5433/waraqa
DATABASE_URL_DIRECT=postgresql://waraqa:waraqa_dev_only@127.0.0.1:5433/waraqa
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

Host port **5433** maps to container `5432` to avoid clashing with any local Postgres on `5432`.

### Supabase (non-production development)

If you prefer a dedicated **non-production** Supabase project:

- Runtime `DATABASE_URL`: transaction pooler `:6543` (Vercel-like)
- Local Docker may use direct `:5432` for both URLs
- Migrations tooling: `DATABASE_URL_DIRECT` = direct or session `:5432`
- Never point local/preview at production

## Docker commands (local Postgres only)

```powershell
corepack pnpm@11.14.0 db:up      # start
corepack pnpm@11.14.0 db:down    # stop
corepack pnpm@11.14.0 db:reset   # wipe volume and recreate
```

Docker is **not** a production dependency. Production uses managed Postgres (Supabase) on Vercel.

## Scripts

```powershell
corepack pnpm@11.14.0 install
corepack pnpm@11.14.0 dev
corepack pnpm@11.14.0 lint
corepack pnpm@11.14.0 typecheck
corepack pnpm@11.14.0 test
corepack pnpm@11.14.0 test:e2e
corepack pnpm@11.14.0 build
corepack pnpm@11.14.0 check
```

## Security notes

- No citizen accounts, national IDs, or identity-document uploads.
- `/admin` is not linked from the public placeholder page.
- Do not invent official procedure data in this phase.

## Documentation

- [Master roadmap](./docs/WARAQA_MASTER_ROADMAP_EN.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Stack ADR](./docs/ADR/0001-stack.md)
- [Security](./docs/SECURITY.md)
- [Phase checklist](./docs/PHASE_CHECKLIST.md)

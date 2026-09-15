/**
 * Cross-platform Payload migration wrapper.
 *
 * If DATABASE_URL_DIRECT is set, temporarily sets DATABASE_URL to that value
 * for the child Payload process (Payload's postgresAdapter reads DATABASE_URL).
 * Otherwise uses DATABASE_URL.
 *
 * Never prints connection credentials.
 *
 * Usage (via package.json):
 *   pnpm db:migrate
 *   pnpm db:migrate:status
 *   pnpm db:migrate:create [-- name]
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { buildMigrationChildEnv, resolveMigrationDatabaseUrl } from '../src/lib/db/migration-database-url.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, '.env') })

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: tsx scripts/payload-with-direct-db.ts <migrate|migrate:status|migrate:create> [...args]')
  process.exit(1)
}

let resolved
try {
  resolved = resolveMigrationDatabaseUrl(process.env)
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

console.log(`payload-db: using ${resolved.source} for migration tooling (credentials not printed)`)

const childEnv = buildMigrationChildEnv(process.env)
const payloadArgs = ['exec', 'payload', ...args]

const result = spawnSync('pnpm', payloadArgs, {
  cwd: ROOT,
  env: {
    ...process.env,
    ...childEnv,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--no-deprecation',
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)

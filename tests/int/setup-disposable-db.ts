/**
 * Integration tests run against a disposable Postgres database (`*_int`),
 * never the normal local `waraqa` database used by `pnpm dev` / QA fixtures.
 *
 * Safety: only runs under Vitest (or an explicit allow flag), and only against
 * database names that end with `_int`.
 */
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const INT_SUFFIX = '_int'

function databaseNameFromUrl(connectionString: string): string {
  const url = new URL(connectionString)
  return decodeURIComponent(url.pathname.replace(/^\//, ''))
}

function assertSafeIntegrationContext() {
  const allowed =
    process.env.VITEST === 'true' || process.env.WARAQA_ALLOW_DISPOSABLE_DB === '1'
  if (!allowed) {
    throw new Error(
      'Refusing disposable DB setup outside Vitest. Run via `pnpm test:int`, or set WARAQA_ALLOW_DISPOSABLE_DB=1 for an explicit test-safe context.',
    )
  }
}

function assertDisposableDatabaseName(connectionString: string, label: string) {
  const dbName = databaseNameFromUrl(connectionString)
  if (!dbName) {
    throw new Error(`${label} is missing a database name`)
  }
  if (!dbName.endsWith(INT_SUFFIX)) {
    throw new Error(
      `Refusing disposable DB setup against non-test database "${dbName}" (${label}). Expected a name ending with "${INT_SUFFIX}".`,
    )
  }
  // Never treat the shared production/local app DB name as disposable, even if mis-suffixed somehow.
  if (dbName === 'waraqa' || dbName === 'postgres') {
    throw new Error(`Refusing disposable DB setup against protected database "${dbName}" (${label}).`)
  }
}

function rewriteDatabaseName(connectionString: string, suffix = INT_SUFFIX): string {
  const url = new URL(connectionString)
  const current = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!current) {
    throw new Error('DATABASE_URL is missing a database name')
  }
  if (current.endsWith(suffix)) {
    return connectionString
  }
  url.pathname = `/${current}${suffix}`
  return url.toString()
}

function adminUrl(connectionString: string): string {
  const url = new URL(connectionString)
  url.pathname = '/postgres'
  return url.toString()
}

async function ensureDatabase(appUrl: string) {
  assertDisposableDatabaseName(appUrl, 'DATABASE_URL_DIRECT')
  const target = new URL(appUrl)
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''))
  const client = new Client({ connectionString: adminUrl(appUrl) })
  await client.connect()
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`)
    }
  } finally {
    await client.end()
  }
}

assertSafeIntegrationContext()

const sourceUrl = process.env.DATABASE_URL_INT || process.env.DATABASE_URL

if (!sourceUrl) {
  throw new Error('DATABASE_URL is required for integration tests')
}

const sourceDirect =
  process.env.DATABASE_URL_DIRECT_INT || process.env.DATABASE_URL_DIRECT || sourceUrl

const intUrl = rewriteDatabaseName(sourceUrl)
const intDirect = rewriteDatabaseName(sourceDirect)

assertDisposableDatabaseName(intUrl, 'DATABASE_URL')
assertDisposableDatabaseName(intDirect, 'DATABASE_URL_DIRECT')

process.env.DATABASE_URL = intUrl
process.env.DATABASE_URL_DIRECT = intDirect
process.env.PAYLOAD_DATABASE_PUSH = process.env.PAYLOAD_DATABASE_PUSH || '0'

await ensureDatabase(intDirect)

const migrated = spawnSync('pnpm', ['db:migrate'], {
  env: {
    ...process.env,
    DATABASE_URL: intUrl,
    DATABASE_URL_DIRECT: intDirect,
    CI: '1',
    PAYLOAD_DATABASE_PUSH: '0',
  },
  encoding: 'utf8',
  shell: process.platform === 'win32',
})

if (migrated.status !== 0) {
  const output = `${migrated.stdout ?? ''}\n${migrated.stderr ?? ''}`
  throw new Error(`Failed to migrate disposable integration database:\n${output}`)
}

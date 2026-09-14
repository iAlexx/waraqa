/**
 * Phase 13 — disposable local backup/restore smoke.
 *
 * Requires:
 * - ALLOW_QA_FIXTURE=1
 * - Docker Compose Postgres (waraqa on host 5433)
 *
 * Creates a dump under os.tmpdir(), restores into waraqa_phase13_restore_smoke,
 * verifies connect + payload-migrations if present, then drops the smoke DB.
 * Never commits dumps. Refuses production.
 *
 * Usage: pnpm phase13:backup-restore-smoke
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, '.env') })

const SMOKE_DB = 'waraqa_phase13_restore_smoke'
const CONTAINER_SERVICE = 'postgres'
const PG_USER = 'waraqa'
const SOURCE_DB = 'waraqa'

function refuseProduction(): void {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.error('Refusing: production runtime (NODE_ENV/VERCEL_ENV).')
    process.exit(1)
  }
  const urls = [process.env.DATABASE_URL, process.env.DATABASE_URL_DIRECT]
    .filter(Boolean)
    .join('\n')
  if (/supabase\.co|neon\.tech|amazonaws\.com|azure\.com|gcp\.|prod/i.test(urls) && !/127\.0\.0\.1|localhost/i.test(urls)) {
    console.error('Refusing: DATABASE_URL does not look like local Docker (127.0.0.1/localhost).')
    process.exit(1)
  }
}

function docker(args: string[]): string {
  return execFileSync('docker', ['compose', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function assertDockerPostgres(): void {
  try {
    const out = docker(['ps', '--status', 'running', '--services'])
    if (!out.split(/\r?\n/).map((s) => s.trim()).includes(CONTAINER_SERVICE)) {
      throw new Error('postgres service not running')
    }
  } catch (err) {
    console.error(
      'Refusing: Docker Compose postgres must be running (`pnpm db:up`).',
      err instanceof Error ? err.message : err,
    )
    process.exit(1)
  }
}

async function main(): Promise<void> {
  refuseProduction()

  if (process.env.ALLOW_QA_FIXTURE !== '1') {
    console.error('Refusing: set ALLOW_QA_FIXTURE=1 for this disposable smoke.')
    process.exit(1)
  }

  assertDockerPostgres()

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'waraqa-phase13-br-'))
  const hostDump = path.join(tmpDir, 'waraqa.dump')
  const containerDump = '/tmp/waraqa_phase13_smoke.dump'

  console.log('phase13-backup-restore-smoke: dumping', SOURCE_DB, '→', hostDump)

  docker([
    'exec',
    '-T',
    CONTAINER_SERVICE,
    'pg_dump',
    '-U',
    PG_USER,
    '-d',
    SOURCE_DB,
    '-Fc',
    '-f',
    containerDump,
  ])
  docker([
    'cp',
    `${CONTAINER_SERVICE}:${containerDump}`,
    hostDump,
  ])

  if (!fs.existsSync(hostDump) || fs.statSync(hostDump).size < 16) {
    console.error('Dump missing or empty at', hostDump)
    process.exit(1)
  }

  console.log('phase13-backup-restore-smoke: creating', SMOKE_DB)
  docker([
    'exec',
    '-T',
    CONTAINER_SERVICE,
    'psql',
    '-U',
    PG_USER,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DROP DATABASE IF EXISTS ${SMOKE_DB};`,
  ])
  docker([
    'exec',
    '-T',
    CONTAINER_SERVICE,
    'psql',
    '-U',
    PG_USER,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE ${SMOKE_DB} OWNER ${PG_USER};`,
  ])

  docker(['cp', hostDump, `${CONTAINER_SERVICE}:${containerDump}`])
  docker([
    'exec',
    '-T',
    CONTAINER_SERVICE,
    'pg_restore',
    '-U',
    PG_USER,
    '-d',
    SMOKE_DB,
    '--no-owner',
    '--no-acl',
    containerDump,
  ])

  const client = new pg.Client({
    host: '127.0.0.1',
    port: 5433,
    user: PG_USER,
    password: 'waraqa_dev_only',
    database: SMOKE_DB,
  })

  try {
    await client.connect()
    const ping = await client.query('SELECT 1 AS ok')
    if (ping.rows[0]?.ok !== 1) throw new Error('connect verify failed')

    const tables = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'payload_migrations'
       ) AS exists`,
    )
    if (tables.rows[0]?.exists) {
      const mig = await client.query<{ n: string }>(
        'SELECT COUNT(*)::text AS n FROM payload_migrations',
      )
      console.log('payload_migrations rows:', mig.rows[0]?.n ?? '0')
    } else {
      console.log('payload_migrations table not present (empty/unmigrated dump — connect OK)')
    }
  } finally {
    await client.end().catch(() => undefined)
  }

  console.log('phase13-backup-restore-smoke: dropping', SMOKE_DB)
  docker([
    'exec',
    '-T',
    CONTAINER_SERVICE,
    'psql',
    '-U',
    PG_USER,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DROP DATABASE IF EXISTS ${SMOKE_DB};`,
  ])

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    // best-effort cleanup of temp dump
  }

  console.log('phase13-backup-restore-smoke: OK')
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  try {
    docker([
      'exec',
      '-T',
      CONTAINER_SERVICE,
      'psql',
      '-U',
      PG_USER,
      '-d',
      'postgres',
      '-c',
      `DROP DATABASE IF EXISTS ${SMOKE_DB};`,
    ])
  } catch {
    // ignore cleanup failure
  }
  process.exit(1)
})

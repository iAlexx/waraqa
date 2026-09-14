/**
 * Phase 13 — CI/local prepare (disposable users + Phase 12 DEMO seed).
 *
 * Gates:
 * - ALLOW_QA_FIXTURE=1
 * - Rejects NODE_ENV=production and VERCEL_ENV=production
 * - Password via WARAQA_PHASE13_CI_PASSWORD (min 12; never logged)
 *
 * Writes gitignored credentials to docs/qa/phase-13/.local-credentials
 * (emails + roles + password for e2e login only).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config()

const CREDS_DIR = path.join(ROOT, 'docs/qa/phase-13')
const CREDS_PATH = path.join(CREDS_DIR, '.local-credentials')

const ADMIN_EMAIL = 'phase13-ci-admin@waraqa.local'
const REVIEWER_EMAIL = 'phase13-ci-reviewer@waraqa.local'

const seedCtx = { seed: true as const }

if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  console.error('Refusing: Phase 13 CI prepare must not run in production.')
  process.exit(1)
}

if (process.env.ALLOW_QA_FIXTURE !== '1') {
  console.error('Refusing: set ALLOW_QA_FIXTURE=1 for disposable QA prepare only.')
  process.exit(1)
}

const password = process.env.WARAQA_PHASE13_CI_PASSWORD
if (!password || password.length < 12) {
  console.error('Refusing: set WARAQA_PHASE13_CI_PASSWORD (min 12 chars). Never commit it.')
  process.exit(1)
}

const reviewerPassword =
  process.env.WARAQA_PHASE12_SEED_REVIEWER_PASSWORD || process.env.WARAQA_PHASE13_CI_PASSWORD!

if (!reviewerPassword || reviewerPassword.length < 12) {
  console.error(
    'Refusing: reviewer password missing (WARAQA_PHASE12_SEED_REVIEWER_PASSWORD or WARAQA_PHASE13_CI_PASSWORD, min 12).',
  )
  process.exit(1)
}

const { getPayload } = await import('payload')
const config = (await import('../src/payload.config.ts')).default
const { assertPhase12SeedEnvAllowed, seedPhase12Content } = await import(
  '../src/lib/content/phase12/seed.ts'
)

type Role = 'admin' | 'reviewer'

async function ensureUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  opts: { email: string; role: Role; name: string; password: string },
): Promise<{ email: string; role: Role; id: number }> {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: opts.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: {
        role: opts.role,
        isActive: true,
        name: opts.name,
        password: opts.password,
      },
      overrideAccess: true,
      context: seedCtx,
    })
    return { email: opts.email, role: opts.role, id: Number(updated.id) }
  }

  const created = await payload.create({
    collection: 'users',
    data: {
      email: opts.email,
      password: opts.password,
      role: opts.role,
      isActive: true,
      name: opts.name,
    },
    overrideAccess: true,
    context: seedCtx,
  })
  return { email: opts.email, role: opts.role, id: Number(created.id) }
}

async function main() {
  try {
    assertPhase12SeedEnvAllowed()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const admin = await ensureUser(payload, {
    email: ADMIN_EMAIL,
    role: 'admin',
    name: 'Phase 13 CI Admin',
    password,
  })
  const reviewer = await ensureUser(payload, {
    email: REVIEWER_EMAIL,
    role: 'reviewer',
    name: 'Phase 13 CI Reviewer',
    password,
  })

  fs.mkdirSync(CREDS_DIR, { recursive: true })
  const credentials = {
    createdAt: new Date().toISOString(),
    policy: 'Phase 13 disposable CI/local QA — never commit; never use in production',
    password,
    users: {
      admin: { email: admin.email, role: admin.role },
      reviewer: { email: reviewer.email, role: reviewer.role },
    },
  }
  fs.writeFileSync(CREDS_PATH, JSON.stringify(credentials, null, 2), 'utf8')

  const seedResult = await seedPhase12Content(payload, { reviewerPassword })

  // Non-secret summary only — never log password or credential path contents.
  console.log('Phase 13 CI prepare OK')
  console.log(
    JSON.stringify(
      {
        procedureSlugsCount: seedResult.procedureSlugs.length,
        procedureSlugs: seedResult.procedureSlugs,
        users: {
          admin: admin.email,
          reviewer: reviewer.email,
        },
        credentialsWritten: true,
        note: 'Public DEMO visibility requires WARAQA_PUBLIC_CONTENT_MODE=demo',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

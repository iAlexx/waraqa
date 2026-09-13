/**
 * Phase 12 — DEMO seed content importer (idempotent).
 *
 * Gates:
 * - WARAQA_ALLOW_PHASE12_SEED=1
 * - Rejects NODE_ENV=production and VERCEL_ENV=production
 * - Reviewer password via WARAQA_PHASE12_SEED_REVIEWER_PASSWORD (not committed)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const { assertPhase12SeedEnvAllowed, seedPhase12Content } = await import(
  '../src/lib/content/phase12/seed.ts'
)

try {
  assertPhase12SeedEnvAllowed()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

const password = process.env.WARAQA_PHASE12_SEED_REVIEWER_PASSWORD
if (!password || password.length < 12) {
  console.error('Refusing: set WARAQA_PHASE12_SEED_REVIEWER_PASSWORD (min 12 chars). Never commit it.')
  process.exit(1)
}

const { getPayload } = await import('payload')
const config = (await import('../src/payload.config.ts')).default

async function main() {
  const payload = await getPayload({ config })
  const result = await seedPhase12Content(payload, { reviewerPassword: password })
  console.log('Phase 12 seed OK')
  console.log(
    JSON.stringify(
      {
        procedureSlugs: result.procedureSlugs,
        sourceCount: result.sourceCount,
        claimCount: result.claimCount,
        created: result.created,
        updated: result.updated,
        contentClass: 'DEMO',
        note: 'Public visibility requires WARAQA_PUBLIC_CONTENT_MODE=demo',
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

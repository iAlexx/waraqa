/**
 * Disposable P0-06 browser/E2E fixtures (fictional only).
 * Requires ALLOW_QA_FIXTURE=1. Cleans only e2e-p06-* rows.
 *
 * Creates published PRODUCTION / DEMO / QA_TEST transactions with
 * matching claim+source classes and claimTrustOk for public-gate smoke.
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, '.env') })

if (process.env.ALLOW_QA_FIXTURE !== '1') {
  console.error('Refusing: set ALLOW_QA_FIXTURE=1')
  process.exit(1)
}

const PREFIX = 'e2e-p06-'
const seed = { seed: true as const }

export const P06_E2E_SLUGS = {
  production: `${PREFIX}tx-production`,
  demo: `${PREFIX}tx-demo`,
  qa: `${PREFIX}tx-qa`,
  category: `${PREFIX}cat`,
} as const

const { getPayload } = await import('payload')
const config = (await import('../src/payload.config.ts')).default
const { createAuthoritativeClaimFixture } = await import(
  '../tests/helpers/claim-trust-fixture.ts'
)

async function cleanup(payload: Awaited<ReturnType<typeof getPayload>>) {
  const slugCollections = [
    'transactions',
    'sources',
    'documents',
    'agencies',
    'categories',
  ] as const

  for (const collection of slugCollections) {
    const found = await payload.find({
      collection,
      limit: 100,
      depth: 0,
      overrideAccess: true,
      where: { slug: { contains: PREFIX } },
    })
    for (const doc of found.docs) {
      await payload.delete({ collection, id: doc.id, overrideAccess: true }).catch(() => undefined)
    }
  }

  const claims = await payload.find({
    collection: 'claims',
    limit: 50,
    overrideAccess: true,
    where: { key: { contains: 'claim_e2e_p06_' } },
  })
  for (const doc of claims.docs) {
    await payload.delete({ collection: 'claims', id: doc.id, overrideAccess: true }).catch(() => undefined)
  }

  const users = await payload.find({
    collection: 'users',
    limit: 20,
    overrideAccess: true,
    where: { email: { contains: PREFIX } },
  })
  for (const doc of users.docs) {
    await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true }).catch(() => undefined)
  }
}

async function main() {
  const payload = await getPayload({ config })
  await cleanup(payload)

  const stamp = Date.now()
  const reviewer = await payload.create({
    collection: 'users',
    data: {
      email: `${PREFIX}reviewer-${stamp}@example.test`,
      password: 'TestPassphrase-P006-E2E-Reviewer!',
      role: 'reviewer',
      name: 'E2E P06 Reviewer',
    },
    overrideAccess: true,
    context: seed,
  })

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: false,
    data: {
      name: 'تصنيف عزل E2E',
      slug: P06_E2E_SLUGS.category,
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const agency = await payload.create({
    collection: 'agencies',
    locale: 'ar',
    draft: false,
    data: {
      name: 'جهة عزل E2E',
      slug: `${PREFIX}agency`,
      type: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const document = await payload.create({
    collection: 'documents',
    locale: 'ar',
    draft: false,
    data: {
      name: 'وثيقة عزل E2E',
      slug: `${PREFIX}doc`,
      documentType: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  async function publishBundle(
    cls: 'PRODUCTION' | 'DEMO' | 'QA_TEST',
    slug: string,
    title: string,
  ) {
    const src = await payload.create({
      collection: 'sources',
      locale: 'ar',
      draft: false,
      data: {
        title: `مصدر ${cls} E2E`,
        slug: `${PREFIX}src-${cls.toLowerCase()}`,
        sourceType: 'official_webpage',
        officialUrl: `https://example.test/e2e-p06-${cls.toLowerCase()}`,
        verificationStatus: 'verified',
        active: true,
        contentClass: cls,
        _status: 'published',
      },
      overrideAccess: true,
      context: seed,
    })

    const claim = await createAuthoritativeClaimFixture(payload, {
      key: `claim_e2e_p06_${cls.toLowerCase()}_${stamp}`,
      sourceId: Number(src.id),
      reviewerId: Number(reviewer.id),
      contentClass: cls,
    })

    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        title,
        slug,
        summary: 'ملخص عزل محتوى للمتصفح — بيانات خيالية فقط.',
        category: category.id,
        agency: agency.id,
        steps: [{ title: 'خطوة', description: 'وصف' }],
        requiredDocuments: [
          { document: document.id, requirementType: 'required', quantity: 1 },
        ],
        fees: [{ label: 'رسم', amount: 1, currency: 'SYP' }],
        sources: [
          {
            source: src.id,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
        claimBindings: [{ claim: Number(claim.id), required: true, coveredSection: 'summary' }],
        lastReviewedAt: new Date().toISOString(),
        active: true,
        contentClass: cls,
        workflowState: 'published',
        markedOutdated: false,
        claimTrustOk: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seed,
    })
  }

  await publishBundle('PRODUCTION', P06_E2E_SLUGS.production, 'معاملة إنتاج E2E عزل')
  await publishBundle('DEMO', P06_E2E_SLUGS.demo, 'معاملة عرض تجريبي E2E عزل')
  await publishBundle('QA_TEST', P06_E2E_SLUGS.qa, 'معاملة اختبار QA E2E عزل')

  console.log(
    JSON.stringify(
      {
        ok: true,
        slugs: P06_E2E_SLUGS,
        note: 'Disposable e2e-p06-* fixtures seeded',
      },
      null,
      2,
    ),
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

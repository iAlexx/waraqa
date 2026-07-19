/**
 * Phase 6 — fictional search fixture (idempotent).
 * Requires ALLOW_QA_FIXTURE=1.
 * Cleans only `qa-p6-r1-*` rows, then reseeds stable slugs.
 * Does NOT write into Round 01/02 revision folders.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local') })

if (process.env.ALLOW_QA_FIXTURE !== '1') {
  console.error('Refusing: set ALLOW_QA_FIXTURE=1')
  process.exit(1)
}

const { getPayload } = await import('payload')
const config = (await import('../src/payload.config.ts')).default
const { cleanupPhase6QaFixture, countPhase6QaPublishedEligible } = await import(
  '../src/lib/search/qa-fixture-cleanup.ts'
)
const { PHASE6_QA_STABLE } = await import('../src/lib/search/qa-fixture-markers.ts')

/** Fixture state outside revision archives — never Round 01/02. */
const STATE_DIR = path.join(ROOT, 'docs/qa/phase-6/fixture-state')
const MANIFEST = path.join(STATE_DIR, 'fixture-manifest.json')
const seed = { seed: true as const }

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true })

  const payload = await getPayload({ config })

  const cleaned = await cleanupPhase6QaFixture(payload)
  console.log('Cleaned Phase 6 QA fixture rows:', cleaned.deleted)

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: false,
    data: {
      name: 'أحوال مدنية تجريبي',
      slug: PHASE6_QA_STABLE.categorySlug,
      description: 'بيانات تجريبية للبحث فقط.',
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
      name: 'السجل المدني تجريبي',
      slug: PHASE6_QA_STABLE.agencySlug,
      type: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const center = await payload.create({
    collection: 'service-centers',
    locale: 'ar',
    draft: false,
    data: {
      name: 'مركز دمشق تجريبي',
      slug: PHASE6_QA_STABLE.centerSlug,
      agency: agency.id,
      governorate: 'damascus',
      city: 'دمشق',
      address: 'عنوان تجريبي — مو عنوان رسمي',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const source = await payload.create({
    collection: 'sources',
    locale: 'ar',
    draft: false,
    data: {
      title: 'مصدر بحث تجريبي مرحلة ٦',
      slug: PHASE6_QA_STABLE.sourceSlug,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/qa-p6-r1',
      verificationStatus: 'verified',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const reviewedAt = new Date().toISOString()
  const base = {
    category: category.id,
    agency: agency.id,
    serviceCenters: [center.id],
    steps: [{ title: 'خطوة تجريبية', description: 'وصف تجريبي' }],
    sources: [
      {
        source: source.id,
        primary: true,
        coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
      },
    ],
    lastReviewedAt: reviewedAt,
    active: true,
    workflowState: 'published' as const,
    markedOutdated: false,
    _status: 'published' as const,
  }

  const rows = [
    {
      title: 'إخراج قيد نفوس تجريبي',
      slug: PHASE6_QA_STABLE.transactions.civilExtract,
      summary: 'ملخص تجريبي لإخراج قيد — مو معلومات رسمية.',
      aliases: [{ value: 'اخراج قيد' }, { value: 'ورقة عائلية بديل' }],
    },
    {
      title: 'سجل عدلي تجريبي',
      slug: PHASE6_QA_STABLE.transactions.criminalRecord,
      summary: 'ملخص تجريبي لسجل عدلي.',
      aliases: [{ value: 'لا حكم عليه' }, { value: 'غير محكوم' }],
    },
    {
      title: 'تجديد جواز سفر تجريبي',
      slug: PHASE6_QA_STABLE.transactions.passportRenew,
      summary: 'ملخص تجريبي لتجديد باسبور.',
      aliases: [{ value: 'تجديد باسبور' }],
    },
  ] as const

  const publishedIds: Array<number | string> = []
  for (const row of rows) {
    const doc = await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...base,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        aliases: row.aliases,
      } as never,
      overrideAccess: true,
      context: seed,
    })
    publishedIds.push(doc.id)
  }

  for (let i = 0; i < 11; i++) {
    const doc = await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...base,
        title: `معاملة ترقيم بحث تجريبية ${String(i).padStart(2, '0')}`,
        slug: PHASE6_QA_STABLE.pageSlug(i),
        summary: `ملخص ترقيم تجريبي ${i}`,
      } as never,
      overrideAccess: true,
      context: seed,
    })
    publishedIds.push(doc.id)
  }

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      title: 'مسودة مخفية بحث تجريبي',
      slug: PHASE6_QA_STABLE.transactions.draft,
      summary: 'يجب ألا تظهر في البحث العام.',
      workflowState: 'draft',
      _status: 'draft',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      title: 'مؤرشفة مخفية بحث تجريبي',
      slug: PHASE6_QA_STABLE.transactions.archived,
      summary: 'يجب ألا تظهر.',
      workflowState: 'archived',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      title: 'قديمة مخفية بحث تجريبي',
      slug: PHASE6_QA_STABLE.transactions.outdated,
      summary: 'يجب ألا تظهر.',
      markedOutdated: true,
    } as never,
    overrideAccess: true,
    context: seed,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'ar',
    data: {
      searchExamples: [
        { text: 'لا حكم عليه' },
        { text: 'إخراج قيد' },
        { text: 'تجديد باسبور' },
      ],
    } as never,
    overrideAccess: true,
    context: seed,
  })

  const eligibleCount = await countPhase6QaPublishedEligible(payload)
  if (eligibleCount !== PHASE6_QA_STABLE.publishedEligibleCount) {
    throw new Error(
      `Expected ${PHASE6_QA_STABLE.publishedEligibleCount} published eligible QA txs, got ${eligibleCount}`,
    )
  }
  if (publishedIds.length !== PHASE6_QA_STABLE.publishedEligibleCount) {
    throw new Error(`Published id list length mismatch: ${publishedIds.length}`)
  }

  const uniqueTitles = new Set(
    (
      await payload.find({
        collection: 'transactions',
        locale: 'ar',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        where: { slug: { contains: 'qa-p6-r1-' } },
      })
    ).docs
      .filter((d) => (d as { _status?: string })._status === 'published')
      .filter((d) => (d as { active?: boolean }).active === true)
      .filter((d) => (d as { markedOutdated?: boolean }).markedOutdated !== true)
      .filter((d) => (d as { workflowState?: string }).workflowState !== 'archived')
      .map((d) => (d as { title?: string }).title),
  )
  if (uniqueTitles.size !== PHASE6_QA_STABLE.publishedEligibleCount) {
    throw new Error(`Title uniqueness check failed: ${uniqueTitles.size}`)
  }

  const manifest = {
    phase: 6,
    fixture: 'phase6-qa-fixture',
    idempotent: true,
    slugPrefix: 'qa-p6-r1-',
    policy: 'ALLOW_QA_FIXTURE=1; cleans qa-p6-r1-* only; fictional Arabic; تجريبي marked',
    redacted: true,
    credentials: 'none',
    publishedEligibleTransactionCount: eligibleCount,
    categorySlug: PHASE6_QA_STABLE.categorySlug,
    agencySlug: PHASE6_QA_STABLE.agencySlug,
    centerSlug: PHASE6_QA_STABLE.centerSlug,
    sampleQueries: [
      'لا حكم عليه',
      'إخراج قيد',
      'اخراج قيد',
      'تجديد باسبور',
      'معاملة ترقيم بحث تجريبية',
    ],
    note: 'Manifest lives under docs/qa/phase-6/fixture-state/ — revision Round 01/02 folders are not modified.',
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log('Phase 6 fixture OK', MANIFEST)
  console.log(JSON.stringify(manifest, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

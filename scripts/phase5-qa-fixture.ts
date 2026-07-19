/**
 * Phase 5 Round 02 — fictional featured transactions fixture.
 * Requires ALLOW_QA_FIXTURE=1. Configures site-settings.featuredTransactions.
 * Demo titles include «تجريبي» so UI demo labels apply.
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

const ROUND = path.join(ROOT, 'docs/qa/phase-5/revisions/round-02-owner-review-closure')
const MANIFEST = path.join(ROUND, 'fixture-manifest.json')
const seed = { seed: true as const }

async function main() {
  if (ROUND.includes('round-01')) {
    throw new Error('Refusing to write into Round 01')
  }
  fs.mkdirSync(ROUND, { recursive: true })

  const payload = await getPayload({ config })
  const stamp = Date.now()

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: false,
    data: {
      name: 'تصنيف تجريبي ورقة ر٢',
      slug: `qa-p5-r2-cat-${stamp}`,
      description: 'بيانات تجريبية للاختبار فقط — مو بيانات رسمية.',
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
      name: 'جهة تجريبية ورقة ر٢',
      slug: `qa-p5-r2-agency-${stamp}`,
      type: 'other',
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
      title: 'مصدر تجريبي ورقة ر٢',
      slug: `qa-p5-r2-src-${stamp}`,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/qa-p5-r2-source',
      verificationStatus: 'verified',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const titles = [
    { title: 'معاملة تجريبية أولى — جواز سفر', slug: 'passport', summary: 'ملخص تجريبي قصير لغرض الاختبار فقط.' },
    { title: 'معاملة تجريبية ثانية — لا حكم عليه', slug: 'no-judgment', summary: 'ملخص تجريبي يوضح الغرض دون أي ادّعاء رسمي.' },
    { title: 'معاملة تجريبية ثالثة — إخراج قيد', slug: 'civil-record', summary: 'بيانات تجريبية مرتّبة لاختبار العرض المختارة.' },
    { title: 'معاملة تجريبية رابعة — تجديد هوية', slug: 'id-renew', summary: 'بطاقة رابعة تجريبية لإكمال ٤–٦ عناصر.' },
  ] as const

  const featuredIds: Array<number | string> = []
  const reviewedAt = new Date().toISOString()

  for (const row of titles) {
    const doc = await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        title: row.title,
        slug: `qa-p5-r2-tx-${row.slug}-${stamp}`,
        summary: row.summary,
        category: category.id,
        agency: agency.id,
        active: true,
        workflowState: 'published',
        markedOutdated: false,
        lastReviewedAt: reviewedAt,
        steps: [{ title: 'خطوة تجريبية', description: 'وصف تجريبي' }],
        sources: [
          {
            source: source.id,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seed,
    })
    featuredIds.push(doc.id)
  }

  // Ineligible decoys configured after valid ones — public UI must skip them
  const draft = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: true,
    data: {
      title: 'مسودة تجريبية مستبعدة ر٢',
      slug: `qa-p5-r2-tx-draft-${stamp}`,
      summary: 'مسودة',
      category: category.id,
      agency: agency.id,
      active: true,
      workflowState: 'draft',
      steps: [{ title: 'خ', description: 'و' }],
      sources: [{ source: source.id, primary: true, coveredSections: ['summary'] }],
    } as never,
    overrideAccess: true,
    context: seed,
  })

  const archived = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      title: 'مؤرشفة تجريبية مستبعدة ر٢',
      slug: `qa-p5-r2-tx-arch-${stamp}`,
      summary: 'مؤرشفة',
      category: category.id,
      agency: agency.id,
      active: true,
      workflowState: 'archived',
      markedOutdated: false,
      lastReviewedAt: reviewedAt,
      steps: [{ title: 'خ', description: 'و' }],
      sources: [
        {
          source: source.id,
          primary: true,
          coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
        },
      ],
      _status: 'published',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  const existing = await payload.findGlobal({
    slug: 'site-settings',
    locale: 'ar',
    depth: 0,
    overrideAccess: true,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'ar',
    data: {
      siteName: existing.siteName || 'ورقة',
      independenceDisclaimer:
        existing.independenceDisclaimer ||
        'ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. المعلومات منشورة للمساعدة، وقد تتغير التعليمات أو تختلف بين جهة وأخرى. تأكد دائماً من الجهة الرسمية قبل التقديم.',
      tagline: existing.tagline,
      footerDisclaimer: existing.footerDisclaimer,
      contactEmail: existing.contactEmail,
      supportPhone: existing.supportPhone,
      featuredTransactions: [...featuredIds, draft.id, archived.id],
      searchExamples: [
        { text: 'جواز سفر تجريبي' },
        { text: 'لا حكم عليه تجريبي' },
        { text: 'إخراج قيد تجريبي' },
      ],
      homePageSections: {
        showCategories: true,
        showFeatured: true,
        showHowItWorks: true,
        showTrust: true,
      },
      maintenanceMode: false,
    } as never,
    overrideAccess: true,
  })

  const manifest = {
    phase: 5,
    round: 'round-02-owner-review-closure',
    stamp,
    note: 'Fictional demo/test data only — not official government requirements.',
    categoryId: category.id,
    agencyId: agency.id,
    sourceId: source.id,
    featuredEligibleIds: featuredIds,
    decoyIds: { draft: draft.id, archived: archived.id },
    configuredFeaturedOrder: [...featuredIds, draft.id, archived.id],
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log('Phase 5 Round 02 fixture ready →', MANIFEST)
  console.log('Eligible featured ids (order):', featuredIds.join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

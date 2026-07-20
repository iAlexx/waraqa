/**
 * Phase 7 — fictional transaction-detail fixture (idempotent).
 * Requires ALLOW_QA_FIXTURE=1. Cleans only qa-p7-r1-* rows.
 * Writes state to docs/qa/phase-7/fixture-state/ (not revision archives).
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
const { cleanupPhase7QaFixture, countPhase7QaPublishedEligible } = await import(
  '../src/lib/public/qa-phase7-cleanup.ts'
)
const { PHASE7_QA_STABLE } = await import('../src/lib/public/qa-phase7-markers.ts')

const STATE_DIR = path.join(ROOT, 'docs/qa/phase-7/fixture-state')
const MANIFEST = path.join(STATE_DIR, 'fixture-manifest.json')
const seed = { seed: true as const }

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const payload = await getPayload({ config })
  const cleaned = await cleanupPhase7QaFixture(payload)
  console.log('Cleaned Phase 7 QA rows:', cleaned.deleted)

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: false,
    data: {
      name: 'أحوال مدنية تجريبي ٧',
      slug: PHASE7_QA_STABLE.categorySlug,
      description: 'بيانات تجريبية لصفحة التفاصيل.',
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
      name: 'السجل المدني تجريبي ٧',
      slug: PHASE7_QA_STABLE.agencySlug,
      shortName: 'سجل تجريبي',
      type: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const centerA = await payload.create({
    collection: 'service-centers',
    locale: 'ar',
    draft: false,
    data: {
      name: 'مركز دمشق تجريبي ٧',
      slug: PHASE7_QA_STABLE.centerSlugA,
      agency: agency.id,
      governorate: 'damascus',
      city: 'دمشق',
      address: 'عنوان تجريبي — دمشق',
      phones: [{ number: '011-0000000' }],
      workingHours: 'أحد–خميس ٩–١٤',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const centerB = await payload.create({
    collection: 'service-centers',
    locale: 'ar',
    draft: false,
    data: {
      name: 'مركز حلب تجريبي ٧',
      slug: PHASE7_QA_STABLE.centerSlugB,
      agency: agency.id,
      governorate: 'aleppo',
      city: 'حلب',
      address: 'عنوان تجريبي — حلب',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const docA = await payload.create({
    collection: 'documents',
    locale: 'ar',
    draft: false,
    data: {
      name: 'هوية شخصية تجريبية',
      slug: PHASE7_QA_STABLE.docSlugA,
      documentType: 'other',
      description: 'وثيقة تجريبية للعرض فقط.',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const docB = await payload.create({
    collection: 'documents',
    locale: 'ar',
    draft: false,
    data: {
      name: 'استمارة طلب تجريبية',
      slug: PHASE7_QA_STABLE.docSlugB,
      documentType: 'other',
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
      title: 'مصدر رسمي تجريبي ٧',
      slug: PHASE7_QA_STABLE.sourceSlug,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/qa-p7-r1-official',
      archiveUrl: 'https://example.test/qa-p7-r1-archive',
      referenceNumber: 'QA-P7-001',
      verificationStatus: 'verified',
      lastVerifiedAt: new Date().toISOString(),
      active: true,
      _status: 'published',
      notes: 'ملاحظة داخلية — لا تُعرض للعامة',
    },
    overrideAccess: true,
    context: seed,
  })

  const sourceB = await payload.create({
    collection: 'sources',
    locale: 'ar',
    draft: false,
    data: {
      title: 'مصدر ثانوي تجريبي ٧',
      slug: PHASE7_QA_STABLE.sourceSlugB,
      sourceType: 'official_webpage',
      officialUrl:
        'https://example.test/qa-p7-r1/secondary/official-guidance/transactions/civil-extract/long-path-for-url-wrap-verification-abcdefghijklmnopqrstuvwxyz-0123456789',
      verificationStatus: 'verified',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const reviewedAt = new Date().toISOString()
  const covered = ['summary', 'eligibility', 'required_documents', 'steps', 'fees', 'duration', 'service_centers', 'outcome', 'other'] as const

  const base = {
    category: category.id,
    agency: agency.id,
    lastReviewedAt: reviewedAt,
  }

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      title: 'إخراج قيد نفوس — معاملة تجريبية كاملة',
      slug: PHASE7_QA_STABLE.txComplete,
      summary: 'ملخص تجريبي كامل لصفحة التفاصيل — مو معلومات رسمية.',
      audiences: ['citizen', 'resident'],
      eligibility: 'للمواطنين والمقيمين وفق الشروط التجريبية المعروضة هنا فقط.',
      serviceCenters: [centerA.id, centerB.id],
      requiredDocuments: [
        {
          document: docA.id,
          requirementType: 'required',
          quantity: 1,
          originalRequired: true,
          copiesRequired: 1,
        },
        {
          document: docB.id,
          requirementType: 'conditional',
          condition: 'إذا طُلبت استمارة ورقية من المركز.',
          quantity: 1,
        },
      ],
      steps: [
        { title: 'حضّر الوثائق', description: 'جهّز الهوية والاستمارة حسب القائمة.', locationNote: 'المنزل' },
        { title: 'راجع المركز', description: 'قدّم الطلب في مركز الخدمة المناسب.', locationNote: 'مركز الخدمة' },
        { title: 'استلم الوثيقة', description: 'راجع في الموعد المحدد للاستلام.' },
      ],
      fees: [
        { label: 'رسم إصدار', amount: 2500, currency: 'SYP' },
        { label: 'رسم إضافي', amountText: 'حسب الحالة', notes: 'قد يختلف حسب المحافظة.' },
      ],
      estimatedDuration: {
        minimum: 2,
        maximum: 7,
        unit: 'business_days',
        note: 'تقريبي — راجع الجهة.',
      },
      outcome: 'قيد نفوس رسمي وفق إجراءات الجهة المختصة (نص تجريبي).',
      sources: [
        {
          source: source.id,
          primary: true,
          coveredSections: [...covered],
          citationNote: 'مرجع تجريبي أساسي',
        },
        { source: sourceB.id, primary: false, coveredSections: ['summary', 'other'] },
      ],
      active: true,
      workflowState: 'published',
      markedOutdated: false,
      _status: 'published',
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
      title: 'معاملة تجريبية بحد أدنى من الأقسام',
      slug: PHASE7_QA_STABLE.txMinimal,
      summary: 'ملخص قصير فقط — بدون رسوم أو وثائق أو مراكز.',
      steps: [{ title: 'خطوة وحيدة', description: 'وصف مختصر للمعاملة التجريبية.' }],
      sources: [
        {
          source: source.id,
          primary: true,
          coveredSections: ['summary', 'steps', 'other'],
        },
      ],
      active: true,
      workflowState: 'published',
      markedOutdated: false,
      _status: 'published',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  const longPara =
    'نص تجريبي طويل يوضح قابلية القراءة للعربية في صفحة التفاصيل. '.repeat(12)

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      title: 'معاملة تجريبية بمحتوى طويل للعرض',
      slug: PHASE7_QA_STABLE.txLong,
      summary: longPara.slice(0, 280),
      eligibility: longPara,
      outcome: longPara,
      serviceCenters: [centerA.id],
      requiredDocuments: [
        {
          document: docA.id,
          requirementType: 'required',
          notes: longPara.slice(0, 200),
        },
      ],
      steps: Array.from({ length: 6 }, (_, i) => ({
        title: `خطوة طويلة ${i + 1}`,
        description: longPara.slice(0, 320),
        locationNote: i % 2 === 0 ? 'المركز' : undefined,
      })),
      fees: [
        { label: 'رسم أساسي طويل الشرح', amount: 10000, currency: 'SYP', notes: longPara.slice(0, 160) },
      ],
      estimatedDuration: { minimum: 10, maximum: 30, unit: 'calendar_days', note: longPara.slice(0, 80) },
      sources: [
        {
          source: source.id,
          primary: true,
          coveredSections: [...covered],
          citationNote: longPara.slice(0, 120),
        },
      ],
      active: true,
      workflowState: 'published',
      markedOutdated: false,
      _status: 'published',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  for (const row of [
    {
      title: 'مسودة تفاصيل مخفية تجريبي',
      slug: PHASE7_QA_STABLE.txDraft,
      workflowState: 'draft' as const,
      _status: 'draft' as const,
      active: true,
      markedOutdated: false,
    },
    {
      title: 'معطّلة تفاصيل مخفية تجريبي',
      slug: PHASE7_QA_STABLE.txInactive,
      workflowState: 'published' as const,
      _status: 'published' as const,
      active: false,
      markedOutdated: false,
    },
    {
      title: 'مؤرشفة تفاصيل مخفية تجريبي',
      slug: PHASE7_QA_STABLE.txArchived,
      workflowState: 'archived' as const,
      _status: 'published' as const,
      active: true,
      markedOutdated: false,
    },
    {
      title: 'قديمة تفاصيل مخفية تجريبي',
      slug: PHASE7_QA_STABLE.txOutdated,
      workflowState: 'published' as const,
      _status: 'published' as const,
      active: true,
      markedOutdated: true,
    },
  ]) {
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...base,
        title: row.title,
        slug: row.slug,
        summary: 'يجب ألا تظهر للعامة.',
        steps: [{ title: 'خطوة', description: 'وصف' }],
        sources: [
          {
            source: source.id,
            primary: true,
            coveredSections: ['summary', 'steps', 'other'],
          },
        ],
        active: row.active,
        workflowState: row.workflowState,
        markedOutdated: row.markedOutdated,
        _status: row._status,
      } as never,
      overrideAccess: true,
      context: seed,
    })
  }

  const eligible = await countPhase7QaPublishedEligible(payload)
  if (eligible !== PHASE7_QA_STABLE.publishedEligibleCount) {
    throw new Error(`Expected ${PHASE7_QA_STABLE.publishedEligibleCount} eligible, got ${eligible}`)
  }

  const manifest = {
    phase: 7,
    fixture: 'phase7-qa-fixture',
    idempotent: true,
    slugPrefix: PHASE7_QA_STABLE.txComplete.slice(0, 8),
    redacted: true,
    credentials: 'none',
    publishedEligibleTransactionCount: eligible,
    detailSlugs: {
      complete: PHASE7_QA_STABLE.txComplete,
      minimal: PHASE7_QA_STABLE.txMinimal,
      long: PHASE7_QA_STABLE.txLong,
    },
    hiddenSlugs: {
      draft: PHASE7_QA_STABLE.txDraft,
      inactive: PHASE7_QA_STABLE.txInactive,
      archived: PHASE7_QA_STABLE.txArchived,
      outdated: PHASE7_QA_STABLE.txOutdated,
    },
    samplePaths: [
      `/transactions/${PHASE7_QA_STABLE.txComplete}`,
      `/transactions/${PHASE7_QA_STABLE.txMinimal}`,
      `/transactions/${PHASE7_QA_STABLE.txLong}`,
    ],
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log('Phase 7 fixture OK', MANIFEST)
  console.log(JSON.stringify(manifest, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

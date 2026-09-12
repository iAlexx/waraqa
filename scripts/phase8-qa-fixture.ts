/**
 * Phase 8 — fictional interactive-guide fixture (idempotent).
 * Requires ALLOW_QA_FIXTURE=1. Cleans only qa-p8-r1-* rows.
 * Writes state to docs/qa/phase-8/fixture-state/ (not revision archives).
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
const { cleanupPhase8QaFixture, countPhase8QaPublishedEligible } = await import(
  '../src/lib/public/qa-phase8-cleanup.ts'
)
const { PHASE8_QA_STABLE, PHASE8_QA_SLUG_PREFIX } = await import('../src/lib/public/qa-phase8-markers.ts')
const { createAuthoritativeClaimFixture } = await import('../tests/helpers/claim-trust-fixture.ts')

const STATE_DIR = path.join(ROOT, 'docs/qa/phase-8/fixture-state')
const MANIFEST = path.join(STATE_DIR, 'fixture-manifest.json')
const seed = { seed: true as const }

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const payload = await getPayload({ config })
  const cleaned = await cleanupPhase8QaFixture(payload)
  console.log('Cleaned Phase 8 QA rows:', cleaned.deleted)

  const reviewer = await payload.create({
    collection: 'users',
    data: {
      email: 'qa-p8-r1-reviewer@example.test',
      password: 'TestPassphrase-P8-QA-Reviewer!',
      role: 'reviewer',
      name: 'Phase 8 QA Reviewer',
    },
    overrideAccess: true,
    context: seed,
  })

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: false,
    data: {
      name: 'أحوال مدنية تجريبي ٨',
      slug: PHASE8_QA_STABLE.categorySlug,
      description: 'بيانات تجريبية للدليل التفاعلي.',
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
      name: 'السجل المدني تجريبي ٨',
      slug: PHASE8_QA_STABLE.agencySlug,
      shortName: 'سجل تجريبي',
      type: 'other',
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
      slug: PHASE8_QA_STABLE.docSlugA,
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
      name: 'موافقة ولي الأمر تجريبية',
      slug: PHASE8_QA_STABLE.docSlugB,
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
      title: 'مصدر رسمي تجريبي ٨',
      slug: PHASE8_QA_STABLE.sourceSlug,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/qa-p8-r1-official',
      verificationStatus: 'verified',
      lastVerifiedAt: new Date().toISOString(),
      active: true,
      contentClass: 'DEMO',
      _status: 'published',
      notes: 'ملاحظة داخلية — لا تُعرض للعامة',
    },
    overrideAccess: true,
    context: seed,
  })

  const serviceCenter = await payload.create({
    collection: 'service-centers',
    locale: 'ar',
    draft: false,
    data: {
      name: 'مركز خدمة تجريبي ٨',
      slug: `${PHASE8_QA_SLUG_PREFIX}center`,
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

  const claim = await createAuthoritativeClaimFixture(payload, {
    key: 'claim_qa_p8_r1_summary',
    sourceId: Number(source.id),
    reviewerId: Number(reviewer.id),
    statement: 'ادعاء تجريبي للدليل التفاعلي — ليس رسمياً.',
    contentClass: 'DEMO',
  })

  const reviewedAt = new Date().toISOString()
  const covered = ['summary', 'required_documents', 'steps', 'fees', 'other'] as const
  const claimBindings = [
    { claim: Number(claim.id), required: true, coveredSection: 'summary' as const },
  ]

  const guideConfig = {
    guideEnabled: true,
    questions: [
      {
        key: 'age_group',
        questionType: 'boolean' as const,
        prompt: 'هل أنت بالغ؟',
        helpText: 'سؤال تجريبي للدليل التفاعلي.',
        required: true,
        active: true,
        options: [],
      },
      {
        key: 'issuance',
        questionType: 'single' as const,
        prompt: 'نوع المعاملة؟',
        required: true,
        active: true,
        options: [
          { key: 'first_time', label: 'أول مرة' },
          { key: 'renewal', label: 'تجديد' },
        ],
      },
    ],
    variants: [
      {
        key: 'variant_first',
        title: 'إصدار أول مرة',
        explanation: 'مسار تجريبي لأول مرة.',
        active: true,
      },
      {
        key: 'variant_renewal',
        title: 'تجديد',
        explanation: 'مسار تجريبي للتجديد.',
        active: true,
      },
    ],
    notices: [
      {
        key: 'notice_minor',
        title: 'تنبيه للقاصر',
        body: 'قد تُطلب موافقة ولي الأمر — راجع الجهة الرسمية.',
        severity: 'warning' as const,
        active: true,
      },
    ],
    decisionRules: [
      {
        key: 'rule_minor',
        priority: 10,
        active: true,
        explanation: 'لأن الإجابة تشير إلى قاصر',
        when: {
          all: [{ questionKey: 'age_group', operator: 'equals' as const, value: 'no' }],
        },
        effects: [
          { type: 'includeDocument' as const, targetKey: 'doc_guardian' },
          { type: 'includeNotice' as const, targetKey: 'notice_minor' },
        ],
      },
      {
        key: 'rule_first',
        priority: 20,
        active: true,
        explanation: 'إصدار أول مرة',
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals' as const, value: 'first_time' }],
        },
        effects: [{ type: 'selectVariant' as const, targetKey: 'variant_first' }],
      },
      {
        key: 'rule_renewal',
        priority: 20,
        active: true,
        explanation: 'تجديد',
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals' as const, value: 'renewal' }],
        },
        effects: [
          { type: 'selectVariant' as const, targetKey: 'variant_renewal' },
          { type: 'includeFee' as const, targetKey: 'fee_renewal' },
        ],
      },
    ],
  }

  const base = {
    category: category.id,
    agency: agency.id,
    serviceCenters: [serviceCenter.id],
    lastReviewedAt: reviewedAt,
    contentClass: 'DEMO' as const,
    claimBindings,
    claimTrustOk: true,
    steps: [
      { key: 'step_prepare', title: 'حضّر الوثائق', description: 'جهّز الهوية حسب القائمة.' },
      { key: 'step_submit', title: 'راجع المركز', description: 'قدّم الطلب في المركز المناسب.' },
    ],
    requiredDocuments: [
      {
        key: 'doc_id',
        document: docA.id,
        requirementType: 'required' as const,
        quantity: 1,
      },
      {
        key: 'doc_guardian',
        document: docB.id,
        requirementType: 'conditional' as const,
        condition: 'إذا كان مقدم الطلب قاصراً.',
        quantity: 1,
      },
    ],
    fees: [
      { key: 'fee_base', label: 'رسم إصدار', amount: 2500, currency: 'SYP' as const },
      {
        key: 'fee_renewal',
        label: 'رسم تجديد',
        amount: 1500,
        currency: 'SYP' as const,
        notes: 'يظهر عند اختيار التجديد في الدليل.',
      },
    ],
    sources: [
      {
        source: source.id,
        primary: true,
        coveredSections: [...covered],
        citationNote: 'مرجع تجريبي أساسي',
      },
    ],
  }

  await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: false,
    data: {
      ...base,
      ...guideConfig,
      title: 'إخراج قيد نفوس — دليل تفاعلي تجريبي',
      slug: PHASE8_QA_STABLE.txGuide,
      summary: 'معاملة تجريبية للدليل التفاعلي — مو معلومات رسمية.',
      audiences: ['citizen'],
      eligibility: 'نص أهلية تجريبي للعرض فقط.',
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
      guideEnabled: false,
      title: 'معاملة تجريبية بدون دليل مفعّل',
      slug: PHASE8_QA_STABLE.txNoGuide,
      summary: 'منشورة للعامة لكن زر الدليل لا يظهر.',
      steps: [{ key: 'step_only', title: 'خطوة وحيدة', description: 'وصف مختصر.' }],
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
      ...guideConfig,
      title: 'مسودة دليل مخفية تجريبي',
      slug: PHASE8_QA_STABLE.txDraft,
      summary: 'يجب ألا تظهر للعامة.',
      active: true,
      workflowState: 'draft',
      markedOutdated: false,
      claimTrustOk: false,
      _status: 'draft',
    } as never,
    overrideAccess: true,
    context: seed,
  })

  const eligible = await countPhase8QaPublishedEligible(payload)
  if (eligible !== PHASE8_QA_STABLE.publishedEligibleCount) {
    throw new Error(`Expected ${PHASE8_QA_STABLE.publishedEligibleCount} eligible, got ${eligible}`)
  }

  const manifest = {
    phase: 8,
    fixture: 'phase8-qa-fixture',
    idempotent: true,
    slugPrefix: PHASE8_QA_SLUG_PREFIX,
    redacted: true,
    credentials: 'none',
    publishedEligibleTransactionCount: eligible,
    detailSlugs: {
      guide: PHASE8_QA_STABLE.txGuide,
      noGuide: PHASE8_QA_STABLE.txNoGuide,
    },
    guidePath: `/transactions/${PHASE8_QA_STABLE.txGuide}/guide`,
    hiddenSlugs: {
      draft: PHASE8_QA_STABLE.txDraft,
    },
    samplePaths: [
      `/transactions/${PHASE8_QA_STABLE.txGuide}`,
      `/transactions/${PHASE8_QA_STABLE.txGuide}/guide`,
      `/transactions/${PHASE8_QA_STABLE.txNoGuide}`,
    ],
    note: 'P9-B: answers+checklist may persist in device localStorage (waraqa:guide:<slug>). DEMO contentClass — use WARAQA_PUBLIC_CONTENT_MODE=demo for public E2E. Never sent to server.',
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log('Phase 8 fixture OK', MANIFEST)
  console.log(JSON.stringify(manifest, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

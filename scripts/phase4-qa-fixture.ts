/**
 * Phase 4 Round 04 local QA fixture — fictional data only.
 * Requires ALLOW_QA_FIXTURE=1. Writes gitignored .local-credentials.
 * Manifest → docs/qa/phase-4/revisions/round-04-list-cells-closure/
 * Does NOT write into Round 01/02/03.
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
const { runTransactionWorkflowAction } = await import('../src/lib/workflow/transaction-workflow.ts')

const OUT = path.join(ROOT, 'docs/qa/phase-4')
const ROUND = path.join(OUT, 'revisions/round-04-list-cells-closure')
const CREDS = path.join(OUT, '.local-credentials')
const MANIFEST = path.join(ROUND, 'fixture-manifest.json')
const seed = { seed: true as const }

async function main() {
  if (
    ROUND.includes(`${path.sep}round-01`) ||
    ROUND.includes(`${path.sep}round-02`) ||
    ROUND.includes(`${path.sep}round-03`)
  ) {
    throw new Error('Refusing to write Round 01/02/03')
  }
  fs.mkdirSync(ROUND, { recursive: true })

  const payload = await getPayload({ config })
  const stamp = Date.now()
  const password = `Qa-P4-R2-${stamp}-LocalOnly!`

  const mkUser = async (role: 'admin' | 'reviewer' | 'researcher' | 'viewer', label: string) =>
    payload.create({
      collection: 'users',
      data: {
        email: `qa-p4-r3-${role}-${stamp}@example.test`,
        password,
        role,
        name: label,
        displayName: label,
      },
      overrideAccess: true,
      context: seed,
    })

  const admin = await mkUser('admin', 'مدير تجريبي ر2')
  const reviewer = await mkUser('reviewer', 'مراجع تجريبي ر2')
  const researcher = await mkUser('researcher', 'باحث تجريبي ر2')
  const viewer = await mkUser('viewer', 'مشاهد تجريبي ر2')

  const adminUser = { id: admin.id, role: 'admin' as const, collection: 'users' }
  const reviewerUser = { id: reviewer.id, role: 'reviewer' as const, collection: 'users' }
  const researcherUser = { id: researcher.id, role: 'researcher' as const, collection: 'users' }

  const categoryRoot = await payload.create({
    collection: 'categories',
    locale: 'ar',
    data: {
      name: 'تصنيف بلا أب ر2',
      slug: `cat-p4-r2-root-${stamp}`,
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const categoryChild = await payload.create({
    collection: 'categories',
    locale: 'ar',
    data: {
      name: 'تصنيف فرعي ر2',
      slug: `cat-p4-r2-child-${stamp}`,
      parent: categoryRoot.id,
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const agency = await payload.create({
    collection: 'agencies',
    locale: 'ar',
    data: {
      name: 'جهة سير تجريبية ر2',
      slug: `ag-p4-r2-${stamp}`,
      type: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const sourceOk = await payload.create({
    collection: 'sources',
    locale: 'ar',
    data: {
      title: 'مصدر تجريبي موثّق ر2',
      slug: `src-ok-p4-r2-${stamp}`,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/verified-p4-r2',
      verificationStatus: 'verified',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const sourceBad = await payload.create({
    collection: 'sources',
    locale: 'ar',
    data: {
      title: 'مصدر تجريبي غير موثّق ر2',
      slug: `src-bad-p4-r2-${stamp}`,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/unverified-p4-r2',
      verificationStatus: 'needs_review',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const document = await payload.create({
    collection: 'documents',
    locale: 'ar',
    data: {
      name: 'وثيقة سير تجريبية ر2',
      slug: `doc-p4-r2-${stamp}`,
      documentType: 'other',
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seed,
  })

  const baseTx = (title: string, slug: string, extra: Record<string, unknown> = {}) => ({
    title,
    slug,
    summary: 'بيانات تجريبية Round 02 — ليست معلومات رسمية',
    category: categoryChild.id,
    agency: agency.id,
    steps: [{ title: 'خطوة تجريبية', description: 'وصف تجريبي' }],
    requiredDocuments: [{ document: document.id, requirementType: 'required', quantity: 1 }],
    fees: [{ label: 'رسم تجريبي', amount: 1, currency: 'SYP' }],
    sources: [
      {
        source: sourceOk.id,
        primary: true,
        coveredSections: ['summary', 'steps', 'fees', 'required_documents', 'other'],
      },
    ],
    lastReviewedAt: new Date().toISOString(),
    active: true,
    workflowState: 'draft',
    ...extra,
  })

  async function createDraft(title: string, slug: string, extra: Record<string, unknown> = {}) {
    return payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: true,
      data: baseTx(title, slug, extra),
      overrideAccess: true,
      context: seed,
    })
  }

  async function toPublished(id: number | string) {
    await runTransactionWorkflowAction({
      payload,
      id,
      action: 'submitForReview',
      user: researcherUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id,
      action: 'approve',
      user: reviewerUser as never,
    })
    return runTransactionWorkflowAction({
      payload,
      id,
      action: 'publish',
      user: reviewerUser as never,
    })
  }

  const draft = await createDraft('معاملة مسودة ر2', `tx-p4-r2-draft-${stamp}`)

  const submitReview = await createDraft('معاملة إرسال للمراجعة ر2', `tx-p4-r2-submit-${stamp}`)

  const inReview = await createDraft('معاملة قيد المراجعة ر2', `tx-p4-r2-inreview-${stamp}`)
  await runTransactionWorkflowAction({
    payload,
    id: inReview.id,
    action: 'submitForReview',
    user: researcherUser as never,
  })

  const changesReq = await createDraft('معاملة تعديلات مطلوبة ر2', `tx-p4-r2-changes-${stamp}`)
  await runTransactionWorkflowAction({
    payload,
    id: changesReq.id,
    action: 'submitForReview',
    user: researcherUser as never,
  })
  await runTransactionWorkflowAction({
    payload,
    id: changesReq.id,
    action: 'requestChanges',
    user: reviewerUser as never,
    comment: 'يرجى توضيح الخطوة الأولى — تعليق تجريبي للمراجعة',
  })

  const sourceBlocker = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: true,
    data: {
      ...baseTx('معاملة حاجز مصادر ر2', `tx-p4-r2-srcblock-${stamp}`, {
        sources: [
          {
            source: sourceBad.id,
            primary: true,
            coveredSections: ['summary'],
          },
        ],
      }),
    },
    overrideAccess: true,
    context: seed,
  })
  await runTransactionWorkflowAction({
    payload,
    id: sourceBlocker.id,
    action: 'submitForReview',
    user: researcherUser as never,
  })

  const approved = await createDraft('معاملة معتمدة ر2', `tx-p4-r2-approved-${stamp}`)
  await runTransactionWorkflowAction({
    payload,
    id: approved.id,
    action: 'submitForReview',
    user: researcherUser as never,
  })
  await runTransactionWorkflowAction({
    payload,
    id: approved.id,
    action: 'approve',
    user: reviewerUser as never,
  })

  const invalidated = await createDraft('معاملة إبطال اعتماد ر2', `tx-p4-r2-invalidated-${stamp}`)
  await runTransactionWorkflowAction({
    payload,
    id: invalidated.id,
    action: 'submitForReview',
    user: researcherUser as never,
  })
  await runTransactionWorkflowAction({
    payload,
    id: invalidated.id,
    action: 'approve',
    user: reviewerUser as never,
  })
  await payload.update({
    collection: 'transactions',
    id: invalidated.id,
    data: { summary: 'تعديل حرج يُبطل الاعتماد — تجريبي ر2' },
    draft: true,
    overrideAccess: true,
    // No seed bypass — must trigger approval invalidation hook
    user: researcherUser as never,
  })

  const published = await createDraft('معاملة منشورة ر2', `tx-p4-r2-published-${stamp}`)
  await toPublished(published.id)

  const unpublished = await createDraft('معاملة ملغاة النشر ر2', `tx-p4-r2-unpub-${stamp}`)
  await toPublished(unpublished.id)
  await runTransactionWorkflowAction({
    payload,
    id: unpublished.id,
    action: 'unpublish',
    user: reviewerUser as never,
  })

  const archived = await createDraft('معاملة مؤرشفة ر2', `tx-p4-r2-archived-${stamp}`)
  await toPublished(archived.id)
  await runTransactionWorkflowAction({
    payload,
    id: archived.id,
    action: 'archive',
    user: adminUser as never,
    reason: 'أرشفة تجريبية Round 02',
  })

  const outdated = await createDraft('معاملة موسومة قديمة ر2', `tx-p4-r2-outdated-${stamp}`)
  await toPublished(outdated.id)
  await runTransactionWorkflowAction({
    payload,
    id: outdated.id,
    action: 'markOutdated',
    user: reviewerUser as never,
  })

  const reviewDue = await createDraft('معاملة موعد مراجعة ر2', `tx-p4-r2-reviewdue-${stamp}`)
  await toPublished(reviewDue.id)
  const past = new Date(Date.now() - 86400000 * 10).toISOString()
  await payload.update({
    collection: 'transactions',
    id: reviewDue.id,
    data: {
      reviewDueAt: past,
      lastReviewedAt: new Date(Date.now() - 86400000 * 100).toISOString(),
    },
    draft: false,
    overrideAccess: true,
    context: { ...seed, workflowAction: 'overrideReviewDue' },
  })

  const revisionTx = await createDraft('معاملة سجل المراجعات ر2', `tx-p4-r2-revision-${stamp}`)
  await payload.update({
    collection: 'transactions',
    id: revisionTx.id,
    data: { summary: 'نسخة أولى للسجل' },
    draft: true,
    overrideAccess: true,
    context: seed,
  })
  await payload.update({
    collection: 'transactions',
    id: revisionTx.id,
    data: { summary: 'نسخة ثانية للسجل' },
    draft: true,
    overrideAccess: true,
    context: seed,
  })

  const publishAudits = await payload.find({
    collection: 'audit-events',
    where: {
      and: [
        { entityId: { equals: String(published.id) } },
        { action: { equals: 'published' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  const creds = {
    password,
    users: {
      admin: { email: admin.email, id: admin.id },
      reviewer: { email: reviewer.email, id: reviewer.id },
      researcher: { email: researcher.email, id: researcher.id },
      viewer: { email: viewer.email, id: viewer.id },
    },
    ids: {
      draft: draft.id,
      submitReview: submitReview.id,
      inReview: inReview.id,
      changesRequested: changesReq.id,
      sourceBlocker: sourceBlocker.id,
      approved: approved.id,
      invalidated: invalidated.id,
      published: published.id,
      unpublished: unpublished.id,
      archived: archived.id,
      outdated: outdated.id,
      reviewDue: reviewDue.id,
      revision: revisionTx.id,
      categoryRoot: categoryRoot.id,
      categoryChild: categoryChild.id,
      publishAudit: publishAudits.docs[0]?.id ?? null,
    },
    slugs: {
      draft: (draft as { slug?: string }).slug,
      published: (published as { slug?: string }).slug,
      archived: (archived as { slug?: string }).slug,
      outdated: (outdated as { slug?: string }).slug,
    },
  }

  fs.writeFileSync(CREDS, JSON.stringify(creds, null, 2))
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        ...creds,
        password: '[redacted — see gitignored .local-credentials]',
        round: 'round-04-list-cells-closure',
        policy: 'fictional local QA Round 04 only — reset via db:reset',
      },
      null,
      2,
    ),
  )
  console.log('Phase 4 Round 04 fixture ready.')
  console.log('Credentials:', CREDS)
  console.log('Manifest:', MANIFEST)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

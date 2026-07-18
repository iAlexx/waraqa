/**
 * Local-only Phase 3 QA fixture (fictional content).
 *
 * Requires: ALLOW_QA_FIXTURE=1
 * Writes credentials to docs/qa/phase-3/.local-credentials (gitignored).
 * Reset: pnpm db:reset && pnpm db:migrate  OR  delete fixture docs via Admin.
 *
 * Never run in production. Never commit credentials.
 */
import { config as loadEnv } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'node:url'

loadEnv({ path: '.env.local' })
loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CREDS = path.join(ROOT, 'docs/qa/phase-3/.local-credentials')

if (process.env.ALLOW_QA_FIXTURE !== '1') {
  console.error('Refusing to run: set ALLOW_QA_FIXTURE=1 for local disposable QA only.')
  process.exit(1)
}

const stamp = Date.now()
const password =
  process.env.WARAQA_QA_PASSWORD ||
  `QaLocal-${stamp.toString(36)}-Only!`

const seedCtx = { seed: true as const }

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config: await config })

  const roles = ['admin', 'reviewer', 'researcher', 'viewer'] as const
  const users: Record<string, { email: string; id: number }> = {}

  for (const role of roles) {
    const email = `qa-${role}-${stamp}@example.test`
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        role,
        name: `QA ${role}`,
        isActive: true,
      },
      overrideAccess: true,
      context: seedCtx,
    })
    users[role] = { email, id: Number(user.id) }
    console.log(`user ${role}: ${email}`)
  }

  const category = await payload.create({
    collection: 'categories',
    locale: 'ar',
    draft: true,
    data: {
      name: 'تصنيف تجريبي',
      slug: `cat-qa-${stamp}`,
      description: 'بيانات تجريبية للعرض — ليست معلومات رسمية',
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const agency = await payload.create({
    collection: 'agencies',
    locale: 'ar',
    draft: true,
    data: {
      name: 'جهة تجريبية',
      slug: `agency-qa-${stamp}`,
      type: 'other',
      description: 'جهة وهمية للاختبار فقط',
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const center = await payload.create({
    collection: 'service-centers',
    locale: 'ar',
    draft: true,
    data: {
      name: 'مركز خدمة تجريبي',
      slug: `center-qa-${stamp}`,
      agency: Number(agency.id),
      governorate: 'damascus',
      city: 'دمشق',
      address: 'عنوان تجريبي غير حقيقي',
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const document = await payload.create({
    collection: 'documents',
    locale: 'ar',
    draft: true,
    data: {
      name: 'وثيقة تجريبية',
      slug: `doc-qa-${stamp}`,
      documentType: 'other',
      description: 'وثيقة وهمية — لا تمثل مطلباً رسمياً',
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const source = await payload.create({
    collection: 'sources',
    locale: 'ar',
    draft: true,
    data: {
      title: 'مصدر رسمي تجريبي',
      slug: `source-qa-${stamp}`,
      sourceType: 'official_webpage',
      officialUrl: 'https://example.test/waraqa-qa-source',
      verificationStatus: 'needs_review',
      notes: 'ملاحظة داخلية سرية للاختبار فقط',
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  // Publish supporting refs so public API tests work for published tx
  for (const [collection, id] of [
    ['categories', category.id],
    ['agencies', agency.id],
    ['service-centers', center.id],
    ['documents', document.id],
    ['sources', source.id],
  ] as const) {
    await payload.update({
      collection: collection as 'categories',
      id: Number(id),
      data: { _status: 'published' },
      draft: false,
      user: { id: users.admin.id, role: 'admin', collection: 'users' },
      overrideAccess: false,
    })
  }

  const draftTx = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: true,
    data: {
      title: 'معاملة تجريبية',
      slug: `tx-draft-qa-${stamp}`,
      summary: 'ملخص تجريبي للعرض فقط — ليست معلومات رسمية',
      category: Number(category.id),
      agency: Number(agency.id),
      serviceCenters: [Number(center.id)],
      steps: [
        { title: 'خطوة تجريبية أولى', description: 'وصف خطوة وهمية' },
        { title: 'خطوة تجريبية ثانية', description: 'وصف آخر وهمي' },
      ],
      sources: [{ source: Number(source.id), primary: true, citationNote: 'اقتباس تجريبي' }],
      requiredDocuments: [
        {
          document: Number(document.id),
          requirementType: 'required',
          quantity: 1,
          notes: 'ملاحظة وثيقة تجريبية',
        },
      ],
      fees: [{ label: 'رسم تجريبي', amount: 0, currency: 'SYP', amountText: 'مجاني للاختبار' }],
      internalNotes: 'INTERNAL_SECRET_NOTE_SHOULD_NOT_APPEAR_PUBLICLY',
      lastReviewedAt: new Date().toISOString(),
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const publishedTx = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: true,
    data: {
      title: 'معاملة تجريبية منشورة',
      slug: `tx-pub-qa-${stamp}`,
      summary: 'معاملة منشورة للاختبار العام — بيانات تجريبية',
      category: Number(category.id),
      agency: Number(agency.id),
      serviceCenters: [Number(center.id)],
      steps: [{ title: 'خطوة', description: 'وصف' }],
      sources: [{ source: Number(source.id), primary: true }],
      requiredDocuments: [
        { document: Number(document.id), requirementType: 'required', quantity: 1 },
      ],
      internalNotes: 'INTERNAL_ON_PUBLISHED_MUST_STAY_HIDDEN',
      lastReviewedAt: new Date().toISOString(),
      active: true,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  await payload.update({
    collection: 'transactions',
    id: Number(publishedTx.id),
    data: { _status: 'published' },
    draft: false,
    user: { id: users.admin.id, role: 'admin', collection: 'users' },
    overrideAccess: false,
  })

  const inactiveTx = await payload.create({
    collection: 'transactions',
    locale: 'ar',
    draft: true,
    data: {
      title: 'معاملة تجريبية غير نشطة',
      slug: `tx-inactive-qa-${stamp}`,
      summary: 'منشورة لكن غير نشطة',
      category: Number(category.id),
      agency: Number(agency.id),
      steps: [{ title: 'س', description: 'و' }],
      sources: [{ source: Number(source.id) }],
      lastReviewedAt: new Date().toISOString(),
      active: false,
      internalNotes: 'inactive internal',
    },
    overrideAccess: true,
    context: seedCtx,
  })
  await payload.update({
    collection: 'transactions',
    id: Number(inactiveTx.id),
    data: { _status: 'published', active: false },
    draft: false,
    user: { id: users.admin.id, role: 'admin', collection: 'users' },
    overrideAccess: false,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'ar',
    data: {
      siteName: 'ورقة (تجريبي)',
      tagline: 'منصة إرشادية تجريبية',
      independenceDisclaimer:
        'منصة إرشادية مستقلة — ليست موقعاً حكومياً. بيانات تجريبية للعرض.',
      footerDisclaimer: 'بيانات تجريبية للعرض — ليست معلومات رسمية',
      contactEmail: 'qa-contact@example.test',
      verificationPolicyDays: 90,
      maintenanceMode: false,
    },
    overrideAccess: true,
    context: seedCtx,
  })

  const manifest = {
    createdAt: new Date().toISOString(),
    policy: 'fictional local QA only — delete via db:reset or Admin',
    passwordEnvHint: 'Password written only to gitignored .local-credentials',
    users: Object.fromEntries(
      Object.entries(users).map(([role, u]) => [role, { email: u.email, id: u.id }]),
    ),
    ids: {
      category: Number(category.id),
      agency: Number(agency.id),
      center: Number(center.id),
      document: Number(document.id),
      source: Number(source.id),
      draftTransaction: Number(draftTx.id),
      publishedTransaction: Number(publishedTx.id),
      inactiveTransaction: Number(inactiveTx.id),
    },
    slugs: {
      draft: `tx-draft-qa-${stamp}`,
      published: `tx-pub-qa-${stamp}`,
      inactive: `tx-inactive-qa-${stamp}`,
    },
  }

  fs.mkdirSync(path.dirname(CREDS), { recursive: true })
  fs.writeFileSync(
    CREDS,
    JSON.stringify({ ...manifest, password }, null, 2),
    'utf8',
  )
  fs.writeFileSync(
    path.join(ROOT, 'docs/qa/phase-3/revisions/round-01-core-collections/fixture-manifest.json'),
    JSON.stringify({ ...manifest, password: '[redacted — see .local-credentials]' }, null, 2),
    'utf8',
  )

  console.log('Fixture ready. Credentials:', CREDS)
  console.log('Manifest (no password): fixture-manifest.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

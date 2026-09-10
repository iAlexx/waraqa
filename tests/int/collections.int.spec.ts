/**
 * Phase 3 integration tests — fictional content only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

async function cleanup() {
  const order = [
    'transactions',
    'claims',
    'sources',
    'documents',
    'service-centers',
    'agencies',
    'categories',
    'users',
  ]
  for (const collection of order) {
    for (const item of [...created].reverse()) {
      if (item.collection !== collection) continue
      try {
        await payload.delete({ collection: collection as 'users', id: item.id, overrideAccess: true })
      } catch {
        /* ignore */
      }
    }
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await cleanup()
})

describe('Phase 3 collections', () => {
  let adminId: number
  let researcherId: number
  let reviewerId: number
  let categoryId: number
  let agencyId: number
  let centerId: number
  let documentId: number
  let sourceId: number
  let claimId: number
  let draftTxId: number
  let publishedTxId: number

  it('creates admin and researcher users', async () => {
    const stamp = Date.now()
    const admin = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `admin-p3-${stamp}@example.test`,
          password: 'TestPassphrase-Phase3-Admin!',
          role: 'admin',
          name: 'Admin تجريبي',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    adminId = Number(admin.id)

    const researcher = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `researcher-p3-${stamp}@example.test`,
          password: 'TestPassphrase-Phase3-Researcher!',
          role: 'researcher',
          name: 'باحث تجريبي',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    researcherId = Number(researcher.id)
    expect(researcher.role).toBe('researcher')

    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-p3-${stamp}@example.test`,
          password: 'TestPassphrase-Phase3-Reviewer!',
          role: 'reviewer',
          name: 'مراجع تجريبي',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewerId = Number(reviewer.id)
  })

  it('creates category, agency, service center, document, source drafts', async () => {
    const stamp = Date.now()
    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: true,
        data: { name: 'تصنيف تجريبي', slug: `cat-tajribi-${stamp}`, active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    categoryId = Number(category.id)

    const agency = await track(
      'agencies',
      await payload.create({
        collection: 'agencies',
        locale: 'ar',
        draft: true,
        data: { name: 'جهة تجريبية', slug: `agency-tajribi-${stamp}`, type: 'other', active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    agencyId = Number(agency.id)

    const center = await track(
      'service-centers',
      await payload.create({
        collection: 'service-centers',
        locale: 'ar',
        draft: true,
        data: {
          name: 'مركز خدمة تجريبي',
          slug: `center-tajribi-${stamp}`,
          agency: agencyId,
          governorate: 'damascus',
          city: 'دمشق',
          address: 'عنوان تجريبي',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    centerId = Number(center.id)

    const document = await track(
      'documents',
      await payload.create({
        collection: 'documents',
        locale: 'ar',
        draft: true,
        data: { name: 'وثيقة تجريبية', slug: `doc-tajribi-${stamp}`, documentType: 'other', active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    documentId = Number(document.id)

    const source = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        draft: true,
        data: {
          title: 'مصدر رسمي تجريبي',
          slug: `source-tajribi-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/source',
          verificationStatus: 'needs_review',
          notes: 'ملاحظة داخلية سرية',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(source.id)
    expect(category.name).toBeTruthy()
    expect(center.agency).toBeTruthy()
  })

  it('creates a draft procedure linking required entities', async () => {
    const stamp = Date.now()
    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة تجريبية',
          slug: `tx-tajribi-${stamp}`,
          summary: 'ملخص تجريبي للعرض فقط — ليست معلومات رسمية',
          category: categoryId,
          agency: agencyId,
          serviceCenters: [centerId],
          steps: [{ title: 'خطوة تجريبية', description: 'وصف خطوة تجريبية' }],
          sources: [{ source: sourceId, primary: true }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          internalNotes: 'ملاحظات داخلية للاختبار فقط',
          active: true,
          lastReviewedAt: new Date().toISOString(),
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    draftTxId = Number(tx.id)
    expect(tx._status).toBe('draft')
  })

  it('draft procedure is not anonymously readable', async () => {
    const found = await payload.find({
      collection: 'transactions',
      where: { id: { equals: draftTxId } },
      overrideAccess: false,
      user: undefined,
    })
    expect(found.totalDocs).toBe(0)
  })

  it('researcher cannot publish', async () => {
    await expect(
      payload.update({
        collection: 'transactions',
        id: draftTxId,
        data: { _status: 'published' },
        draft: false,
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('admin can publish and anonymous can read published active', async () => {
    for (const [collection, id] of [
      ['categories', categoryId],
      ['agencies', agencyId],
      ['service-centers', centerId],
      ['documents', documentId],
    ] as const) {
      await payload.update({
        collection: collection as 'categories',
        id,
        data: { _status: 'published' },
        draft: false,
        user: { id: adminId, role: 'admin', isActive: true, collection: 'users' },
        overrideAccess: false,
      })
    }

    await payload.update({
      collection: 'sources',
      id: sourceId,
      data: { _status: 'published', verificationStatus: 'verified' },
      draft: false,
      user: { id: adminId, role: 'admin', isActive: true, collection: 'users' },
      overrideAccess: true,
      context: seedCtx,
    })

    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_p3_${Date.now()}`,
        sourceId,
        reviewerId,
      }),
    )
    claimId = Number(claim.id)

    const published = await payload.update({
      collection: 'transactions',
      id: draftTxId,
      data: {
        _status: 'published',
        workflowState: 'published',
        claimTrustOk: true,
        claimBindings: [{ claim: claimId, required: true, coveredSection: 'summary' }],
      },
      draft: false,
      user: { id: adminId, role: 'admin', isActive: true, collection: 'users' },
      overrideAccess: true,
      context: { ...seedCtx, workflowAction: 'publish' },
    })
    publishedTxId = Number(published.id)
    expect(published._status).toBe('published')

    const found = await payload.find({
      collection: 'transactions',
      where: { id: { equals: publishedTxId } },
      overrideAccess: false,
      user: undefined,
      depth: 0,
    })
    expect(found.totalDocs).toBe(1)
    expect((found.docs[0] as { internalNotes?: string }).internalNotes).toBeUndefined()
  })

  it('inactive published procedure is not anonymously readable', async () => {
    await payload.update({
      collection: 'transactions',
      id: publishedTxId,
      data: { active: false },
      overrideAccess: true,
      context: seedCtx,
    })
    const found = await payload.find({
      collection: 'transactions',
      where: { id: { equals: publishedTxId } },
      overrideAccess: false,
      user: undefined,
    })
    expect(found.totalDocs).toBe(0)
    await payload.update({
      collection: 'transactions',
      id: publishedTxId,
      data: { active: true },
      overrideAccess: true,
      context: seedCtx,
    })
  })

  it('rejects duplicate documents on procedure', async () => {
    await expect(
      payload.update({
        collection: 'transactions',
        id: publishedTxId,
        data: {
          requiredDocuments: [
            { document: documentId, requirementType: 'required', quantity: 1 },
            { document: documentId, requirementType: 'required', quantity: 1 },
          ],
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    ).rejects.toThrow(/الوثيقة/)
  })

  it('rejects invalid publish missing sources', async () => {
    const stamp = Date.now()
    const bad = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة ناقصة',
          slug: `tx-bad-${stamp}`,
          summary: 'ملخص',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'س', description: 'و' }],
          sources: [{ source: sourceId }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    await expect(
      payload.update({
        collection: 'transactions',
        id: Number(bad.id),
        data: { sources: [], _status: 'published' },
        draft: false,
        user: { id: adminId, role: 'admin', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('supports Arabic locale content and English fallback path', async () => {
    const stamp = Date.now()
    const cat = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        data: {
          name: 'تصنيف عربي',
          slug: `cat-loc-${stamp}`,
          active: true,
          _status: 'published',
        },
        user: { id: adminId, role: 'admin', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )
    await payload.update({
      collection: 'categories',
      id: Number(cat.id),
      locale: 'en',
      data: { name: 'Experimental category' },
      overrideAccess: true,
      context: seedCtx,
    })
    const ar = await payload.findByID({
      collection: 'categories',
      id: Number(cat.id),
      locale: 'ar',
      overrideAccess: true,
    })
    const en = await payload.findByID({
      collection: 'categories',
      id: Number(cat.id),
      locale: 'en',
      fallbackLocale: 'ar',
      overrideAccess: true,
    })
    expect(ar.name).toContain('عربي')
    expect(en.name).toBeTruthy()
  })

  it('GraphQL remains disabled in config', async () => {
    const cfg = await config
    expect(cfg.graphQL?.disable).toBe(true)
  })
})

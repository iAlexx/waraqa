/**
 * Phase 4 public access — PostgreSQL integration.
 * Proves archived / outdated / inactive / draft exclusion at the access Where layer
 * (not via afterRead as primary). Fictional data only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { publicTransactionWhere } from '@/access'
import { runTransactionWorkflowAction } from '@/lib/workflow/transaction-workflow'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  const order = [
    'audit-events',
    'transactions',
    'sources',
    'documents',
    'agencies',
    'categories',
    'users',
  ]
  for (const collection of order) {
    for (const item of [...created].reverse()) {
      if (item.collection !== collection) continue
      try {
        await payload.delete({
          collection: collection as 'users',
          id: item.id,
          overrideAccess: true,
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('Phase 4 public transaction access (query layer)', () => {
  let admin: { id: number; role: string; isActive: true; collection: string }
  let reviewer: { id: number; role: string; isActive: true; collection: string }
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let stamp: number

  async function createPublishableDraft(slugSuffix: string) {
    return track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `معاملة وصول عام ${slugSuffix}`,
          slug: `tx-pub-access-${slugSuffix}-${stamp}`,
          summary: 'بيانات تجريبية للوصول العام',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'خطوة', description: 'وصف' }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          fees: [{ label: 'رسم', amount: 1, currency: 'SYP' }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'draft',
          markedOutdated: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }

  async function publishViaWorkflow(id: number | string) {
    await runTransactionWorkflowAction({
      payload,
      id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id,
      action: 'approve',
      user: reviewer as never,
    })
    return runTransactionWorkflowAction({
      payload,
      id,
      action: 'publish',
      user: reviewer as never,
    })
  }

  it('bootstraps roles and verified source chain', async () => {
    stamp = Date.now()
    const a = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `admin-access-${stamp}@example.test`,
          password: 'TestPassphrase-Phase4-Access-Admin!',
          role: 'admin',
          name: 'Admin Access',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    admin = { id: Number(a.id), role: 'admin', isActive: true, collection: 'users' }

    const r = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-access-${stamp}@example.test`,
          password: 'TestPassphrase-Phase4-Access-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer Access',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewer = { id: Number(r.id), role: 'reviewer', isActive: true, collection: 'users' }

    const cat = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        data: {
          name: 'تصنيف وصول',
          slug: `cat-access-${stamp}`,
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    categoryId = Number(cat.id)

    const ag = await track(
      'agencies',
      await payload.create({
        collection: 'agencies',
        locale: 'ar',
        data: {
          name: 'جهة وصول',
          slug: `ag-access-${stamp}`,
          type: 'other',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    agencyId = Number(ag.id)

    const doc = await track(
      'documents',
      await payload.create({
        collection: 'documents',
        locale: 'ar',
        data: {
          name: 'وثيقة وصول',
          slug: `doc-access-${stamp}`,
          documentType: 'other',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    documentId = Number(doc.id)

    const src = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        data: {
          title: 'مصدر وصول موثّق',
          slug: `src-access-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/access-official',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(src.id)

    expect(publicTransactionWhere).toMatchObject({
      and: expect.arrayContaining([
        { _status: { equals: 'published' } },
        { active: { equals: true } },
        { markedOutdated: { not_equals: true } },
        { workflowState: { not_equals: 'archived' } },
      ]),
    })
  })

  it('anonymous sees published+active+current; draft list is empty', async () => {
    const draft = await createPublishableDraft('draft')
    const draftList = await payload.find({
      collection: 'transactions',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(draftList.docs).toEqual([])
    expect(draftList.totalDocs).toBe(0)

    const published = await createPublishableDraft('ok')
    await publishViaWorkflow(published.id)

    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: published.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon.totalDocs).toBe(1)
    expect(anon.docs[0]?.id).toBe(published.id)
    expect((anon.docs[0] as { internalNotes?: unknown }).internalNotes).toBeUndefined()
  })

  it('anonymous list/ID hide manually outdated (totalDocs 0; no id/slug leak)', async () => {
    const tx = await createPublishableDraft('outdated')
    await publishViaWorkflow(tx.id)
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'markOutdated',
      user: reviewer as never,
    })

    const list = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(list.docs).toEqual([])
    expect(list.totalDocs).toBe(0)

    await expect(
      payload.findByID({
        collection: 'transactions',
        id: tx.id,
        overrideAccess: false,
        user: undefined,
      }),
    ).rejects.toThrow()

    // Editorial still sees it
    const editorial = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      overrideAccess: false,
      user: reviewer as never,
      draft: true,
    })
    expect(editorial.markedOutdated).toBe(true)
    expect(editorial.slug).toBeTruthy()
  })

  it('anonymous list/ID hide archived (totalDocs 0)', async () => {
    const tx = await createPublishableDraft('archived')
    await publishViaWorkflow(tx.id)
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'archive',
      user: admin as never,
      reason: 'أرشفة تجريبية للوصول العام',
    })

    const list = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(list.docs).toEqual([])
    expect(list.totalDocs).toBe(0)

    await expect(
      payload.findByID({
        collection: 'transactions',
        id: tx.id,
        overrideAccess: false,
        user: undefined,
      }),
    ).rejects.toThrow()
  })

  it('query-layer excludes archived even if _status wrongly remains published', async () => {
    // Synthetic inconsistency proves workflowState constraint is not afterRead-only.
    const tx = await createPublishableDraft('synth-arch')
    await publishViaWorkflow(tx.id)
    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: {
        workflowState: 'archived',
        active: true,
        _status: 'published',
        markedOutdated: false,
      },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
    })

    const list = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(list.docs).toEqual([])
    expect(list.totalDocs).toBe(0)
  })

  it('anonymous list hides inactive published records (totalDocs 0)', async () => {
    const tx = await createPublishableDraft('inactive')
    await publishViaWorkflow(tx.id)
    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: { active: false },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
    })

    const list = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(list.docs).toEqual([])
    expect(list.totalDocs).toBe(0)
  })

  it('relationship populate does not expose archived/outdated/inactive related transactions', async () => {
    const related = await createPublishableDraft('rel-hidden')
    await publishViaWorkflow(related.id)
    await runTransactionWorkflowAction({
      payload,
      id: related.id,
      action: 'markOutdated',
      user: reviewer as never,
    })

    const parent = await createPublishableDraft('rel-parent')
    await payload.update({
      collection: 'transactions',
      id: parent.id,
      data: { prerequisiteProcedures: [related.id] },
      draft: true,
      overrideAccess: true,
      context: seedCtx,
    })
    await publishViaWorkflow(parent.id)

    const anon = await payload.findByID({
      collection: 'transactions',
      id: parent.id,
      depth: 1,
      overrideAccess: false,
      user: undefined,
    })

    const prereqs = (anon as { prerequisiteProcedures?: unknown[] }).prerequisiteProcedures ?? []
    expect(prereqs).toEqual([])
    // No populated outdated body; avoid brittle digit substring checks (ids can appear in dates).
    const leakedOutdatedBody = prereqs.some(
      (p) =>
        p &&
        typeof p === 'object' &&
        ((p as { id?: number }).id === related.id ||
          (p as { markedOutdated?: boolean }).markedOutdated === true),
    )
    expect(leakedOutdatedBody).toBe(false)
    if (typeof anon === 'object' && anon && 'id' in anon) {
      expect(Number((anon as { id: number }).id)).toBe(Number(parent.id))
    }
  })

  it('admin/reviewer still read archived and outdated', async () => {
    const tx = await createPublishableDraft('editorial-see')
    await publishViaWorkflow(tx.id)
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'markOutdated',
      user: reviewer as never,
    })

    const asReviewer = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: reviewer as never,
      draft: true,
    })
    expect(asReviewer.totalDocs).toBe(1)

    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'archive',
      user: admin as never,
      reason: 'أرشفة بعد وسم قديم',
    })

    const asAdmin = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      overrideAccess: false,
      user: admin as never,
      draft: true,
    })
    expect(asAdmin.workflowState).toBe('archived')
  })
})

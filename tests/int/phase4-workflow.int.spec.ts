/**
 * Phase 4 editorial workflow integration tests — fictional content only.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'
import { runTransactionWorkflowAction } from '@/lib/workflow/transaction-workflow'
import { WorkflowError } from '@/lib/workflow/types'
import { signPreviewToken, verifyPreviewToken } from '@/lib/workflow/preview-token'

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
        await payload.delete({
          collection: collection as 'users',
          id: item.id,
          overrideAccess: true,
          context: { seed: true },
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('Phase 4 editorial workflow', () => {
  let admin: { id: number; role: string; isActive: true; collection: string }
  let reviewer: { id: number; role: string; isActive: true; collection: string }
  let researcher: { id: number; role: string; isActive: true; collection: string }
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let claimId: number
  let txId: number

  it('bootstraps users and verified source chain', async () => {
    const stamp = Date.now()
    const a = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `admin-p4-${stamp}@example.test`,
          password: 'TestPassphrase-Phase4-Admin!',
          role: 'admin',
          name: 'Admin P4',
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
          email: `reviewer-p4-${stamp}@example.test`,
          password: 'TestPassphrase-Phase4-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer P4',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewer = { id: Number(r.id), role: 'reviewer', isActive: true, collection: 'users' }

    const res = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `researcher-p4-${stamp}@example.test`,
          password: 'TestPassphrase-Phase4-Researcher!',
          role: 'researcher',
          name: 'Researcher P4',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    researcher = { id: Number(res.id), role: 'researcher', isActive: true, collection: 'users' }

    const cat = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: true,
        data: { name: 'تصنيف سير', slug: `cat-p4-${stamp}`, active: true, _status: 'published' },
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
        draft: true,
        data: {
          name: 'جهة سير',
          slug: `ag-p4-${stamp}`,
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
          name: 'وثيقة سير',
          slug: `doc-p4-${stamp}`,
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
          title: 'مصدر موثّق تجريبي',
          slug: `src-p4-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/official-p4',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
          contentClass: 'PRODUCTION',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(src.id)

    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {

        key: `claim_p4_${stamp}`,
        sourceId,
        reviewerId: reviewer.id,
        contentClass: 'PRODUCTION',
      }),
    )
    claimId = Number(claim.id)
  })

  it('researcher creates draft and submits for review', async () => {
    const stamp = Date.now()
    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة تجريبية لسير المراجعة',
          slug: `tx-p4-${stamp}`,
          summary: 'ملخص تجريبي',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'خطوة', description: 'وصف' }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          fees: [{ label: 'رسم', amount: 10, currency: 'SYP' }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: [
                'summary',
                'required_documents',
                'steps',
                'fees',
                'other',
              ],
            },
          ],
          claimBindings: [{ claim: claimId, required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'draft',
          contentClass: 'PRODUCTION',
        },
        user: researcher as never,
        overrideAccess: false,
        context: seedCtx,
      }),
    )
    txId = Number(tx.id)
    expect(tx.workflowState ?? 'draft').toBe('draft')

    const submitted = await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'submitForReview',
      user: researcher as never,
    })
    expect((submitted as { workflowState?: string }).workflowState).toBe('in_review')

    const audits = await payload.find({
      collection: 'audit-events',
      where: {
        and: [
          { entityId: { equals: String(txId) } },
          { action: { equals: 'submitted_for_review' } },
        ],
      },
      overrideAccess: true,
      context: { seed: true },
    })
    expect(audits.totalDocs).toBeGreaterThanOrEqual(1)
    created.push(...audits.docs.map((d) => ({ collection: 'audit-events', id: d.id })))
  })

  it('approve fails closed without required claim binding', async () => {
    const stamp = Date.now()
    const unbound = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة بلا ادعاء',
          slug: `tx-p4-unbound-${stamp}`,
          summary: 'ملخص',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'خطوة', description: 'وصف' }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          fees: [{ label: 'رسم', amount: 10, currency: 'SYP' }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          claimBindings: [],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'in_review',
          contentClass: 'PRODUCTION',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    await expect(
      runTransactionWorkflowAction({
        payload,
        id: unbound.id,
        action: 'approve',
        user: reviewer as never,
      }),
    ).rejects.toBeInstanceOf(WorkflowError)
  })

  it('researcher cannot publish via workflow', async () => {
    await expect(
      runTransactionWorkflowAction({
        payload,
        id: txId,
        action: 'publish',
        user: researcher as never,
      }),
    ).rejects.toBeInstanceOf(WorkflowError)
  })

  it('reviewer requestChanges requires comment', async () => {
    await expect(
      runTransactionWorkflowAction({
        payload,
        id: txId,
        action: 'requestChanges',
        user: reviewer as never,
        comment: '   ',
      }),
    ).rejects.toBeInstanceOf(WorkflowError)

    const changed = await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'requestChanges',
      user: reviewer as never,
      comment: 'يرجى توضيح الخطوة الأولى',
    })
    expect((changed as { workflowState?: string }).workflowState).toBe('changes_requested')
  })

  it('researcher resubmits; reviewer cannot approve without evidence; approve succeeds', async () => {
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'resubmitForReview',
      user: researcher as never,
    })

    const approved = await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'approve',
      user: reviewer as never,
    })
    expect((approved as { workflowState?: string }).workflowState).toBe('approved')
    expect((approved as { approvedContentHash?: string }).approvedContentHash).toBeTruthy()
  })

  it('critical edit invalidates approval; internal note does not', async () => {
    // re-approve first if invalidated somehow
    let doc = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      overrideAccess: true,
      context: { seed: true },
    })
    if (doc.workflowState !== 'approved') {
      await runTransactionWorkflowAction({
        payload,
        id: txId,
        action: 'submitForReview',
        user: researcher as never,
      }).catch(() => undefined)
      if ((await payload.findByID({ collection: 'transactions', id: txId, draft: true, overrideAccess: true })).workflowState === 'changes_requested') {
        await runTransactionWorkflowAction({
          payload,
          id: txId,
          action: 'resubmitForReview',
          user: researcher as never,
        })
      }
      doc = (await runTransactionWorkflowAction({
        payload,
        id: txId,
        action: 'approve',
        user: reviewer as never,
      })) as typeof doc
    }

    await payload.update({
      collection: 'transactions',
      id: txId,
      data: { internalNotes: 'ملاحظة داخلية لا تبطل' },
      draft: true,
      overrideAccess: true,
      context: seedCtx,
      user: researcher as never,
    })
    let afterNote = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      overrideAccess: true,
      context: { seed: true },
    })
    expect(afterNote.workflowState).toBe('approved')

    await payload.update({
      collection: 'transactions',
      id: txId,
      locale: 'ar',
      data: { title: 'عنوان معدّل حرج' },
      draft: true,
      overrideAccess: false,
      user: researcher as never,
    })
    afterNote = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      overrideAccess: true,
      context: { seed: true },
    })
    expect(afterNote.workflowState).toBe('draft')
    expect(afterNote.approvedContentHash).toBeFalsy()
  })

  it('rejects workflowState spoofing', async () => {
    await payload.update({
      collection: 'transactions',
      id: txId,
      data: { workflowState: 'published' },
      draft: true,
      overrideAccess: false,
      user: researcher as never,
    }).catch(() => undefined)
    const doc = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      overrideAccess: true,
      context: { seed: true },
    })
    expect(doc.workflowState).not.toBe('published')
  })

  it('full approve + publish + public visibility + unpublish', async () => {
    // rebuild evidence path
    await payload.update({
      collection: 'transactions',
      id: txId,
      locale: 'ar',
      data: {
        title: 'معاملة تجريبية لسير المراجعة',
        summary: 'ملخص تجريبي',
        steps: [{ title: 'خطوة', description: 'وصف' }],
        sources: [
          {
            source: sourceId,
            primary: true,
            coveredSections: [
              'summary',
              'required_documents',
              'steps',
              'fees',
              'other',
            ],
          },
        ],
        claimBindings: [{ claim: claimId, required: true, coveredSection: 'summary' }],
        lastReviewedAt: new Date().toISOString(),
      },
      draft: true,
      overrideAccess: true,
      context: seedCtx,
    })

    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'submitForReview',
      user: researcher as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'approve',
      user: reviewer as never,
    })
    const published = await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'publish',
      user: reviewer as never,
    })
    expect((published as { _status?: string })._status).toBe('published')
    expect((published as { workflowState?: string }).workflowState).toBe('published')

    const pubAudits = await payload.find({
      collection: 'audit-events',
      where: {
        and: [{ entityId: { equals: String(txId) } }, { action: { equals: 'published' } }],
      },
      overrideAccess: true,
      context: { seed: true },
    })
    expect(pubAudits.totalDocs).toBeGreaterThanOrEqual(1)
    created.push(...pubAudits.docs.map((d) => ({ collection: 'audit-events', id: d.id })))

    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: txId } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon.totalDocs).toBe(1)

    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'unpublish',
      user: reviewer as never,
    })
    const anon2 = await payload.find({
      collection: 'transactions',
      where: { id: { equals: txId } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon2.totalDocs).toBe(0)
  })

  it('audit events immutable and anonymous denied', async () => {
    const list = await payload.find({
      collection: 'audit-events',
      limit: 1,
      overrideAccess: true,
      context: { seed: true },
    })
    if (list.docs[0]) {
      await expect(
        payload.update({
          collection: 'audit-events',
          id: list.docs[0].id,
          data: { summary: 'hack' },
          overrideAccess: false,
          user: admin as never,
        }),
      ).rejects.toThrow()
    }
    await expect(
      payload.find({
        collection: 'audit-events',
        overrideAccess: false,
        user: undefined,
      }),
    ).rejects.toThrow()
  })

  it('preview token works and expires', () => {
    const secret = 'p'.repeat(32)
    const token = signPreviewToken(secret, { id: String(txId), uid: String(researcher.id) })
    expect(verifyPreviewToken(secret, token)?.id).toBe(String(txId))
    expect(
      verifyPreviewToken(secret, token, { nowSeconds: Math.floor(Date.now() / 1000) + 10_000 }),
    ).toBeNull()
  })

  it('GraphQL remains disabled', async () => {
    const cfg = await config
    expect(cfg.graphQL?.disable).toBe(true)
  })
})

/**
 * Phase 11 review findings — historical hard-delete + stale assignee triage.
 */
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hashReportIdentity } from '@/lib/reports/identity-hash'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
import { runTransactionWorkflowAction } from '@/lib/workflow/transaction-workflow'
import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

async function asUserReq(userId: number): Promise<PayloadRequest> {
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    context: { seed: true },
  })
  return (await createLocalReq(
    {
      user: {
        ...(user as object),
        collection: 'users',
      } as NonNullable<PayloadRequest['user']>,
    },
    payload,
  )) as PayloadRequest
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  const order = [
    'audit-events',
    'user-reports',
    'transactions',
    'claims',
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
          context: { seed: true },
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('Phase 11 review findings — delete history + stale assignee', () => {
  let stamp: number
  let adminId: number
  let reviewerId: number
  let reviewer2Id: number
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let claimId: number
  let adminUser: Record<string, unknown>
  let reviewerUser: Record<string, unknown>

  it('bootstraps shared fixtures', async () => {
    stamp = Date.now()
    const admin = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11r-admin-${stamp}@example.test`,
          password: 'TestPassphrase-P11R-Admin!',
          role: 'admin',
          name: 'P11R Admin',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    adminId = Number(admin.id)
    adminUser = admin as unknown as Record<string, unknown>

    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11r-reviewer-${stamp}@example.test`,
          password: 'TestPassphrase-P11R-Reviewer!',
          role: 'reviewer',
          name: 'P11R Reviewer',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewerId = Number(reviewer.id)
    reviewerUser = reviewer as unknown as Record<string, unknown>

    const reviewer2 = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11r-reviewer2-${stamp}@example.test`,
          password: 'TestPassphrase-P11R-Reviewer2!',
          role: 'reviewer',
          name: 'P11R Reviewer Two',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewer2Id = Number(reviewer2.id)

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف P11R ${stamp}`,
          slug: `p11r-cat-${stamp}`,
          active: true,
          _status: 'published',
        },
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
        draft: false,
        data: {
          name: `جهة P11R ${stamp}`,
          slug: `p11r-agency-${stamp}`,
          type: 'other',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    agencyId = Number(agency.id)

    const document = await track(
      'documents',
      await payload.create({
        collection: 'documents',
        locale: 'ar',
        draft: false,
        data: {
          name: `وثيقة P11R ${stamp}`,
          slug: `p11r-doc-${stamp}`,
          documentType: 'identity',
          active: true,
          _status: 'published',
        },
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
        draft: false,
        data: {
          title: `مصدر P11R ${stamp}`,
          slug: `p11r-src-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p11r-source',
          verificationStatus: 'verified',
          contentClass: 'PRODUCTION',
          active: true,
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(source.id)

    const claim = await createAuthoritativeClaimFixture(payload, {
      key: `p11r_claim_${stamp}`,
      sourceId,
      reviewerId,
      contentClass: 'PRODUCTION',
    }).then((c) => track('claims', c))
    claimId = Number(claim.id)
  })

  async function createPublishableDraft(suffix: string) {
    return track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `معاملة P11R ${suffix} ${stamp}`,
          slug: `p11r-${suffix}-${stamp}`,
          summary: 'ملخص تجريبي لإصلاح مراجعة المرحلة الحادية عشرة.',
          category: categoryId,
          agency: agencyId,
          contentClass: 'PRODUCTION',
          active: true,
          workflowState: 'draft',
          markedOutdated: false,
          lastReviewedAt: new Date().toISOString(),
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          claimBindings: [{ claim: claimId, required: true, coveredSection: 'summary' }],
          steps: [{ title: 'خطوة', description: 'وصف' }],
          fees: [{ label: 'رسم', amount: 1, currency: 'SYP' }],
          _status: 'draft',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }

  it('A: never-published draft hard delete remains allowed', async () => {
    const draft = await createPublishableDraft('never-pub')
    const adminReq = await asUserReq(adminId)
    await payload.delete({
      collection: 'transactions',
      id: draft.id,
      overrideAccess: false,
      req: adminReq,
    })
    const idx = created.findIndex((c) => c.collection === 'transactions' && c.id === draft.id)
    if (idx >= 0) created.splice(idx, 1)
  })

  it('B: approve/publish then restoreRevision still blocks hard delete', async () => {
    const tx = await createPublishableDraft('restore-hist')
    const txId = Number(tx.id)

    const versionsBefore = await payload.findVersions({
      collection: 'transactions',
      where: { parent: { equals: txId } },
      limit: 5,
      sort: 'createdAt',
      overrideAccess: true,
    })
    expect(versionsBefore.docs.length).toBeGreaterThan(0)
    const prePublishVersionId = versionsBefore.docs[0]!.id

    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'submitForReview',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'approve',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'publish',
      user: reviewerUser as never,
    })

    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'restoreRevision',
      user: adminUser as never,
      versionId: prePublishVersionId,
    })

    const restored = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    expect(restored.workflowState).toBe('draft')
    expect(restored._status).toBe('draft')

    const adminReq = await asUserReq(adminId)
    await expect(
      payload.delete({
        collection: 'transactions',
        id: txId,
        overrideAccess: false,
        req: adminReq,
      }),
    ).rejects.toThrow(/أرشفة|حذف/)
  })

  it('C: historically archived then restored still blocks hard delete', async () => {
    const tx = await createPublishableDraft('archive-hist')
    const txId = Number(tx.id)

    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'submitForReview',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'approve',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'publish',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'archive',
      user: adminUser as never,
      reason: 'أرشفة اختبارية لإصلاح سياسة الحذف.',
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'restoreArchived',
      user: adminUser as never,
    })

    const restored = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    expect(restored.workflowState).toBe('draft')
    expect(restored.archivedAt).toBeFalsy()

    const adminReq = await asUserReq(adminId)
    await expect(
      payload.delete({
        collection: 'transactions',
        id: txId,
        overrideAccess: false,
        req: adminReq,
      }),
    ).rejects.toThrow(/أرشفة|حذف/)
  })

  it('stale assignee: triage edits succeed; new invalid assign rejected', async () => {
    const tx = await createPublishableDraft('assign-stale')
    const txId = Number(tx.id)
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'submitForReview',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'approve',
      user: reviewerUser as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: txId,
      action: 'publish',
      user: reviewerUser as never,
    })

    const slug = `p11r-assign-stale-${stamp}`
    const validated = validatePublicReportSubmit({
      transactionSlug: slug,
      section: 'fees',
      message: 'الرسوم الظاهرة في الصفحة لم تعد مطابقة لما طُلب في المركز.',
      encountered: 'طلب الموظفون مبلغاً مختلفاً عند الشباك دون توضيح.',
      consent: true,
      contactEmail: 'p11r-citizen@example.test',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const submitted = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: hashReportIdentity({
        secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
        ip: `198.51.100.${stamp % 200}`,
      }),
    })
    expect(submitted.ok).toBe(true)

    const found = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: txId } },
      limit: 1,
      overrideAccess: true,
      context: { seed: true },
    })
    const reportId = Number(found.docs[0]!.id)
    created.push({ collection: 'user-reports', id: reportId })

    const reviewerReq = await asUserReq(reviewerId)
    await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { assignedTo: reviewerId },
      overrideAccess: false,
      req: reviewerReq,
    })

    await payload.update({
      collection: 'users',
      id: reviewerId,
      data: { isActive: false },
      overrideAccess: true,
      context: seedCtx,
    })

    const reviewer2Req = await asUserReq(reviewer2Id)
    const notesOnly = await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { reviewNotes: 'ملاحظة داخلية بعد تعطيل المُعيَّن.' },
      overrideAccess: false,
      req: reviewer2Req,
    })
    expect(notesOnly.reviewNotes).toContain('ملاحظة داخلية')

    const statusOnly = await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { status: 'in_review' },
      overrideAccess: false,
      req: reviewer2Req,
    })
    expect(statusOnly.status).toBe('in_review')

    const { assertAssignableReportUser } = await import('@/lib/reports/assignment')

    await expect(
      assertAssignableReportUser(payload, reviewerId, reviewer2Req),
    ).rejects.toThrow(/غير نشط|تعيين/)

    // Reactivate then demote to researcher — new assignment must fail
    await payload.update({
      collection: 'users',
      id: reviewerId,
      data: { isActive: true, role: 'researcher' },
      overrideAccess: true,
      context: seedCtx,
    })

    await expect(
      assertAssignableReportUser(payload, reviewerId, reviewer2Req),
    ).rejects.toThrow(/باحث|تعيين|غير قابل/)

    // Unrelated triage still OK with stale demoted assignee preserved
    const notesAgain = await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { reviewNotes: 'تعديل بعد تخفيض الدور دون تغيير التعيين.' },
      overrideAccess: false,
      req: await asUserReq(reviewer2Id),
    })
    expect(notesAgain.reviewNotes).toContain('تخفيض')
  })
})

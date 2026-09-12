/**
 * Phase 11 — Admin UX closure: dashboard, review-due, assignment, delete policy.
 * Fictional fixtures only.
 */
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadEditorialDashboardStats } from '@/lib/admin/editorial-dashboard'
import { hashReportIdentity } from '@/lib/reports/identity-hash'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
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

describe('Phase 11 Admin UX integration', () => {
  let stamp: number
  let adminId: number
  let reviewerId: number
  let researcherId: number
  let inactiveId: number
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let productionSlug: string
  let productionTxId: number
  let draftTxId: number
  let publishedTxId: number
  let reportId: number

  it('bootstraps fixtures', async () => {
    stamp = Date.now()
    const admin = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11-admin-${stamp}@example.test`,
          password: 'TestPassphrase-P11-Admin!',
          role: 'admin',
          name: 'P11 Admin',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    adminId = Number(admin.id)

    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11-reviewer-${stamp}@example.test`,
          password: 'TestPassphrase-P11-Reviewer!',
          role: 'reviewer',
          name: 'P11 Reviewer',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewerId = Number(reviewer.id)

    const researcher = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11-researcher-${stamp}@example.test`,
          password: 'TestPassphrase-P11-Researcher!',
          role: 'researcher',
          name: 'P11 Researcher',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    researcherId = Number(researcher.id)

    const inactive = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11-inactive-${stamp}@example.test`,
          password: 'TestPassphrase-P11-Inactive!',
          role: 'reviewer',
          name: 'P11 Inactive',
          isActive: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    inactiveId = Number(inactive.id)

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف P11 ${stamp}`,
          slug: `p11-cat-${stamp}`,
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
          name: `جهة P11 ${stamp}`,
          slug: `p11-agency-${stamp}`,
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
          name: `وثيقة P11 ${stamp}`,
          slug: `p11-doc-${stamp}`,
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
          title: `مصدر P11 ${stamp}`,
          slug: `p11-src-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p11-source',
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
      key: `p11_claim_${stamp}`,
      sourceId,
      reviewerId,
      contentClass: 'PRODUCTION',
    }).then((c) => track('claims', c))

    const claimBindings = [{ claim: claim.id, required: true, coveredSection: 'summary' as const }]
    const overdue = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    productionSlug = `p11-prod-${stamp}`
    const prodTx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: `معاملة إنتاج P11 ${stamp}`,
          slug: productionSlug,
          summary: 'ملخص تجريبي للوحة المرحلة الحادية عشرة.',
          category: categoryId,
          agency: agencyId,
          contentClass: 'PRODUCTION',
          claimTrustOk: true,
          claimBindings,
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          lastReviewedAt: new Date().toISOString(),
          reviewDueAt: overdue,
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          steps: [{ title: 'خطوة', description: 'وصف' }],
          _status: 'published',
          publishedAt: new Date().toISOString(),
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    productionTxId = Number(prodTx.id)
    publishedTxId = productionTxId

    const draftTx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `مسودة P11 ${stamp}`,
          slug: `p11-draft-${stamp}`,
          summary: 'مسودة قابلة للحذف النهائي.',
          category: categoryId,
          agency: agencyId,
          contentClass: 'PRODUCTION',
          active: false,
          workflowState: 'draft',
          reviewDueAt: future,
          _status: 'draft',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    draftTxId = Number(draftTx.id)

    const inReviewTx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `قيد المراجعة P11 ${stamp}`,
          slug: `p11-inreview-${stamp}`,
          summary: 'معاملة بانتظار المراجعة للوحة.',
          category: categoryId,
          agency: agencyId,
          contentClass: 'PRODUCTION',
          active: false,
          workflowState: 'in_review',
          reviewDueAt: overdue,
          _status: 'draft',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(Number(inReviewTx.id)).toBeGreaterThan(0)
  })

  it('submits a public report without assignedTo', async () => {
    const validated = validatePublicReportSubmit({
      transactionSlug: productionSlug,
      section: 'fees',
      message: 'الرسوم المذكورة لم تعد مطابقة لما طُلب في المركز اليوم.',
      encountered: 'طلبوا مبلغاً مختلفاً عند الشباك في المركز.',
      consent: true,
      contactEmail: 'p11-citizen@example.test',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const identity = hashReportIdentity({
      secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
      ip: `203.0.113.${stamp % 200}`,
    })

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: identity,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const found = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 1,
      sort: '-createdAt',
      overrideAccess: true,
      context: { seed: true },
    })
    expect(found.docs[0]?.id).toBeTruthy()
    reportId = Number(found.docs[0]!.id)
    created.push({ collection: 'user-reports', id: reportId })

    const stored = await payload.findByID({
      collection: 'user-reports',
      id: reportId,
      depth: 0,
      overrideAccess: true,
    })
    expect(stored.assignedTo).toBeFalsy()
  })

  it('dashboard counts load for active reviewer; researcher denied path', async () => {
    const reviewerReq = await asUserReq(reviewerId)

    const stats = await loadEditorialDashboardStats(payload, {
      req: reviewerReq,
      currentUserId: reviewerId,
      now: new Date(),
    })
    expect(stats.cards.length).toBeGreaterThanOrEqual(5)
    const dueCard = stats.cards.find((c) => c.key === 'tx_review_due')
    expect(dueCard).toBeTruthy()
    expect(dueCard!.count).toBeGreaterThanOrEqual(1)
    const openCard = stats.cards.find((c) => c.key === 'reports_open')
    expect(openCard!.count).toBeGreaterThanOrEqual(1)
    expect(stats.cards.every((c) => c.href.startsWith('/admin/'))).toBe(true)

    const { editorialDashboardEndpoint } = await import('@/endpoints/editorial-dashboard')
    const researcherEndpointReq = await asUserReq(researcherId)
    await expect(editorialDashboardEndpoint.handler(researcherEndpointReq)).rejects.toThrow()

    const anonEndpointReq = {
      ...(await createLocalReq({}, payload)),
      payload,
      user: null,
    } as PayloadRequest
    await expect(editorialDashboardEndpoint.handler(anonEndpointReq)).rejects.toThrow()

    const okRes = await editorialDashboardEndpoint.handler(reviewerReq)
    expect(okRes.status).toBe(200)
    const body = (await okRes.json()) as { ok: boolean; cards: unknown[] }
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.cards)).toBe(true)

    const researcherReq = await asUserReq(researcherId)
    await expect(
      payload.find({
        collection: 'user-reports',
        limit: 1,
        overrideAccess: false,
        req: researcherReq,
      }),
    ).rejects.toThrow()
  })

  it('reviewDueAt overdue query excludes future-only drafts without due', async () => {
    const nowIso = new Date().toISOString()
    const overdue = await payload.find({
      collection: 'transactions',
      depth: 0,
      limit: 50,
      overrideAccess: true,
      where: {
        and: [
          { reviewDueAt: { exists: true } },
          { reviewDueAt: { less_than_equal: nowIso } },
          { workflowState: { not_equals: 'archived' } },
        ],
      },
    })
    expect(overdue.docs.some((d) => Number(d.id) === productionTxId)).toBe(true)

    const futureOnly = await payload.find({
      collection: 'transactions',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: {
        and: [
          { id: { equals: draftTxId } },
          { reviewDueAt: { greater_than: nowIso } },
        ],
      },
    })
    expect(futureOnly.docs).toHaveLength(1)
  })

  it('assignment ACL, reassignment, unassignment, and PII-safe audit', async () => {
    const { assertAssignableReportUser } = await import('@/lib/reports/assignment')
    const reviewerReq = await asUserReq(reviewerId)
    const researcherReq = await asUserReq(researcherId)

    await expect(assertAssignableReportUser(payload, researcherId, reviewerReq)).rejects.toThrow(
      /باحث|تعيين|غير قابل/,
    )
    await expect(assertAssignableReportUser(payload, inactiveId, reviewerReq)).rejects.toThrow(
      /غير نشط|تعيين/,
    )
    await expect(assertAssignableReportUser(payload, adminId, reviewerReq)).resolves.toBe(adminId)
    await expect(assertAssignableReportUser(payload, null, reviewerReq)).resolves.toBeNull()

    const assigned = await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { assignedTo: adminId },
      overrideAccess: false,
      req: reviewerReq,
    })
    const assignedVal = assigned.assignedTo
    const assignedId =
      typeof assignedVal === 'object' && assignedVal && 'id' in assignedVal
        ? Number(assignedVal.id)
        : Number(assignedVal)
    expect(assignedId).toBe(adminId)

    await expect(
      payload.update({
        collection: 'user-reports',
        id: reportId,
        data: { assignedTo: reviewerId },
        overrideAccess: false,
        req: researcherReq,
      }),
    ).rejects.toThrow(/not allowed|غير مصرّح|Forbidden/i)

    await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { assignedTo: reviewerId },
      overrideAccess: false,
      req: await asUserReq(reviewerId),
    })

    await payload.update({
      collection: 'user-reports',
      id: reportId,
      data: { assignedTo: null },
      overrideAccess: false,
      req: await asUserReq(reviewerId),
    })

    const audits = await payload.find({
      collection: 'audit-events',
      depth: 0,
      limit: 50,
      overrideAccess: true,
      where: {
        and: [
          { entityType: { equals: 'user-reports' } },
          { entityId: { equals: String(reportId) } },
          { action: { equals: 'report_assigned' } },
        ],
      },
    })
    expect(audits.docs.length).toBeGreaterThanOrEqual(1)
    for (const ev of audits.docs) {
      const meta = JSON.stringify(ev.metadata ?? {})
      expect(meta).not.toMatch(/p11-citizen@|contactEmail|contactPhone/)
      expect(ev.summary).not.toMatch(/@example\.test/)
      created.push({ collection: 'audit-events', id: ev.id })
    }
  })

  it('blocks unsafe hard delete of published transaction; allows never-published draft', async () => {
    const adminReq = await asUserReq(adminId)

    await expect(
      payload.delete({
        collection: 'transactions',
        id: publishedTxId,
        overrideAccess: false,
        req: adminReq,
      }),
    ).rejects.toThrow(/أرشفة|حذف/)

    await payload.delete({
      collection: 'transactions',
      id: draftTxId,
      overrideAccess: false,
      req: adminReq,
    })
    const idx = created.findIndex((c) => c.collection === 'transactions' && c.id === draftTxId)
    if (idx >= 0) created.splice(idx, 1)
  })

  it('seed cleanup can still hard-delete published fixture via explicit seed context', async () => {
    // Delete report first (FK), then published tx with seed bypass.
    await payload.delete({
      collection: 'user-reports',
      id: reportId,
      overrideAccess: true,
      context: { seed: true },
    })
    const idxR = created.findIndex((c) => c.collection === 'user-reports' && c.id === reportId)
    if (idxR >= 0) created.splice(idxR, 1)

    await payload.delete({
      collection: 'transactions',
      id: publishedTxId,
      overrideAccess: true,
      context: { seed: true },
    })
    const idxT = created.findIndex((c) => c.collection === 'transactions' && c.id === publishedTxId)
    if (idxT >= 0) created.splice(idxT, 1)
  })
})

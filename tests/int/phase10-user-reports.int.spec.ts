/**
 * Phase 10 — user reports: public submit, ACL, honeypot, rate limit, triage.
 * Fictional fixtures only.
 */
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { hashReportIdentity } from '@/lib/reports/identity-hash'
import { consumeReportRateLimit } from '@/lib/reports/rate-limit'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { REPORT_RATE_LIMIT } from '@/lib/reports/types'
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
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('Phase 10 user reports integration', () => {
  let stamp: number
  let adminId: number
  let reviewerId: number
  let researcherId: number
  let inactiveId: number
  let categoryId: number
  let agencyId: number
  let serviceCenterId: number
  let documentId: number
  let sourceId: number
  let productionSlug: string
  let productionTxId: number
  let qaTestSlug: string
  let qaTestTxId: number

  it('bootstraps fixtures', async () => {
    stamp = Date.now()
    const admin = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p10-admin-${stamp}@example.test`,
          password: 'TestPassphrase-P10-Admin!',
          role: 'admin',
          name: 'P10 Admin',
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
          email: `p10-reviewer-${stamp}@example.test`,
          password: 'TestPassphrase-P10-Reviewer!',
          role: 'reviewer',
          name: 'P10 Reviewer',
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
          email: `p10-researcher-${stamp}@example.test`,
          password: 'TestPassphrase-P10-Researcher!',
          role: 'researcher',
          name: 'P10 Researcher',
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
          email: `p10-inactive-${stamp}@example.test`,
          password: 'TestPassphrase-P10-Inactive!',
          role: 'reviewer',
          name: 'P10 Inactive',
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
        data: { name: `تصنيف P10 ${stamp}`, slug: `p10-cat-${stamp}`, active: true, _status: 'published' },
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
          name: `جهة P10 ${stamp}`,
          slug: `p10-agency-${stamp}`,
          type: 'ministry',
          active: true,
          _status: 'published',
        },
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
        draft: false,
        data: {
          name: `مركز P10 ${stamp}`,
          slug: `p10-center-${stamp}`,
          agency: agencyId,
          governorate: 'damascus',
          city: 'دمشق',
          address: 'عنوان تجريبي P10',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    serviceCenterId = Number(center.id)

    const document = await track(
      'documents',
      await payload.create({
        collection: 'documents',
        locale: 'ar',
        draft: false,
        data: {
          name: `وثيقة P10 ${stamp}`,
          slug: `p10-doc-${stamp}`,
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
          title: `مصدر P10 ${stamp}`,
          slug: `p10-source-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p10',
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
      key: `p10_claim_${stamp}`,
      sourceId,
      reviewerId,
      contentClass: 'PRODUCTION',
    }).then((c) => track('claims', c))

    const claimBindings = [{ claim: claim.id, required: true, coveredSection: 'summary' as const }]

    productionSlug = `p10-prod-${stamp}`
    const prodTx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: `معاملة إنتاج P10 ${stamp}`,
          slug: productionSlug,
          summary: 'ملخص تجريبي لبلاغات المرحلة العاشرة.',
          category: categoryId,
          agency: agencyId,
          serviceCenters: [serviceCenterId],
          contentClass: 'PRODUCTION',
          claimTrustOk: true,
          claimBindings,
          active: true,
          workflowState: 'published',
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
          steps: [{ title: 'خطوة', description: 'وصف' }],
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    productionTxId = Number(prodTx.id)

    qaTestSlug = `p10-qa-${stamp}`
    const qaTx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: `معاملة QA P10 ${stamp}`,
          slug: qaTestSlug,
          summary: 'يجب ألا تكون قابلة للبلاغ العام.',
          category: categoryId,
          agency: agencyId,
          serviceCenters: [serviceCenterId],
          contentClass: 'QA_TEST',
          claimTrustOk: true,
          claimBindings,
          active: true,
          workflowState: 'published',
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
          steps: [{ title: 'خطوة', description: 'وصف' }],
          _status: 'published',
        } as never,
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    qaTestTxId = Number(qaTx.id)
    expect(productionTxId).toBeGreaterThan(0)
    expect(qaTestTxId).toBeGreaterThan(0)
  })

  it('submits a valid public report for PRODUCTION tx', async () => {
    const validated = validatePublicReportSubmit({
      transactionSlug: productionSlug,
      section: 'fees',
      message: 'الرسوم المذكورة لم تعد مطابقة لما طُلب في المركز اليوم.',
      encountered: 'طلبوا مبلغاً مختلفاً عند الشباك في المركز.',
      consent: true,
      contactEmail: 'followup@example.test',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const identity = hashReportIdentity({
      secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
      ip: `198.51.100.${stamp % 200}`,
    })

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: identity,
    })
    expect(result.ok).toBe(true)

    const listed = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 5,
      overrideAccess: true,
    })
    expect(listed.docs.length).toBeGreaterThan(0)
    const report = listed.docs[0] as {
      id: number
      status: string
      contactEmail?: string | null
      message?: string
    }
    created.push({ collection: 'user-reports', id: report.id })
    expect(report.status).toBe('open')
    expect(report.contactEmail).toBe('followup@example.test')
    expect(String(report.message)).not.toMatch(/</)
  })

  it('rejects arbitrary serviceCenterId not linked to the transaction', async () => {
    const validated = validatePublicReportSubmit({
      transactionSlug: productionSlug,
      section: 'location',
      message: 'محاولة ربط مركز خدمة غير مرتبط بالمعاملة من العميل.',
      encountered: 'اختيار مركز وهمي من خارج قائمة المعاملة.',
      consent: true,
      serviceCenterId: serviceCenterId + 999999,
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: hashReportIdentity({
        secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
        ip: '203.0.113.55',
      }),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('validation')

    const allowed = validatePublicReportSubmit({
      transactionSlug: productionSlug,
      section: 'location',
      message: 'بلاغ مرتبط بمركز الخدمة الصحيح للمعاملة فقط.',
      encountered: 'تم اختيار المركز من قائمة المعاملة العلنية.',
      consent: true,
      serviceCenterId,
    })
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return
    const okResult = await submitPublicUserReport({
      payload,
      data: allowed.data,
      identityHash: hashReportIdentity({
        secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
        ip: '203.0.113.56',
      }),
    })
    expect(okResult.ok).toBe(true)
    const found = await payload.find({
      collection: 'user-reports',
      where: {
        and: [
          { transaction: { equals: productionTxId } },
          { serviceCenter: { equals: serviceCenterId } },
        ],
      },
      limit: 5,
      overrideAccess: true,
    })
    expect(found.docs.length).toBeGreaterThan(0)
  })

  it('rejects QA_TEST transaction as not reportable', async () => {
    const validated = validatePublicReportSubmit({
      transactionSlug: qaTestSlug,
      section: 'other',
      message: 'محاولة بلاغ على معاملة اختبار معزولة عن العامة.',
      encountered: 'ظهرت المعاملة في رابط مباشر غير مؤهل للعامة.',
      consent: true,
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: hashReportIdentity({
        secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
        ip: '203.0.113.9',
      }),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('not_found')
  })

  it('discards honeypot submissions without creating a report', async () => {
    const before = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 100,
      overrideAccess: true,
    })
    const validated = validatePublicReportSubmit({
      transactionSlug: productionSlug,
      section: 'steps',
      message: 'نص يبدو شرعياً لكن الحقل المخفي ممتلئ للروبوتات فقط.',
      encountered: 'محاولة روبوت عبر الحقل المخفي فقط.',
      consent: true,
      website: 'https://bot.example',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.data.honeypotTriggered).toBe(true)

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: hashReportIdentity({
        secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
        ip: '203.0.113.10',
      }),
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.discarded).toBe(true)

    const after = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 100,
      overrideAccess: true,
    })
    expect(after.docs.length).toBe(before.docs.length)
  })

  it('rate-limits repeated submissions for the same identity hash', async () => {
    const identitySameUaA = hashReportIdentity({
      secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
      ip: `203.0.113.${(stamp % 50) + 20}`,
    })
    const identitySameUaB = hashReportIdentity({
      secret: process.env.PAYLOAD_SECRET || 'x'.repeat(32),
      ip: `203.0.113.${(stamp % 50) + 20}`,
    })
    expect(identitySameUaA).toBe(identitySameUaB)
    const identity = identitySameUaA
    expect(identity).not.toContain('203.0.113')

    let blocked = false
    for (let i = 0; i < REPORT_RATE_LIMIT.maxHits + 2; i++) {
      const r = await consumeReportRateLimit(payload, identity)
      if (!r.ok) {
        blocked = true
        expect(r.code).toBe('rate_limited')
        break
      }
    }
    expect(blocked).toBe(true)
  })

  it('denies anonymous list/read/update/delete on user-reports', async () => {
    const anonReq = (await createLocalReq({}, payload)) as PayloadRequest
    anonReq.user = null

    await expect(
      payload.find({
        collection: 'user-reports',
        limit: 1,
        overrideAccess: false,
        req: anonReq,
      }),
    ).rejects.toBeTruthy()

    const existing = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 1,
      overrideAccess: true,
    })
    const reportId = existing.docs[0]?.id
    expect(reportId).toBeTruthy()

    await expect(
      payload.findByID({
        collection: 'user-reports',
        id: reportId!,
        overrideAccess: false,
        req: anonReq,
      }),
    ).rejects.toBeTruthy()

    await expect(
      payload.update({
        collection: 'user-reports',
        id: reportId!,
        data: { status: 'in_review' },
        overrideAccess: false,
        req: anonReq,
      }),
    ).rejects.toBeTruthy()

    await expect(
      payload.delete({
        collection: 'user-reports',
        id: reportId!,
        overrideAccess: false,
        req: anonReq,
      }),
    ).rejects.toBeTruthy()
  })

  it('denies inactive reviewer and researcher; allows active reviewer triage', async () => {
    const existing = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 1,
      overrideAccess: true,
    })
    const reportId = existing.docs[0]?.id
    expect(reportId).toBeTruthy()

    const inactiveUser = await payload.findByID({
      collection: 'users',
      id: inactiveId,
      overrideAccess: true,
    })
    expect(hasActiveRole(inactiveUser as UserLike, 'reviewer')).toBe(false)

    const inactiveReq = (await createLocalReq(
      { user: inactiveUser as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    await expect(
      payload.update({
        collection: 'user-reports',
        id: reportId!,
        data: { status: 'in_review' },
        overrideAccess: false,
        req: inactiveReq,
      }),
    ).rejects.toBeTruthy()

    const researcher = await payload.findByID({
      collection: 'users',
      id: researcherId,
      overrideAccess: true,
    })
    const researcherReq = (await createLocalReq(
      { user: researcher as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    await expect(
      payload.find({
        collection: 'user-reports',
        limit: 1,
        overrideAccess: false,
        req: researcherReq,
      }),
    ).rejects.toBeTruthy()

    const reviewer = await payload.findByID({
      collection: 'users',
      id: reviewerId,
      overrideAccess: true,
    })
    const reviewerReq = (await createLocalReq(
      { user: reviewer as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    const inReview = await payload.update({
      collection: 'user-reports',
      id: reportId!,
      data: { status: 'in_review' },
      overrideAccess: false,
      req: reviewerReq,
    })
    expect(inReview.status).toBe('in_review')

    const reviewerFresh = await payload.findByID({
      collection: 'users',
      id: reviewerId,
      overrideAccess: true,
    })
    const reviewerReq2 = (await createLocalReq(
      { user: reviewerFresh as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    const resolved = await payload.update({
      collection: 'user-reports',
      id: reportId!,
      data: {
        status: 'resolved',
        resolutionSummary: 'تم التحقق من الرسوم مع المصدر الرسمي التجريبي.',
      },
      overrideAccess: false,
      req: reviewerReq2,
    })
    expect(resolved.status).toBe('resolved')
    expect(resolved.resolvedAt).toBeTruthy()
    expect(relationIdLike(resolved.resolvedBy)).toBe(reviewerId)

    const audits = await payload.find({
      collection: 'audit-events',
      where: {
        and: [
          { entityType: { equals: 'user-reports' } },
          { entityId: { equals: String(reportId) } },
        ],
      },
      limit: 20,
      overrideAccess: true,
      sort: 'createdAt',
    })
    for (const a of audits.docs) created.push({ collection: 'audit-events', id: a.id })
    expect(audits.docs.some((d) => d.action === 'report_resolved' || d.action === 'report_in_review')).toBe(
      true,
    )
    const resolvedAudit = audits.docs.find((d) => d.action === 'report_resolved')
    expect(resolvedAudit).toBeTruthy()
    const meta = resolvedAudit?.metadata as { resolutionReason?: string } | undefined
    expect(meta?.resolutionReason).toContain('الرسوم')

    const closedAt = String(resolved.resolvedAt)
    const reviewerReqStay = (await createLocalReq(
      { user: reviewerFresh as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest
    const stay = await payload.update({
      collection: 'user-reports',
      id: reportId!,
      data: {
        status: 'resolved',
        reviewNotes: 'ملاحظة داخلية لاحقًا',
        resolutionSummary: 'محاولة تغيير السبب بعد الإغلاق يجب أن تُرفض ضمنياً',
      },
      overrideAccess: false,
      req: reviewerReqStay,
    })
    expect(String(stay.resolvedAt)).toBe(closedAt)
    expect(String(stay.resolutionSummary)).toContain('الرسوم')
    expect(relationIdLike(stay.resolvedBy)).toBe(reviewerId)

    const reviewerReqReopen = (await createLocalReq(
      { user: reviewerFresh as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest
    const reopened = await payload.update({
      collection: 'user-reports',
      id: reportId!,
      data: { status: 'in_review' },
      overrideAccess: false,
      req: reviewerReqReopen,
    })
    expect(reopened.status).toBe('in_review')
    expect(reopened.resolvedAt).toBeFalsy()
    expect(String(reopened.lastResolutionSummary || reopened.resolutionSummary)).toContain('الرسوم')

    const reviewerReqReresolve = (await createLocalReq(
      { user: reviewerFresh as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest
    const reresolved = await payload.update({
      collection: 'user-reports',
      id: reportId!,
      data: {
        status: 'resolved',
        resolutionSummary: 'إعادة إغلاق بعد مراجعة ثانية للرسوم.',
      },
      overrideAccess: false,
      req: reviewerReqReresolve,
    })
    expect(reresolved.status).toBe('resolved')

    const audits2 = await payload.find({
      collection: 'audit-events',
      where: {
        and: [
          { entityType: { equals: 'user-reports' } },
          { entityId: { equals: String(reportId) } },
          { action: { equals: 'report_resolved' } },
        ],
      },
      limit: 20,
      overrideAccess: true,
    })
    for (const a of audits2.docs) {
      if (!created.some((c) => c.collection === 'audit-events' && c.id === a.id)) {
        created.push({ collection: 'audit-events', id: a.id })
      }
    }
    expect(audits2.docs.length).toBeGreaterThanOrEqual(2)
    const reasons = audits2.docs.map(
      (d) => (d.metadata as { resolutionReason?: string } | null)?.resolutionReason || '',
    )
    expect(reasons.some((r) => r.includes('الرسوم'))).toBe(true)
    expect(reasons.some((r) => r.includes('إعادة إغلاق'))).toBe(true)

    // Original first resolve event remains unchanged (immutable audit row).
    const firstReason = (
      audits2.docs.find((d) =>
        String((d.metadata as { resolutionReason?: string })?.resolutionReason || '').includes(
          'المصدر الرسمي',
        ),
      )?.metadata as { resolutionReason?: string }
    )?.resolutionReason
    expect(firstReason).toContain('المصدر الرسمي')

    const reviewerReq3 = (await createLocalReq(
      { user: reviewerFresh as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    await expect(
      payload.update({
        collection: 'user-reports',
        id: reportId!,
        data: { status: 'rejected' },
        overrideAccess: false,
        req: reviewerReq3,
      }),
    ).rejects.toBeTruthy()
  })

  it('does not expose contact on researcher-denied path; admin can read contact', async () => {
    const withContact = await payload.find({
      collection: 'user-reports',
      where: { transaction: { equals: productionTxId } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    const target = withContact.docs.find(
      (d) => (d as { contactEmail?: string | null }).contactEmail === 'followup@example.test',
    )
    expect(target).toBeTruthy()

    const admin = await payload.findByID({
      collection: 'users',
      id: adminId,
      overrideAccess: true,
    })
    const adminReq = (await createLocalReq(
      { user: admin as NonNullable<PayloadRequest['user']> },
      payload,
    )) as PayloadRequest

    const asAdmin = await payload.findByID({
      collection: 'user-reports',
      id: target!.id,
      depth: 0,
      overrideAccess: false,
      req: adminReq,
    })
    expect((asAdmin as { contactEmail?: string }).contactEmail).toBe('followup@example.test')
  })
})

function relationIdLike(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'id' in v) return Number((v as { id: number }).id)
  return null
}

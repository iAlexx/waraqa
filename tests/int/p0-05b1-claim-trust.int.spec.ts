/**
 * P0-05B1 — claim trust publication gate + dynamic fail-closed (fictional fixtures only).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
import { loadPublicTransactionBySlug } from '@/lib/public/transaction-detail'
import { runTransactionWorkflowAction } from '@/lib/workflow/transaction-workflow'
import { WorkflowError } from '@/lib/workflow/types'

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

describe('P0-05B1 claim trust publication + dynamic revalidation', () => {
  let reviewer: { id: number; role: string; isActive: true; collection: string }
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let claimId: number
  let stamp: number

  it('bootstraps chain', async () => {
    stamp = Date.now()
    const r = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-b1-${stamp}@example.test`,
          password: 'TestPassphrase-P005B1-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer B1',
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
          name: 'تصنيف ب1',
          slug: `cat-b1-${stamp}`,
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
          name: 'جهة ب1',
          slug: `ag-b1-${stamp}`,
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
          name: 'وثيقة ب1',
          slug: `doc-b1-${stamp}`,
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
          title: 'مصدر ب1 موثّق',
          slug: `src-b1-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/b1-official',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(src.id)

    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_${stamp}`,
        sourceId,
        reviewerId: reviewer.id,
      }),
    )
    claimId = Number(claim.id)
  })

  async function createTx(opts: {
    slugSuffix: string
    claimBindings?: Array<{
      claim: number
      required?: boolean
      coveredSection?: 'summary' | 'required_documents' | 'steps' | 'fees' | 'other'
    }>
    workflowState?: 'draft' | 'in_review' | 'approved' | 'published'
  }) {
    return track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `معاملة ب1 ${opts.slugSuffix}`,
          slug: `tx-b1-${opts.slugSuffix}-${stamp}`,
          summary: 'ملخص تجريبي ب1',
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
          claimBindings: opts.claimBindings ?? [
            { claim: claimId, required: true, coveredSection: 'summary' },
          ],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: opts.workflowState ?? 'draft',
          markedOutdated: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }

  it('M: valid required claims can approve and publish', async () => {
    const tx = await createTx({ slugSuffix: 'ok' })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    const published = await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })
    expect((published as { _status?: string })._status).toBe('published')
    expect((published as { claimTrustOk?: boolean }).claimTrustOk).toBe(true)

    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon.totalDocs).toBe(1)
  })

  it('N: blocked required claim cannot approve', async () => {
    const blockedClaim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: false,
        data: {
          key: `claim_b1_blocked_${stamp}`,
          statement: 'ادعاء مسودة محظور للنشر',
          status: 'DRAFT',
          publicationPermission: 'INTERNAL_ONLY',
          evidence: [{ source: sourceId, relationType: 'SUPPORTS' }],
          active: true,
          _status: 'draft',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const tx = await createTx({
      slugSuffix: 'blocked',
      claimBindings: [{ claim: Number(blockedClaim.id), required: true }],
      workflowState: 'in_review',
    })

    await expect(
      runTransactionWorkflowAction({
        payload,
        id: tx.id,
        action: 'approve',
        user: reviewer as never,
      }),
    ).rejects.toBeInstanceOf(WorkflowError)
  })

  it('O: previously published becomes unavailable when claim becomes OUTDATED', async () => {
    const liveClaim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_dyn_${stamp}`,
        sourceId,
        reviewerId: reviewer.id,
        statement: 'ادعاء ديناميكي للسحب',
      }),
    )
    const tx = await createTx({
      slugSuffix: 'dyn-claim',
      claimBindings: [{ claim: Number(liveClaim.id), required: true, coveredSection: 'summary' }],
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })

    await payload.update({
      collection: 'claims',
      id: liveClaim.id,
      data: { status: 'OUTDATED', publicationPermission: 'BLOCKED' },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
      user: reviewer as never,
    })

    const refreshed = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      draft: true,
      overrideAccess: true,
    })
    expect(refreshed.claimTrustOk).toBe(false)

    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon.totalDocs).toBe(0)
  })

  it('P: previously valid claim becomes unsafe when supporting Source untrusted', async () => {
    const src2 = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        data: {
          title: 'مصدر ب1 ثانٍ',
          slug: `src-b1-p-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/b1-p-official',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const liveClaim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_src_${stamp}`,
        sourceId: Number(src2.id),
        reviewerId: reviewer.id,
      }),
    )
    const tx = await createTx({
      slugSuffix: 'dyn-src',
      claimBindings: [{ claim: Number(liveClaim.id), required: true }],
    })
    // Cover section evidence also needs the original verified source for section gate.
    await payload.update({
      collection: 'transactions',
      id: tx.id,
      locale: 'ar',
      data: {
        sources: [
          {
            source: sourceId,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
      },
      draft: true,
      overrideAccess: true,
      context: seedCtx,
    })

    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })

    await payload.update({
      collection: 'sources',
      id: src2.id,
      data: { verificationStatus: 'outdated' },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
    })

    const refreshed = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      draft: true,
      overrideAccess: true,
    })
    expect(refreshed.claimTrustOk).toBe(false)

    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
    })
    expect(anon.totalDocs).toBe(0)
  })

  async function forceStaleClaimTrustOk(transactionId: number | string) {
    await payload.update({
      collection: 'transactions',
      id: transactionId,
      data: { claimTrustOk: true },
      draft: false,
      overrideAccess: true,
      context: { claimTrustRecompute: true },
      user: reviewer as never,
    })
    const row = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      draft: true,
      overrideAccess: true,
      user: reviewer as never,
    })
    expect(row.claimTrustOk).toBe(true)
  }

  it('A/B: live public fails closed when claimTrustOk is stale true after Claim becomes unsafe', async () => {
    const liveClaim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_stale_${stamp}`,
        sourceId,
        reviewerId: reviewer.id,
      }),
    )
    const tx = await createTx({
      slugSuffix: 'stale-claim',
      claimBindings: [{ claim: Number(liveClaim.id), required: true, coveredSection: 'summary' }],
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })

    const slug = `tx-b1-stale-claim-${stamp}`
    const before = await loadPublicTransactionBySlug(slug)
    expect(before.ok).toBe(true)

    await payload.update({
      collection: 'claims',
      id: liveClaim.id,
      data: { status: 'OUTDATED', publicationPermission: 'BLOCKED' },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
    })
    // Simulate recompute bypass / stale denormalized flag.
    await forceStaleClaimTrustOk(tx.id)

    const stored = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      draft: true,
      overrideAccess: true,
      user: reviewer as never,
    })
    expect(stored.claimTrustOk).toBe(true)
    expect(await liveEvaluatePublicTransactionClaimTrust(payload, stored as never)).toBe(false)

    const after = await loadPublicTransactionBySlug(slug)
    expect(after.ok).toBe(false)

    // Anonymous Local find may still match the claimTrustOk prefilter; live gate must hide content.
    const anon = await payload.find({
      collection: 'transactions',
      where: { id: { equals: tx.id } },
      overrideAccess: false,
      user: undefined,
      depth: 0,
    })
    const anonDoc = anon.docs[0] as unknown as Record<string, unknown> | undefined
    if (anonDoc) {
      expect(await liveEvaluatePublicTransactionClaimTrust(payload, anonDoc)).toBe(false)
    }
  })

  it('C: claimTrustOk false + valid live claims remains non-public', async () => {
    const tx = await createTx({
      slugSuffix: 'stored-false',
      claimBindings: [{ claim: claimId, required: true, coveredSection: 'summary' }],
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })

    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: { claimTrustOk: false },
      draft: false,
      overrideAccess: true,
      context: { claimTrustRecompute: true },
      user: reviewer as never,
    })

    const row = await payload.findByID({
      collection: 'transactions',
      id: tx.id,
      draft: true,
      overrideAccess: true,
      user: reviewer as never,
    })
    // Live graph is still authoritative, but stored false must win.
    const graphOk = await liveEvaluatePublicTransactionClaimTrust(payload, {
      ...(row as object),
      claimTrustOk: true,
    } as never)
    expect(graphOk).toBe(true)
    expect(await liveEvaluatePublicTransactionClaimTrust(payload, row as never)).toBe(false)
    expect((await loadPublicTransactionBySlug(`tx-b1-stored-false-${stamp}`)).ok).toBe(false)
  })

  it('D: claimTrustOk true + missing bound Claim → non-public', async () => {
    const doomed = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_doomed_${stamp}`,
        sourceId,
        reviewerId: reviewer.id,
      }),
    )
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: 'معاملة ب1 ادعاء مفقود',
          slug: `tx-b1-missing-claim-${stamp}`,
          summary: 'ملخص',
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
          claimBindings: [{ claim: Number(doomed.id), required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
          claimTrustOk: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    await payload.delete({
      collection: 'claims',
      id: doomed.id,
      overrideAccess: true,
    })

    expect(
      await liveEvaluatePublicTransactionClaimTrust(payload, {
        claimTrustOk: true,
        claimBindings: [{ claim: Number(doomed.id), required: true }],
      }),
    ).toBe(false)
    expect((await loadPublicTransactionBySlug(`tx-b1-missing-claim-${stamp}`)).ok).toBe(false)
  })

  it('E: claimTrustOk true + WARNING_ONLY required Claim → non-public', async () => {
    const warnClaim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: false,
        data: {
          key: `claim_b1_warn_${stamp}`,
          statement: 'ادعاء تحذيري فقط',
          status: 'UNKNOWN',
          publicationPermission: 'PUBLIC_WITH_WARNING',
          evidence: [{ source: sourceId, relationType: 'SUPPORTS' }],
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: 'معاملة ب1 تحذير فقط',
          slug: `tx-b1-warn-only-${stamp}`,
          summary: 'ملخص',
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
          claimBindings: [{ claim: Number(warnClaim.id), required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
          claimTrustOk: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    expect((await loadPublicTransactionBySlug(`tx-b1-warn-only-${stamp}`)).ok).toBe(false)
  })

  it('F: claimTrustOk stale true + authoritative Claim but Source newly unverified → non-public', async () => {
    const srcF = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        data: {
          title: 'مصدر ب1 F',
          slug: `src-b1-f-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/b1-f-official',
          verificationStatus: 'verified',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const liveClaim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_b1_f_${stamp}`,
        sourceId: Number(srcF.id),
        reviewerId: reviewer.id,
      }),
    )
    const tx = await createTx({
      slugSuffix: 'stale-src',
      claimBindings: [{ claim: Number(liveClaim.id), required: true, coveredSection: 'summary' }],
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'submitForReview',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'approve',
      user: reviewer as never,
    })
    await runTransactionWorkflowAction({
      payload,
      id: tx.id,
      action: 'publish',
      user: reviewer as never,
    })

    expect((await loadPublicTransactionBySlug(`tx-b1-stale-src-${stamp}`)).ok).toBe(true)

    await payload.update({
      collection: 'sources',
      id: srcF.id,
      data: { verificationStatus: 'needs_review' },
      draft: false,
      overrideAccess: true,
      context: seedCtx,
    })
    await forceStaleClaimTrustOk(tx.id)

    expect((await loadPublicTransactionBySlug(`tx-b1-stale-src-${stamp}`)).ok).toBe(false)
  })

  it('QA overrideAccess claimTrustOk=true alone cannot bypass live public trust', async () => {
    await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: 'معاملة ب1 تجاوز وهمي',
          slug: `tx-b1-override-trust-${stamp}`,
          summary: 'ملخص',
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
          claimBindings: [],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
          claimTrustOk: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    expect((await loadPublicTransactionBySlug(`tx-b1-override-trust-${stamp}`)).ok).toBe(false)
  })
})

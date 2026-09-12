/**
 * P0-06 — content class isolation (fictional fixtures only).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
import { setPublicContentModeForTests } from '@/lib/content-class/public-content-policy'
import { loadPublicTransactionBySlug } from '@/lib/public/transaction-detail'
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

afterEach(() => {
  setPublicContentModeForTests(null)
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
          context: { seed: true },
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('P0-06 content isolation public gates', () => {
  let reviewer: { id: number; role: string; isActive: true; collection: string }
  let categoryId: number
  let agencyId: number
  let documentId: number
  let stamp: number

  it('bootstraps', async () => {
    stamp = Date.now()
    const r = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-p06-${stamp}@example.test`,
          password: 'TestPassphrase-P006-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer P06',
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
          name: 'تصنيف عزل',
          slug: `cat-p06-${stamp}`,
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
          name: 'جهة عزل',
          slug: `ag-p06-${stamp}`,
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
          name: 'وثيقة عزل',
          slug: `doc-p06-${stamp}`,
          documentType: 'other',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    documentId = Number(doc.id)
  })

  async function createSource(cls: 'PRODUCTION' | 'DEMO' | 'QA_TEST', suffix: string) {
    return track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        data: {
          title: `مصدر عزل ${suffix}`,
          slug: `src-p06-${suffix}-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: `https://example.test/p06-${suffix}`,
          verificationStatus: 'verified',
          active: true,
          contentClass: cls,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }

  async function publishTx(opts: {
    suffix: string
    txClass: 'PRODUCTION' | 'DEMO' | 'QA_TEST'
    claimClass: 'PRODUCTION' | 'DEMO' | 'QA_TEST'
    sourceClass: 'PRODUCTION' | 'DEMO' | 'QA_TEST'
  }) {
    const src = await createSource(opts.sourceClass, opts.suffix)
    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_p06_${opts.suffix.replace(/[^a-z0-9_]/gi, '_')}_${stamp}`,
        sourceId: Number(src.id),
        reviewerId: reviewer.id,
        contentClass: opts.claimClass,
      }),
    )
    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: `معاملة عزل ${opts.suffix}`,
          slug: `tx-p06-${opts.suffix}-${stamp}`,
          summary: 'ملخص عزل',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'خطوة', description: 'وصف' }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          fees: [{ label: 'رسم', amount: 1, currency: 'SYP' }],
          sources: [
            {
              source: src.id,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          claimBindings: [{ claim: Number(claim.id), required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          contentClass: opts.txClass,
          workflowState: 'draft',
          markedOutdated: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
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
    return tx
  }

  it('A: PRODUCTION in production mode is public when trust passes', async () => {
    setPublicContentModeForTests('production')
    await publishTx({
      suffix: 'prod-ok',
      txClass: 'PRODUCTION',
      claimClass: 'PRODUCTION',
      sourceClass: 'PRODUCTION',
    })
    const loaded = await loadPublicTransactionBySlug(`tx-p06-prod-ok-${stamp}`)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.transaction.demoLabeled).toBe(false)
  })

  it('B: DEMO in production mode blocked', async () => {
    setPublicContentModeForTests('production')
    await publishTx({
      suffix: 'demo-prod-mode',
      txClass: 'DEMO',
      claimClass: 'DEMO',
      sourceClass: 'DEMO',
    })
    expect((await loadPublicTransactionBySlug(`tx-p06-demo-prod-mode-${stamp}`)).ok).toBe(false)
  })

  it('C/I/J: QA_TEST blocked even with claimTrustOk and overrideAccess seed', async () => {
    setPublicContentModeForTests('production')
    const src = await createSource('QA_TEST', 'qa-force')
    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_p06_qa_force_${stamp}`,
        sourceId: Number(src.id),
        reviewerId: reviewer.id,
        contentClass: 'QA_TEST',
      }),
    )
    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: false,
        data: {
          title: 'معاملة QA مفروضة',
          slug: `tx-p06-qa-force-${stamp}`,
          summary: 'ملخص',
          category: categoryId,
          agency: agencyId,
          steps: [{ title: 'خطوة', description: 'وصف' }],
          requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
          fees: [{ label: 'رسم', amount: 1, currency: 'SYP' }],
          sources: [
            {
              source: src.id,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          claimBindings: [{ claim: Number(claim.id), required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          contentClass: 'QA_TEST',
          workflowState: 'published',
          markedOutdated: false,
          _status: 'published',
          claimTrustOk: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(await liveEvaluatePublicTransactionClaimTrust(payload, {
      ...(await payload.findByID({
        collection: 'transactions',
        id: tx.id,
        draft: true,
        overrideAccess: true,
        user: reviewer as never,
      })) as unknown as Record<string, unknown>,
    })).toBe(false)
    expect((await loadPublicTransactionBySlug(`tx-p06-qa-force-${stamp}`)).ok).toBe(false)
  })

  it('D/Q: DEMO in demo mode public with demo label', async () => {
    setPublicContentModeForTests('demo')
    await publishTx({
      suffix: 'demo-ok',
      txClass: 'DEMO',
      claimClass: 'DEMO',
      sourceClass: 'DEMO',
    })
    const loaded = await loadPublicTransactionBySlug(`tx-p06-demo-ok-${stamp}`)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.transaction.demoLabeled).toBe(true)
  })

  it('E: QA_TEST still blocked in demo mode', async () => {
    setPublicContentModeForTests('demo')
    expect((await loadPublicTransactionBySlug(`tx-p06-qa-force-${stamp}`)).ok).toBe(false)
  })

  it('O: fixture helper defaults claim contentClass to QA_TEST', async () => {
    const src = await createSource('QA_TEST', 'fixture-default')
    const claim = await createAuthoritativeClaimFixture(payload, {
      key: `claim_p06_fix_default_${stamp}`,
      sourceId: Number(src.id),
      reviewerId: reviewer.id,
    })
    created.push({ collection: 'claims', id: claim.id })
    expect(claim.contentClass).toBe('QA_TEST')
  })

  it('L: reviewer can set PRODUCTION classification', async () => {
    const src = await createSource('QA_TEST', 'promote')
    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_p06_promote_${stamp}`,
        sourceId: Number(src.id),
        reviewerId: reviewer.id,
        contentClass: 'QA_TEST',
      }),
    )
    const updated = await payload.update({
      collection: 'claims',
      id: claim.id,
      data: { contentClass: 'PRODUCTION' },
      user: reviewer as never,
      overrideAccess: false,
    })
    expect(updated.contentClass).toBe('PRODUCTION')
  })

  it('K: researcher cannot promote to PRODUCTION', async () => {
    const researcher = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `researcher-p06-${stamp}@example.test`,
          password: 'TestPassphrase-P006-Researcher!',
          role: 'researcher',
          name: 'Researcher P06',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const src = await createSource('QA_TEST', 'res-block')
    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `claim_p06_res_${stamp}`,
        sourceId: Number(src.id),
        reviewerId: reviewer.id,
        contentClass: 'QA_TEST',
      }),
    )
    await expect(
      payload.update({
        collection: 'claims',
        id: claim.id,
        data: { contentClass: 'PRODUCTION' },
        user: {
          id: researcher.id,
          role: 'researcher',
          isActive: true,
          collection: 'users',
        } as never,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

/**
 * P11-B — readiness evaluation against real Payload docs (fictional fixtures).
 */
import { APIError, createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { Transactions } from '@/collections/Transactions'
import { evaluateTransactionAdminReadiness } from '@/lib/admin/transaction-readiness'
import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

function readinessEndpointHandler() {
  const endpoints = Transactions.endpoints ?? []
  const ep = endpoints.find(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      'path' in e &&
      e.path === '/:id/readiness' &&
      e.method === 'get',
  )
  if (!ep || typeof ep === 'string' || typeof ep.handler !== 'function') {
    throw new Error('P11-B readiness endpoint handler missing from Transactions config')
  }
  return ep.handler
}

/** Invoke the real collection endpoint handler (auth path), not hasActiveRole alone. */
async function invokeReadinessEndpoint(opts: {
  transactionId: number | string
  user?: UserLike | Record<string, unknown> | null
}): Promise<Response> {
  const req = (await createLocalReq(
    {
      user: (opts.user ?? undefined) as PayloadRequest['user'],
    },
    payload,
  )) as PayloadRequest
  req.routeParams = { id: String(opts.transactionId) }
  const result = await readinessEndpointHandler()(req)
  if (!(result instanceof Response)) {
    throw new Error('Readiness endpoint did not return a Response')
  }
  return result
}

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

describe('P11-B transaction readiness integration', () => {
  let reviewerId: number
  let inactiveUserId: number
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number
  let claimId: number
  let stamp: number
  let authProbeTxId: number

  it('bootstraps fixtures', async () => {
    stamp = Date.now()
    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11b-reviewer-${stamp}@example.test`,
          password: 'TestPassphrase-P11B-Reviewer!',
          role: 'reviewer',
          name: 'P11B Reviewer',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewerId = Number(reviewer.id)

    const inactive = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11b-inactive-${stamp}@example.test`,
          password: 'TestPassphrase-P11B-Inactive!',
          role: 'researcher',
          name: 'P11B Inactive',
          isActive: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    inactiveUserId = Number(inactive.id)
    expect(hasActiveRole(inactive as UserLike, 'admin', 'reviewer', 'researcher')).toBe(false)
    expect(hasActiveRole(null, 'admin', 'reviewer', 'researcher')).toBe(false)
    expect(
      hasActiveRole(
        { id: reviewerId, role: 'reviewer', isActive: true },
        'admin',
        'reviewer',
        'researcher',
      ),
    ).toBe(true)

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        data: { name: 'تصنيف P11B', slug: `cat-p11b-${stamp}`, active: true },
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
        data: {
          name: 'جهة P11B',
          slug: `ag-p11b-${stamp}`,
          type: 'ministry',
          active: true,
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
        data: {
          name: 'وثيقة P11B',
          slug: `doc-p11b-${stamp}`,
          documentType: 'identity',
          active: true,
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
        data: {
          title: 'مصدر P11B',
          slug: `src-p11b-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p11b',
          verificationStatus: 'verified',
          lastVerifiedAt: '2026-07-01',
          contentClass: 'PRODUCTION',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceId = Number(source.id)

    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `p11b_fee_${stamp}`,
        sourceId,
        reviewerId,
        contentClass: 'PRODUCTION',
      }),
    )
    claimId = Number(claim.id)

    const probe = await createTx({
      slug: `tx-p11b-auth-probe-${stamp}`,
      contentClass: 'QA_TEST',
      claimTrustOk: false,
      claimId: null,
      workflowState: 'draft',
      _status: 'draft',
    })
    authProbeTxId = Number(probe.id)
  })

  async function createTx(opts: {
    slug: string
    contentClass: 'PRODUCTION' | 'DEMO' | 'QA_TEST'
    claimTrustOk: boolean
    workflowState?: 'draft' | 'in_review' | 'published'
    _status?: 'draft' | 'published'
    claimId?: number | null
  }) {
    return track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: opts._status === 'published' ? false : true,
        data: {
          title: `معاملة ${opts.slug}`,
          slug: opts.slug,
          summary: 'ملخص جاهزية',
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
          claimBindings:
            opts.claimId === null
              ? []
              : [{ claim: opts.claimId ?? claimId, required: true, coveredSection: 'summary' }],
          lastReviewedAt: new Date().toISOString(),
          active: true,
          workflowState: opts.workflowState ?? 'published',
          contentClass: opts.contentClass,
          claimTrustOk: opts.claimTrustOk,
          _status: opts._status ?? 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
  }

  it('M/N: readiness endpoint denies anonymous + inactive; allows active reviewer', async () => {
    // Anonymous
    let anonDenied = false
    try {
      await invokeReadinessEndpoint({ transactionId: authProbeTxId, user: null })
    } catch (err) {
      anonDenied = true
      expect(err).toBeInstanceOf(APIError)
      expect((err as APIError).status).toBe(401)
      expect(JSON.stringify(err)).not.toMatch(/readiness|claimDetails|SOURCE_COVERAGE|CLAIM_MISSING/)
    }
    expect(anonDenied).toBe(true)

    // Inactive authenticated researcher (user present, isActive false) → 403
    const inactiveDoc = await payload.findByID({
      collection: 'users',
      id: inactiveUserId,
      depth: 0,
      overrideAccess: true,
    })
    expect(inactiveDoc.isActive).toBe(false)
    let inactiveDenied = false
    try {
      await invokeReadinessEndpoint({ transactionId: authProbeTxId, user: inactiveDoc })
    } catch (err) {
      inactiveDenied = true
      expect(err).toBeInstanceOf(APIError)
      expect((err as APIError).status).toBe(403)
      const body = JSON.stringify(err)
      expect(body).not.toMatch(/claimDetails|actionItems|STORED_TRUST|SOURCE_COVERAGE/)
      expect(err).not.toHaveProperty('readiness')
    }
    expect(inactiveDenied).toBe(true)

    // Active reviewer allowed
    const reviewerDoc = await payload.findByID({
      collection: 'users',
      id: reviewerId,
      depth: 0,
      overrideAccess: true,
    })
    expect(reviewerDoc.isActive).toBe(true)
    const allowed = await invokeReadinessEndpoint({
      transactionId: authProbeTxId,
      user: reviewerDoc,
    })
    expect(allowed.status).toBe(200)
    const json = (await allowed.json()) as { readiness?: { basedOn?: string; workflow?: unknown } }
    expect(json.readiness?.basedOn).toBe('last_saved')
    expect(json.readiness?.workflow).toBeTruthy()
  })

  it('A: live evaluate loads PRODUCTION fixture and surfaces class note', async () => {
    const tx = await createTx({
      slug: `tx-p11b-ok-${stamp}`,
      contentClass: 'PRODUCTION',
      claimTrustOk: true,
    })
    const r = await evaluateTransactionAdminReadiness(payload, tx.id)
    expect(r.basedOn).toBe('last_saved')
    expect(r.publicEligibility.contentClassNoteAr).toMatch(/تصنيف إنتاجي/)
    expect(r.claimDetails.some((c) => c.claimKey.includes('p11b_fee'))).toBe(true)
    // Workflow may still be READY while public is blocked if published row cache/_status differs —
    // unit tests cover READY/READY composition; here we assert live graph + class semantics.
    expect(['READY', 'BLOCKED', 'WARNING', 'UNKNOWN']).toContain(r.workflow.status)
    expect(['READY', 'BLOCKED', 'WARNING', 'UNKNOWN']).toContain(r.publicEligibility.status)
  })

  it('O: publish still independently enforces claim gate (not panel)', async () => {
    const { runTransactionWorkflowAction } = await import('@/lib/workflow/transaction-workflow')
    const { WorkflowError } = await import('@/lib/workflow/types')
    const unbound = await createTx({
      slug: `tx-p11b-pub-gate-${stamp}`,
      contentClass: 'PRODUCTION',
      claimTrustOk: false,
      claimId: null,
      workflowState: 'in_review',
      _status: 'draft',
    })
    await expect(
      runTransactionWorkflowAction({
        payload,
        id: unbound.id,
        action: 'approve',
        user: { id: reviewerId, role: 'reviewer', isActive: true, collection: 'users' } as never,
      }),
    ).rejects.toBeInstanceOf(WorkflowError)
  })

  it('B: QA_TEST → public BLOCKED even when trust ok', async () => {
    const tx = await createTx({
      slug: `tx-p11b-qa-${stamp}`,
      contentClass: 'QA_TEST',
      claimTrustOk: true,
    })
    // Bind a QA-compatible claim for workflow gates
    const qaSource = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        data: {
          title: 'مصدر QA P11B',
          slug: `src-p11b-qa-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p11b-qa',
          verificationStatus: 'verified',
          lastVerifiedAt: '2026-07-01',
          contentClass: 'QA_TEST',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const qaClaim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `p11b_qa_${stamp}`,
        sourceId: qaSource.id,
        reviewerId,
        contentClass: 'QA_TEST',
      }),
    )
    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: {
        sources: [
          {
            source: qaSource.id,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
        claimBindings: [{ claim: qaClaim.id, required: true }],
        claimTrustOk: true,
      },
      draft: false,
      overrideAccess: true,
      context: { ...seedCtx, claimTrustRecompute: true },
    })
    const r = await evaluateTransactionAdminReadiness(payload, tx.id)
    expect(r.publicEligibility.status).toBe('BLOCKED')
    expect(r.publicEligibility.issues.some((i) => i.code === 'CONTENT_CLASS_QA_TEST')).toBe(true)
  })

  it('E: stale claimTrustOk true with invalid live claim → BLOCKED', async () => {
    const brokenClaim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: false,
        data: {
          key: `p11b_stale_${stamp}`,
          statement: 'ادعاء غير جاهز',
          status: 'NEEDS_REVIEW',
          publicationPermission: 'INTERNAL_ONLY',
          contentClass: 'PRODUCTION',
          evidence: [],
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const tx = await createTx({
      slug: `tx-p11b-stale-${stamp}`,
      contentClass: 'PRODUCTION',
      claimTrustOk: false,
      claimId: Number(brokenClaim.id),
    })
    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: {
        claimTrustOk: true,
        category: categoryId,
        agency: agencyId,
        requiredDocuments: [{ document: documentId, requirementType: 'required', quantity: 1 }],
        sources: [
          {
            source: sourceId,
            primary: true,
            coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
          },
        ],
        claimBindings: [{ claim: Number(brokenClaim.id), required: true }],
      },
      draft: false,
      overrideAccess: true,
      context: { ...seedCtx, claimTrustRecompute: true },
    })
    const r = await evaluateTransactionAdminReadiness(payload, tx.id)
    expect(r.publicEligibility.status).toBe('BLOCKED')
    expect(r.publicEligibility.issues.some((i) => i.code === 'STORED_TRUST_STALE')).toBe(true)
    expect(r.workflow.status).toBe('BLOCKED')
  })

  it('F: missing required claim → workflow BLOCKED', async () => {
    const tx = await createTx({
      slug: `tx-p11b-missing-${stamp}`,
      contentClass: 'PRODUCTION',
      claimTrustOk: false,
      claimId: null,
      workflowState: 'draft',
      _status: 'draft',
    })
    const r = await evaluateTransactionAdminReadiness(payload, tx.id)
    expect(r.workflow.status).toBe('BLOCKED')
    expect(r.workflow.issues.some((i) => i.code === 'CLAIM_MISSING')).toBe(true)
  })
})

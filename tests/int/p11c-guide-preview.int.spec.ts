/**
 * P11-C — Admin guide-preview endpoint + mutation safety (fictional fixtures).
 */
import {
  APIError,
  createLocalReq,
  getPayload,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { Transactions } from '@/collections/Transactions'
import { evaluateTransactionGuidePreview } from '@/lib/admin/guide-preview'
import config from '@/payload.config'
import { createAuthoritativeClaimFixture } from '../helpers/claim-trust-fixture'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

function endpointHandler(method: 'get' | 'post') {
  const endpoints = Array.isArray(Transactions.endpoints) ? Transactions.endpoints : []
  const ep = endpoints.find(
    (e: { path?: string; method?: string; handler?: unknown }) =>
      typeof e === 'object' &&
      e !== null &&
      e.path === '/:id/guide-preview' &&
      e.method === method,
  )
  if (!ep || typeof ep === 'string' || typeof ep.handler !== 'function') {
    throw new Error(`guide-preview ${method} handler missing`)
  }
  return ep.handler
}

async function invokeGuidePreview(opts: {
  method: 'get' | 'post'
  transactionId: number | string
  user?: UserLike | Record<string, unknown> | null
  answers?: unknown
}): Promise<Response> {
  const req = (await createLocalReq(
    opts.user ? { user: opts.user as NonNullable<PayloadRequest['user']> } : {},
    payload,
  )) as PayloadRequest
  if (!opts.user) {
    req.user = null
  }
  req.routeParams = { id: String(opts.transactionId) }
  if (opts.method === 'post') {
    req.json = async () => ({ answers: opts.answers ?? {} })
  }
  const result = await endpointHandler(opts.method)(req)
  if (!(result instanceof Response)) throw new Error('Expected Response')
  return result
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
          context: { seed: true },
        })
      } catch {
        /* ignore */
      }
    }
  }
})

describe('P11-C guide preview integration', () => {
  let stamp: number
  let reviewerId: number
  let researcherId: number
  let inactiveUserId: number
  let txId: number
  let categoryId: number
  let agencyId: number
  let documentId: number
  let sourceId: number

  it('bootstraps fixtures', async () => {
    stamp = Date.now()
    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `p11c-reviewer-${stamp}@example.test`,
          password: 'TestPassphrase-P11C-Reviewer!',
          role: 'reviewer',
          name: 'P11C Reviewer',
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
          email: `p11c-researcher-${stamp}@example.test`,
          password: 'TestPassphrase-P11C-Researcher!',
          role: 'researcher',
          name: 'P11C Researcher',
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
          email: `p11c-inactive-${stamp}@example.test`,
          password: 'TestPassphrase-P11C-Inactive!',
          role: 'researcher',
          name: 'P11C Inactive',
          isActive: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    inactiveUserId = Number(inactive.id)
    expect(hasActiveRole(inactive as UserLike, 'admin', 'reviewer', 'researcher')).toBe(false)

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        data: { name: 'تصنيف P11C', slug: `cat-p11c-${stamp}`, active: true },
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
          name: 'جهة P11C',
          slug: `ag-p11c-${stamp}`,
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
          name: 'وثيقة P11C',
          slug: `doc-p11c-${stamp}`,
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
          title: 'مصدر P11C',
          slug: `src-p11c-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/p11c',
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
    sourceId = Number(source.id)

    const claim = await track(
      'claims',
      await createAuthoritativeClaimFixture(payload, {
        key: `p11c_claim_${stamp}`,
        sourceId,
        reviewerId,
        contentClass: 'QA_TEST',
      }),
    )

    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة معاينة P11C',
          slug: `tx-p11c-${stamp}`,
          summary: 'ملخص معاينة',
          category: categoryId,
          agency: agencyId,
          contentClass: 'QA_TEST',
          claimTrustOk: false,
          workflowState: 'draft',
          _status: 'draft',
          active: true,
          guideEnabled: true,
          lastReviewedAt: new Date().toISOString(),
          requiredDocuments: [
            {
              key: 'doc_id',
              document: documentId,
              requirementType: 'required',
              quantity: 1,
            },
          ],
          steps: [{ key: 'step_prepare', title: 'حضّر', description: 'وصف' }],
          fees: [{ key: 'fee_base', label: 'رسم', amount: 10, currency: 'SYP' }],
          sources: [
            {
              source: sourceId,
              primary: true,
              coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
            },
          ],
          claimBindings: [{ claim: claim.id, required: true, coveredSection: 'summary' }],
          questions: [
            {
              key: 'age_group',
              questionType: 'boolean',
              prompt: 'هل أنت بالغ؟',
              required: true,
              active: true,
              options: [],
            },
            {
              key: 'issuance',
              questionType: 'single',
              prompt: 'نوع المعاملة؟',
              required: true,
              active: true,
              options: [
                { key: 'first_time', label: 'أول مرة' },
                { key: 'renewal', label: 'تجديد' },
              ],
            },
            {
              key: 'needs',
              questionType: 'multi',
              prompt: 'احتياجات؟',
              required: false,
              active: true,
              options: [
                { key: 'urgent', label: 'مستعجل' },
                { key: 'mail', label: 'بريد' },
              ],
            },
          ],
          variants: [
            { key: 'variant_first', title: 'إصدار أول مرة', active: true },
            { key: 'variant_renewal', title: 'تجديد', active: true },
          ],
          notices: [
            {
              key: 'notice_urgent',
              title: 'مستعجل',
              body: 'تنبيه مستعجل.',
              severity: 'warning',
              active: true,
            },
          ],
          decisionRules: [
            {
              key: 'rule_first',
              priority: 10,
              active: true,
              explanation: 'أول مرة',
              when: {
                all: [{ questionKey: 'issuance', operator: 'equals', value: 'first_time' }],
              },
              effects: [
                { type: 'selectVariant', targetKey: 'variant_first' },
              ],
            },
            {
              key: 'rule_renewal',
              priority: 20,
              active: true,
              explanation: 'تجديد',
              when: {
                all: [{ questionKey: 'issuance', operator: 'equals', value: 'renewal' }],
              },
              effects: [{ type: 'selectVariant', targetKey: 'variant_renewal' }],
            },
            {
              key: 'rule_urgent',
              priority: 30,
              active: true,
              explanation: 'مستعجل',
              when: {
                all: [{ questionKey: 'needs', operator: 'includes', value: 'urgent' }],
              },
              effects: [{ type: 'includeNotice', targetKey: 'notice_urgent' }],
            },
          ],
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    txId = Number(tx.id)
  })

  it('A: active reviewer can preview', async () => {
    const reviewer = await payload.findByID({
      collection: 'users',
      id: reviewerId,
      overrideAccess: true,
      context: { seed: true },
    })
    const res = await invokeGuidePreview({
      method: 'post',
      transactionId: txId,
      user: reviewer,
      answers: { age_group: 'yes', issuance: 'first_time' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { preview: { evaluationState: string; firedRuleKeys: string[] } }
    expect(json.preview.evaluationState).toBe('ready')
    expect(json.preview.firedRuleKeys).toContain('rule_first')
  })

  it('B: active researcher can preview (GET catalog)', async () => {
    const researcher = await payload.findByID({
      collection: 'users',
      id: researcherId,
      overrideAccess: true,
      context: { seed: true },
    })
    const res = await invokeGuidePreview({
      method: 'get',
      transactionId: txId,
      user: researcher,
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { preview: { questions: unknown[]; basedOn: string } }
    expect(json.preview.basedOn).toBe('last_saved')
    expect(json.preview.questions.length).toBeGreaterThan(0)
  })

  it('C: anonymous denied', async () => {
    await expect(
      invokeGuidePreview({ method: 'post', transactionId: txId, user: null, answers: {} }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('D: inactive user denied', async () => {
    const inactive = await payload.findByID({
      collection: 'users',
      id: inactiveUserId,
      overrideAccess: true,
      context: { seed: true },
    })
    await expect(
      invokeGuidePreview({
        method: 'post',
        transactionId: txId,
        user: inactive,
        answers: { age_group: 'yes' },
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('E/F/G: boolean/single/multi fire expected rules via evaluate helper', async () => {
    const single = await evaluateTransactionGuidePreview(payload, txId, {
      age_group: 'yes',
      issuance: 'first_time',
    })
    expect('error' in single).toBe(false)
    if ('error' in single) return
    expect(single.firedRuleKeys).toContain('rule_first')
    expect(single.variant?.key).toBe('variant_first')

    const multi = await evaluateTransactionGuidePreview(payload, txId, {
      age_group: 'yes',
      issuance: 'renewal',
      needs: ['urgent'],
    })
    expect('error' in multi).toBe(false)
    if ('error' in multi) return
    expect(multi.firedRuleKeys).toEqual(expect.arrayContaining(['rule_renewal', 'rule_urgent']))
    expect(multi.notices.some((n) => n.key === 'notice_urgent')).toBe(true)
  })

  it('H/I/J/K: incomplete + sanitization', async () => {
    const incomplete = await evaluateTransactionGuidePreview(payload, txId, {
      age_group: 'yes',
    })
    expect('error' in incomplete).toBe(false)
    if ('error' in incomplete) return
    expect(incomplete.evaluationState).toBe('incomplete')

    const bad = await evaluateTransactionGuidePreview(payload, txId, {
      age_group: 'yes',
      issuance: 'nope',
      ghost: 'yes',
      needs: ['urgent', 'ghost_opt'],
    })
    expect('error' in bad).toBe(false)
    if ('error' in bad) return
    expect(bad.sanitizedAnswers.issuance).toBeUndefined()
    expect(bad.sanitizedAnswers.ghost).toBeUndefined()
    expect(bad.sanitizedAnswers.needs).toEqual(['urgent'])
  })

  it('P/Q: preview does not mutate transaction / workflow fields', async () => {
    const before = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      depth: 0,
      overrideAccess: true,
      context: { seed: true },
    })
    const reviewer = await payload.findByID({
      collection: 'users',
      id: reviewerId,
      overrideAccess: true,
      context: { seed: true },
    })
    await invokeGuidePreview({
      method: 'post',
      transactionId: txId,
      user: reviewer,
      answers: { age_group: 'yes', issuance: 'renewal', needs: ['mail'] },
    })
    const after = await payload.findByID({
      collection: 'transactions',
      id: txId,
      draft: true,
      depth: 0,
      overrideAccess: true,
      context: { seed: true },
    })
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after.workflowState).toBe(before.workflowState)
    expect(after.claimTrustOk).toBe(before.claimTrustOk)
    expect(after._status).toBe(before._status)
    expect(after.guideEnabled).toBe(before.guideEnabled)
  })

  it('endpoint errors are APIError instances for auth failures', async () => {
    try {
      await invokeGuidePreview({ method: 'get', transactionId: txId, user: null })
      expect.unreachable('should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(APIError)
      expect((err as APIError).status).toBe(401)
    }
  })
})

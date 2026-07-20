/**
 * Phase 7 public transaction detail — eligibility and field safety (PostgreSQL).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { loadPublicTransactionBySlug } from '@/lib/public/transaction-detail'
import { PUBLIC_DETAIL_FORBIDDEN_KEYS } from '@/lib/public/transaction-detail-map'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }
const stamp = Date.now()

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  const category = await track(
    'categories',
    await payload.create({
      collection: 'categories',
      locale: 'ar',
      draft: false,
      data: {
        name: 'تصنيف تفاصيل تجريبي',
        slug: `qa-p7-int-cat-${stamp}`,
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const agency = await track(
    'agencies',
    await payload.create({
      collection: 'agencies',
      locale: 'ar',
      draft: false,
      data: {
        name: 'جهة تفاصيل تجريبية',
        slug: `qa-p7-int-agency-${stamp}`,
        type: 'other',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const document = await track(
    'documents',
    await payload.create({
      collection: 'documents',
      locale: 'ar',
      draft: false,
      data: {
        name: 'وثيقة تفاصيل تجريبية',
        slug: `qa-p7-int-doc-${stamp}`,
        documentType: 'other',
        active: true,
        _status: 'published',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const source = await track(
    'sources',
    await payload.create({
      collection: 'sources',
      locale: 'ar',
      draft: false,
      data: {
        title: 'مصدر تفاصيل تجريبي',
        slug: `qa-p7-int-src-${stamp}`,
        sourceType: 'official_webpage',
        officialUrl: 'https://example.test/qa-p7-int',
        verificationStatus: 'verified',
        active: true,
        _status: 'published',
        notes: 'ملاحظة داخلية يجب ألا تظهر',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const base = {
    category: category.id,
    agency: agency.id,
    steps: [
      { title: 'خطوة أ', description: 'وصف أ' },
      { title: 'خطوة ب', description: 'وصف ب' },
    ],
    sources: [
      {
        source: source.id,
        primary: true,
        coveredSections: ['summary', 'required_documents', 'steps', 'fees', 'other'],
      },
    ],
    requiredDocuments: [
      {
        document: document.id,
        requirementType: 'required' as const,
        quantity: 1,
      },
    ],
    fees: [{ label: 'رسم تجريبي', amount: 500, currency: 'SYP' as const }],
    lastReviewedAt: new Date().toISOString(),
  }

  await track(
    'transactions',
    await payload.create({
      collection: 'transactions',
      locale: 'ar',
      draft: false,
      data: {
        ...base,
        title: 'معاملة تفاصيل منشورة تجريبية',
        slug: `qa-p7-int-pub-${stamp}`,
        summary: 'ملخص تفاصيل للتكامل.',
        eligibility: 'أهلية تجريبية',
        outcome: 'نتيجة تجريبية',
        audiences: ['citizen'],
        estimatedDuration: { minimum: 1, maximum: 3, unit: 'business_days' },
        active: true,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
        internalNotes: 'سري جداً',
      } as never,
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
        ...base,
        title: 'مسودة تفاصيل تجريبية',
        slug: `qa-p7-int-draft-${stamp}`,
        summary: 'مخفية',
        active: true,
        workflowState: 'draft',
        markedOutdated: false,
        _status: 'draft',
      } as never,
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
        ...base,
        title: 'معطّلة تفاصيل تجريبية',
        slug: `qa-p7-int-inactive-${stamp}`,
        summary: 'مخفية',
        active: false,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
      } as never,
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
        ...base,
        title: 'مؤرشفة تفاصيل تجريبية',
        slug: `qa-p7-int-arch-${stamp}`,
        summary: 'مخفية',
        active: true,
        workflowState: 'archived',
        markedOutdated: false,
        _status: 'published',
      } as never,
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
        ...base,
        title: 'قديمة تفاصيل تجريبية',
        slug: `qa-p7-int-out-${stamp}`,
        summary: 'مخفية',
        active: true,
        workflowState: 'published',
        markedOutdated: true,
        _status: 'published',
      } as never,
      overrideAccess: true,
      context: seedCtx,
    }),
  )
})

afterAll(async () => {
  for (const row of [...created].reverse()) {
    try {
      await payload.delete({
        collection: row.collection as 'transactions',
        id: row.id,
        overrideAccess: true,
      })
    } catch {
      // ignore
    }
  }
})

describe('Phase 7 public transaction detail (int)', () => {
  it('resolves eligible published transaction with ordered sections', async () => {
    const result = await loadPublicTransactionBySlug(`qa-p7-int-pub-${stamp}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.transaction.title).toContain('منشورة')
    expect(result.transaction.steps.map((s) => s.title)).toEqual(['خطوة أ', 'خطوة ب'])
    expect(result.transaction.requiredDocuments[0]?.name).toContain('وثيقة')
    expect(result.transaction.fees[0]?.label).toContain('رسم')
    expect(result.transaction.sources[0]?.officialLink?.href).toContain('https://')
    expect(result.transaction.eligibility).toBeTruthy()
    expect(result.transaction.duration).toBeTruthy()
    for (const key of PUBLIC_DETAIL_FORBIDDEN_KEYS) {
      expect(result.transaction).not.toHaveProperty(key)
    }
    expect(JSON.stringify(result.transaction)).not.toContain('سري جداً')
    expect(JSON.stringify(result.transaction)).not.toContain('ملاحظة داخلية')
  })

  it('hides draft inactive archived outdated and missing slugs', async () => {
    expect((await loadPublicTransactionBySlug(`qa-p7-int-draft-${stamp}`)).ok).toBe(false)
    expect((await loadPublicTransactionBySlug(`qa-p7-int-inactive-${stamp}`)).ok).toBe(false)
    expect((await loadPublicTransactionBySlug(`qa-p7-int-arch-${stamp}`)).ok).toBe(false)
    expect((await loadPublicTransactionBySlug(`qa-p7-int-out-${stamp}`)).ok).toBe(false)
    expect((await loadPublicTransactionBySlug(`qa-p7-int-missing-${stamp}`)).ok).toBe(false)
  })
})

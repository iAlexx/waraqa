/**
 * Phase 8 interactive guide — public eligibility + CTA gate (PostgreSQL).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  docHasPublicGuideFlag,
  loadPublicGuideBySlug,
  transactionHasPublicGuide,
} from '@/lib/guide/public-guide'
import { isPublicGuideAvailable } from '@/lib/guide/validate-guide'

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
        name: 'تصنيف دليل تجريبي',
        slug: `qa-p8-int-cat-${stamp}`,
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
        name: 'جهة دليل تجريبية',
        slug: `qa-p8-int-agency-${stamp}`,
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
        name: 'وثيقة دليل تجريبية',
        slug: `qa-p8-int-doc-${stamp}`,
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
        title: 'مصدر دليل تجريبي',
        slug: `qa-p8-int-src-${stamp}`,
        sourceType: 'official_webpage',
        officialUrl: 'https://example.test/qa-p8-int',
        verificationStatus: 'verified',
        active: true,
        _status: 'published',
        notes: 'ملاحظة داخلية يجب ألا تظهر',
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  const guideConfig = {
    guideEnabled: true,
    questions: [
      {
        key: 'age_group',
        questionType: 'boolean' as const,
        prompt: 'هل أنت بالغ؟',
        required: true,
        active: true,
        options: [],
      },
      {
        key: 'issuance',
        questionType: 'single' as const,
        prompt: 'نوع المعاملة؟',
        required: true,
        active: true,
        options: [
          { key: 'first_time', label: 'أول مرة' },
          { key: 'renewal', label: 'تجديد' },
        ],
      },
    ],
    variants: [
      {
        key: 'variant_first',
        title: 'إصدار أول مرة',
        active: true,
      },
    ],
    notices: [
      {
        key: 'notice_info',
        title: 'تنبيه تجريبي',
        body: 'نص تنبيه للدليل.',
        severity: 'info' as const,
        active: true,
      },
    ],
    decisionRules: [
      {
        key: 'rule_first',
        priority: 10,
        active: true,
        explanation: 'لأنك أول مرة',
        when: {
          all: [{ questionKey: 'issuance', operator: 'equals' as const, value: 'first_time' }],
        },
        effects: [
          { type: 'selectVariant' as const, targetKey: 'variant_first' },
          { type: 'includeNotice' as const, targetKey: 'notice_info' },
        ],
      },
    ],
  }

  const base = {
    category: category.id,
    agency: agency.id,
    steps: [
      { key: 'step_prepare', title: 'خطوة أ', description: 'وصف أ' },
      { key: 'step_submit', title: 'خطوة ب', description: 'وصف ب' },
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
        key: 'doc_id',
        document: document.id,
        requirementType: 'required' as const,
        quantity: 1,
      },
    ],
    fees: [{ key: 'fee_base', label: 'رسم تجريبي', amount: 500, currency: 'SYP' as const }],
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
        ...guideConfig,
        title: 'معاملة دليل منشورة تجريبية',
        slug: `qa-p8-int-pub-${stamp}`,
        summary: 'ملخص دليل للتكامل.',
        audiences: ['citizen'],
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
        guideEnabled: false,
        questions: guideConfig.questions,
        title: 'معاملة بدون دليل مفعّل',
        slug: `qa-p8-int-noguide-${stamp}`,
        summary: 'منشورة لكن الدليل مطفأ.',
        active: true,
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
        ...guideConfig,
        title: 'مسودة دليل تجريبية',
        slug: `qa-p8-int-draft-${stamp}`,
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

describe('Phase 8 interactive guide (int)', () => {
  it('loadPublicGuideBySlug and transactionHasPublicGuide for eligible published guide', async () => {
    const slug = `qa-p8-int-pub-${stamp}`
    const result = await loadPublicGuideBySlug(slug)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.guide.title).toContain('منشورة')
    expect(result.guide.questions.map((q) => q.key)).toEqual(['age_group', 'issuance'])
    expect(result.guide.documents[0]?.key).toBe('doc_id')
    expect(result.guide.steps.map((s) => s.key)).toEqual(['step_prepare', 'step_submit'])
    expect(result.guide.sources[0]?.officialLink?.href).toContain('https://')
    expect(JSON.stringify(result.guide)).not.toContain('سري جداً')
    expect(JSON.stringify(result.guide)).not.toContain('ملاحظة داخلية')
    expect(await transactionHasPublicGuide(slug)).toBe(true)
  })

  it('hides draft and disables CTA when guideEnabled is false', async () => {
    expect((await loadPublicGuideBySlug(`qa-p8-int-draft-${stamp}`)).ok).toBe(false)
    expect(await transactionHasPublicGuide(`qa-p8-int-draft-${stamp}`)).toBe(false)

    const noGuide = await loadPublicGuideBySlug(`qa-p8-int-noguide-${stamp}`)
    expect(noGuide.ok).toBe(false)
    if (!noGuide.ok) expect(noGuide.reason).toBe('no_guide')
    expect(await transactionHasPublicGuide(`qa-p8-int-noguide-${stamp}`)).toBe(false)
    expect(
      isPublicGuideAvailable({
        guideEnabled: false,
        questions: [{ key: 'q1', questionType: 'boolean', prompt: 'س', active: true }],
      }),
    ).toBe(false)
    expect(docHasPublicGuideFlag({ guideEnabled: false })).toBe(false)
  })

  it('REST Local API does not expose draft; GraphQL remains app-disabled (404 in e2e)', async () => {
    const draftList = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 10,
      overrideAccess: false,
      where: { slug: { equals: `qa-p8-int-draft-${stamp}` } },
    })
    expect(draftList.docs).toEqual([])
    expect(draftList.totalDocs).toBe(0)

    const published = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 10,
      overrideAccess: false,
      where: { slug: { equals: `qa-p8-int-pub-${stamp}` } },
    })
    expect(published.docs).toHaveLength(1)
  })
})

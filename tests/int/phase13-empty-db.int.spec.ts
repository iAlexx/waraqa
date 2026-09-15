/**
 * Phase 13 — empty / miss filters against shared int DB (no full wipe).
 * Uses getPayload + existing vitest.int.config disposable DB setup.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getPublicTransactionWhere } from '@/access'
import { GET as healthGet } from '@/app/api/health/route'
import { loadPublicCategories } from '@/lib/public/categories'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
import config from '@/payload.config'

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
  for (const row of [...created].reverse()) {
    try {
      await payload.delete({
        collection: row.collection as 'categories',
        id: row.id,
        overrideAccess: true,
        context: { seed: true },
      })
    } catch {
      // ignore cleanup errors
    }
  }
})

describe('Phase 13 empty-filter / empty-state helpers (int)', () => {
  it('getPublicTransactionWhere + impossible slug returns empty docs', async () => {
    const impossible = `qa-p13-no-such-tx-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const found = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 5,
      overrideAccess: false,
      where: {
        and: [{ slug: { equals: impossible } }, getPublicTransactionWhere()],
      },
    })
    expect(found.docs).toEqual([])
    expect(found.totalDocs).toBe(0)
  })

  it('categories listing never includes procedureCount 0 (empty taxonomy filtered)', async () => {
    const stamp = Date.now()
    await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: false,
        data: {
          name: `تصنيف فارغ P13 ${stamp}`,
          slug: `qa-p13-empty-cat-${stamp}`,
          description: 'لا معاملات عامة — يجب أن يُخفى',
          active: true,
          _status: 'published',
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    const { categories, unavailable } = await loadPublicCategories()
    expect(unavailable).toBe(false)
    expect(categories.some((c) => c.slug === `qa-p13-empty-cat-${stamp}`)).toBe(false)
    for (const c of categories) {
      expect(c.procedureCount === 0).toBe(false)
      if (c.procedureCount != null) {
        expect(c.procedureCount).toBeGreaterThan(0)
      }
    }
  })

  it('/api/health GET returns only status/database shape', async () => {
    const res = await healthGet()
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toEqual({ status: 'ok', database: 'ok' })
    expect(Object.keys(body).sort()).toEqual(['database', 'status'])
  })

  it('report validation + missing transaction fail safely without throwing', async () => {
    const invalid = validatePublicReportSubmit({})
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) {
      expect(invalid.code).toBe('validation')
      expect(invalid.message).toBeTruthy()
      expect(JSON.stringify(invalid)).not.toMatch(/at\s+\w+|Error:|stack/i)
    }

    const validated = validatePublicReportSubmit({
      transactionSlug: `qa-p13-missing-tx-${Date.now()}`,
      section: 'other',
      message: 'معلومة تبدو غير صحيحة في الملخص العام للمعاملة.',
      encountered: 'واجهت اختلافاً عند مراجعة الصفحة العامة.',
      consent: true,
      website: '',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash: `p13-empty-${Date.now()}`,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('not_found')
    expect(result.message).toMatch(/تعذّر/)
    expect(result.message).not.toMatch(/at\s+\w+|Error:|stack|ECONN|postgres/i)
  })
})

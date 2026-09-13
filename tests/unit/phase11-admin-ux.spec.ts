import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EditorialDashboardView } from '@/components/admin/EditorialDashboard'
import {
  buildReviewDuePredicate,
  classifyReviewDueAt,
  reviewDueBucketLabelAr,
} from '@/lib/admin/editorial-dashboard'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
import { sanitizeAuditMetadata } from '@/lib/workflow/audit'

describe('Phase 11 reviewDueAt classification', () => {
  const now = new Date('2026-09-13T12:00:00.000Z')

  it('marks overdue when due <= now', () => {
    expect(classifyReviewDueAt('2026-09-13T12:00:00.000Z', now)).toBe('overdue')
    expect(classifyReviewDueAt('2026-09-01T00:00:00.000Z', now)).toBe('overdue')
  })

  it('marks due_soon within 7 days and future beyond', () => {
    expect(classifyReviewDueAt('2026-09-16T12:00:00.000Z', now)).toBe('due_soon')
    expect(classifyReviewDueAt('2026-10-01T12:00:00.000Z', now)).toBe('future')
  })

  it('handles null / invalid safely', () => {
    expect(classifyReviewDueAt(null, now)).toBe('missing')
    expect(classifyReviewDueAt(undefined, now)).toBe('missing')
    expect(classifyReviewDueAt('', now)).toBe('missing')
    expect(classifyReviewDueAt('not-a-date', now)).toBe('missing')
  })

  it('exposes Arabic labels (not color-only)', () => {
    expect(reviewDueBucketLabelAr('overdue')).toBe('متأخر')
    expect(reviewDueBucketLabelAr('due_soon')).toBe('قريب')
    expect(reviewDueBucketLabelAr('future')).toBe('قادم')
    expect(reviewDueBucketLabelAr('missing')).toBe('—')
  })
})

describe('Phase 11 public submit rejects assignedTo', () => {
  it('rejects any assignedTo field from public body', () => {
    const result = validatePublicReportSubmit({
      transactionSlug: 'tx-demo',
      section: 'fees',
      message: 'الرسوم الظاهرة غير مطابقة لما رأيته في المركز.',
      encountered: 'طلبوا مبلغاً مختلفاً عند المكتب.',
      consent: true,
      assignedTo: 99,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fields?.assignedTo).toBeTruthy()
      expect(result.message).toMatch(/تعيين/)
    }
  })
})

describe('Phase 11 assignment audit metadata is PII-safe', () => {
  it('keeps only assignee ids; strips contact/message', () => {
    const cleaned = sanitizeAuditMetadata({
      fromAssigneeId: 1,
      toAssigneeId: 2,
      contactEmail: 'leak@example.test',
      contactPhone: '+963999',
      message: 'secret citizen text',
      resolutionReason: 'ok-note',
    })
    expect(cleaned).toEqual({
      fromAssigneeId: 1,
      toAssigneeId: 2,
      resolutionReason: 'ok-note',
    })
    expect(JSON.stringify(cleaned)).not.toMatch(/leak@|963999|secret citizen/)
  })
})

describe('Phase 11 editorial dashboard view', () => {
  it('renders Arabic cards with accessible names', () => {
    const html = renderToStaticMarkup(
      createElement(EditorialDashboardView, {
        cards: [
          {
            key: 'tx_in_review',
            labelAr: 'معاملات بانتظار المراجعة',
            count: 3,
            href: '/admin/collections/transactions?where[workflowState][equals]=in_review',
          },
        ],
        generatedAt: '2026-09-13T12:00:00.000Z',
      }),
    )
    expect(html).toContain('لوحة التحرير')
    expect(html).toContain('معاملات بانتظار المراجعة')
    expect(html).toContain('aria-label="معاملات بانتظار المراجعة: 3"')
    expect(html).toContain('dir="rtl"')
  })

  it('shows loading and error states without leaking data', () => {
    const loading = renderToStaticMarkup(
      createElement(EditorialDashboardView, { cards: null, loading: true }),
    )
    expect(loading).toContain('جارٍ التحميل')
    const err = renderToStaticMarkup(
      createElement(EditorialDashboardView, {
        cards: null,
        error: 'تعذّر تحميل لوحة التحرير.',
      }),
    )
    expect(err).toContain('role="alert"')
    expect(err).toContain('تعذّر تحميل لوحة التحرير.')
  })
})

describe('Phase 11 review-due card count/link alignment', () => {
  it('href filters match count where (incl. markedOutdated + exists)', () => {
    const nowIso = '2026-09-13T12:00:00.000Z'
    const { where, hrefQuery } = buildReviewDuePredicate(nowIso)
    const and = where.and as Array<Record<string, Record<string, unknown>>>
    expect(and).toHaveLength(4)
    expect(and[0]).toEqual({ reviewDueAt: { exists: true } })
    expect(and[1]).toEqual({ reviewDueAt: { less_than_equal: nowIso } })
    expect(and[2]).toEqual({ workflowState: { not_equals: 'archived' } })
    expect(and[3]).toEqual({ markedOutdated: { not_equals: true } })

    expect(hrefQuery['where[and][0][reviewDueAt][exists]']).toBe('true')
    expect(hrefQuery['where[and][1][reviewDueAt][less_than_equal]']).toBe(nowIso)
    expect(hrefQuery['where[and][2][workflowState][not_equals]']).toBe('archived')
    expect(hrefQuery['where[and][3][markedOutdated][not_equals]']).toBe('true')

    // markedOutdated rows must be excluded by the same predicate used for the card link
    const href = `/admin/collections/transactions?${new URLSearchParams(hrefQuery).toString()}`
    expect(href).toContain('markedOutdated')
    expect(href).toContain('not_equals')
    expect(href).toContain('true')
  })
})

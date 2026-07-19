import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SearchResultCard } from '@/components/search/search-result-card'
import { SearchPageView } from '@/components/search/search-page-view'
import type { SearchPageResult } from '@/lib/search/run-search'

const sampleItem = {
  id: 1,
  title: 'معاملة تجريبية للاختبار',
  summary: 'ملخص قصير ثانوي',
  slug: 'qa-demo-card',
  categoryName: 'تصنيف تجريبي',
  agencyName: 'جهة تجريبية',
  lastReviewedAt: '2026-07-01T00:00:00.000Z',
  demoLabeled: true,
  href: '/transactions/qa-demo-card',
}

describe('SearchResultCard visual structure', () => {
  it('renders bordered card chrome with public fields only', () => {
    const { container } = render(<SearchResultCard item={sampleItem} />)
    const card = container.querySelector('[data-search-result-card]')
    expect(card).toBeTruthy()
    expect(card?.className).toMatch(/border/)
    expect(card?.className).toMatch(/bg-surface|w-full/)
    expect(screen.getByText('بيانات تجريبية')).toBeTruthy()
    expect(screen.getByText(sampleItem.title)).toBeTruthy()
    expect(screen.getByText(sampleItem.summary)).toBeTruthy()
    expect(screen.getByText('تصنيف تجريبي')).toBeTruthy()
    expect(screen.getByText('جهة تجريبية')).toBeTruthy()
    expect(screen.getByText(/عرض تفاصيل المعاملة/)).toBeTruthy()
    expect(container.textContent).not.toMatch(/workflow|internalNotes|archived/i)
  })
})

describe('SearchPageView result list structure', () => {
  it('uses ordered full-width list and Arabic count wording', () => {
    const data: SearchPageResult = {
      ok: true,
      query: 'تجريبي',
      queryNormalized: 'تجريبي',
      emptyQuery: false,
      results: [sampleItem, { ...sampleItem, id: 2, title: 'ثانية تجريبية', slug: 'b' }],
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      filters: { category: null, agency: null, center: null },
      filterOptions: { categories: [], agencies: [], serviceCenters: [] },
      appliedFilterLabels: { category: null, agency: null, center: null },
      pagination: { prevHref: null, nextHref: null },
    }
    const { container } = render(<SearchPageView data={data} searchExamples={[]} />)
    expect(screen.getByText('نتيجتان')).toBeTruthy()
    expect(container.querySelector('[data-search-results] ol')).toBeTruthy()
    expect(container.querySelectorAll('[data-search-result-card]').length).toBe(2)
  })
})

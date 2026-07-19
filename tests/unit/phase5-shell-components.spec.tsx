import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { HomeHero } from '@/components/home/home-hero'
import { HomeCategories } from '@/components/home/home-categories'
import { HomeFeatured } from '@/components/home/home-featured'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { IndependenceBadge } from '@/components/layout/independence-badge'
import { MaintenanceNotice } from '@/components/home/maintenance-notice'
import { HomeLoadingSkeleton } from '@/components/home/home-loading-skeleton'
import { FALLBACK_INDEPENDENCE, FALLBACK_BADGE } from '@/lib/public/site-settings-map'

const baseSettings = {
  siteName: 'ورقة',
  tagline: 'شعار',
  independenceDisclaimer: FALLBACK_INDEPENDENCE,
  footerDisclaimer: FALLBACK_INDEPENDENCE,
  contactEmail: null as string | null,
  supportPhone: null as string | null,
  searchExamples: ['جواز سفر', 'لا حكم عليه'],
  socialLinks: [] as Array<{ label: string; url: string }>,
  featuredTransactionIds: [] as Array<number | string>,
  homePageSections: {
    showCategories: true,
    showFeatured: true,
    showHowItWorks: true,
    showTrust: true,
  },
  maintenanceMode: false,
  settingsUnavailable: false,
}

describe('Phase 5 shell semantics', () => {
  it('header exposes landmarks and mobile checkbox menu', () => {
    const { container } = render(<SiteHeader settings={baseSettings} />)
    expect(container.querySelector('header')).toBeTruthy()
    expect(screen.getByLabelText('التنقل الرئيسي')).toBeTruthy()
    expect(screen.getByLabelText('فتح قائمة التنقل')).toBeTruthy()
    expect(container.querySelector('#waraqa-mobile-nav')).toBeTruthy()
    expect(container.querySelector('#waraqa-mobile-nav-panel')).toBeTruthy()
    expect(container.querySelector('[data-mobile-nav-root]')).toBeTruthy()
    expect(screen.getAllByText(FALLBACK_BADGE).length).toBeGreaterThan(0)
  })

  it('footer shows disclaimer and honest report-soon label', () => {
    render(<SiteFooter settings={baseSettings} />)
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    expect(screen.getByText(FALLBACK_INDEPENDENCE)).toBeTruthy()
    expect(screen.getByText(/قريباً/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /بلّغ عن معلومة قديمة/ })).toBeNull()
  })

  it('hero has native GET search form and visible disclaimer', () => {
    const { container } = render(<HomeHero settings={baseSettings} />)
    const form = container.querySelector('form#hero-search')
    expect(form).toBeTruthy()
    expect(form?.getAttribute('method')?.toLowerCase()).toBe('get')
    expect(form?.getAttribute('action')).toBe('/search')
    expect(screen.getByRole('search')).toBeTruthy()
    expect(screen.getByLabelText('ابحث عن معاملة')).toBeTruthy()
    expect(container.querySelector('[data-hero-disclaimer]')?.textContent).toContain('مستقلة')
    expect(screen.getByRole('heading', { level: 1, name: /خلّينا نجهز/ })).toBeTruthy()
  })

  it('categories empty state is intentional', () => {
    render(<HomeCategories categories={[]} />)
    expect(screen.getByText(/ما في تصنيفات منشورة/)).toBeTruthy()
    expect(document.querySelector('[data-empty="categories"]')).toBeTruthy()
  })

  it('featured empty state and populated cards', () => {
    const { rerender } = render(<HomeFeatured items={[]} />)
    expect(screen.getByText(/ما في معاملات مختارة/)).toBeTruthy()

    rerender(
      <HomeFeatured
        items={[
          {
            id: 1,
            title: 'معاملة تجريبية',
            summary: 'ملخص',
            slug: 'demo-tx',
            categoryName: 'تجريبي',
            lastReviewedAt: '2026-01-15T00:00:00.000Z',
            demoLabeled: true,
          },
        ]}
      />,
    )
    expect(screen.getByText('معاملة تجريبية')).toBeTruthy()
    expect(screen.getByText('بيانات تجريبية')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'اعرف شو المطلوب' })).toHaveAttribute(
      'href',
      '/transactions/demo-tx',
    )
  })

  it('independence badge and maintenance notice', () => {
    const { unmount } = render(<IndependenceBadge />)
    expect(screen.getAllByText(FALLBACK_BADGE).length).toBeGreaterThan(0)
    unmount()
    render(<MaintenanceNotice />)
    expect(screen.getByRole('heading', { name: /صيانة/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /admin/ })).toHaveAttribute('href', '/admin')
  })

  it('loading skeleton has accessible status and hero/search proportions', () => {
    const { container } = render(<HomeLoadingSkeleton />)
    const status = container.querySelector('[data-loading="home"]')
    expect(status?.getAttribute('role')).toBe('status')
    expect(status?.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('عم نحضر الصفحة…')).toBeTruthy()
  })
})

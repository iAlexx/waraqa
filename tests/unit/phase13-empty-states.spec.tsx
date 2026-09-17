/**
 * Phase 13 — home empty-state components must render without throwing.
 * Complements int empty-filter coverage; reuses Phase 5 shell empty patterns.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { HomeCategories } from '@/components/home/home-categories'
import { HomeFeatured } from '@/components/home/home-featured'
import { HomeHero } from '@/components/home/home-hero'
import { FALLBACK_INDEPENDENCE } from '@/lib/public/site-settings-map'

afterEach(() => {
  cleanup()
})

const emptySettings = {
  siteName: 'ورقة',
  tagline: '',
  independenceDisclaimer: FALLBACK_INDEPENDENCE,
  footerDisclaimer: FALLBACK_INDEPENDENCE,
  contactEmail: null as string | null,
  supportPhone: null as string | null,
  searchExamples: [] as string[],
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

describe('Phase 13 home empty states', () => {
  it('hero with empty search examples does not throw', () => {
    expect(() => render(<HomeHero settings={emptySettings} />)).not.toThrow()
    expect(screen.getByRole('search')).toBeTruthy()
  })

  it('categories empty list shows intentional empty UI', () => {
    expect(() => render(<HomeCategories categories={[]} />)).not.toThrow()
    expect(document.querySelector('[data-empty="categories"]')).toBeTruthy()
    expect(screen.getByText(/ما في تصنيفات منشورة/)).toBeTruthy()
  })

  it('featured empty list shows intentional empty UI', () => {
    expect(() => render(<HomeFeatured items={[]} />)).not.toThrow()
    expect(screen.getByText(/ما في معاملات مختارة/)).toBeTruthy()
  })
})

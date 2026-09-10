import { describe, expect, it } from 'vitest'

import {
  FALLBACK_INDEPENDENCE,
  FALLBACK_SEARCH_EXAMPLES,
  fallbackPublicSiteSettings,
  mapPublicSiteSettings,
} from '@/lib/public/site-settings-map'
import { isPubliclyEligibleTransaction } from '@/lib/public/featured-transactions'
import { localizedString } from '@/lib/public/localized'

describe('localizedString', () => {
  it('prefers ar locale and trims', () => {
    expect(localizedString({ ar: '  ورقة  ', en: 'Waraqa' })).toBe('ورقة')
    expect(localizedString('عنوان')).toBe('عنوان')
    expect(localizedString(null)).toBe('')
  })
})

describe('mapPublicSiteSettings', () => {
  it('applies Arabic fallbacks for empty optional fields', () => {
    const mapped = mapPublicSiteSettings({
      siteName: '',
      independenceDisclaimer: '',
      searchExamples: [],
      socialLinks: [],
      featuredTransactions: [],
      maintenanceMode: false,
    })
    expect(mapped.siteName).toBe('ورقة')
    expect(mapped.independenceDisclaimer).toBe(FALLBACK_INDEPENDENCE)
    expect(mapped.searchExamples).toEqual([...FALLBACK_SEARCH_EXAMPLES])
    expect(mapped.socialLinks).toEqual([])
    expect(mapped.settingsUnavailable).toBe(false)
  })

  it('maps search examples and ordered featured ids', () => {
    const mapped = mapPublicSiteSettings({
      siteName: { ar: 'ورقة' },
      independenceDisclaimer: { ar: 'تنويه' },
      searchExamples: [{ text: { ar: 'جواز' } }, { text: '' }, { text: { ar: 'قيد' } }],
      featuredTransactions: [3, { id: 7 }, null, '9'],
      homePageSections: { showCategories: false, showFeatured: true },
      socialLinks: [
        { label: { ar: 'حساب' }, url: 'https://example.com/waraqa' },
        { label: { ar: 'سيء' }, url: 'not-a-url' },
        { label: { ar: 'فارغ' }, url: '' },
      ],
      maintenanceMode: true,
      contactEmail: 'hello@waraqa.example',
      verificationPolicyDays: 90,
    })
    expect(mapped.searchExamples).toEqual(['جواز', 'قيد'])
    expect(mapped.featuredTransactionIds).toEqual([3, 7, '9'])
    expect(mapped.homePageSections.showCategories).toBe(false)
    expect(mapped.homePageSections.showFeatured).toBe(true)
    expect(mapped.socialLinks).toEqual([{ label: 'حساب', url: 'https://example.com/waraqa' }])
    expect(mapped.maintenanceMode).toBe(true)
    expect(mapped.contactEmail).toBe('hello@waraqa.example')
    // Private editorial field must not appear on public mapped type
    expect(mapped).not.toHaveProperty('verificationPolicyDays')
  })

  it('fallbackPublicSiteSettings marks unavailable', () => {
    const fb = fallbackPublicSiteSettings()
    expect(fb.settingsUnavailable).toBe(true)
    expect(fb.maintenanceMode).toBe(false)
    expect(fb.independenceDisclaimer).toBe(FALLBACK_INDEPENDENCE)
  })
})

describe('isPubliclyEligibleTransaction', () => {
  it('accepts published active non-archived non-outdated with claimTrustOk', () => {
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'published',
        claimTrustOk: true,
      }),
    ).toBe(true)
  })

  it('rejects draft, inactive, outdated, archived', () => {
    expect(
      isPubliclyEligibleTransaction({
        _status: 'draft',
        active: true,
        markedOutdated: false,
        workflowState: 'draft',
        claimTrustOk: true,
      }),
    ).toBe(false)
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: false,
        markedOutdated: false,
        workflowState: 'published',
        claimTrustOk: true,
      }),
    ).toBe(false)
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: true,
        workflowState: 'published',
        claimTrustOk: true,
      }),
    ).toBe(false)
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'archived',
        claimTrustOk: true,
      }),
    ).toBe(false)
  })

  it('rejects missing or false claimTrustOk', () => {
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'published',
      }),
    ).toBe(false)
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'published',
        claimTrustOk: false,
      }),
    ).toBe(false)
  })
})

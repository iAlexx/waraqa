import { localizedString, type LocalizedLike } from '@/lib/public/localized'
import { isHttpUrl } from '@/lib/urls'

export const FALLBACK_INDEPENDENCE =
  'ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. المعلومات منشورة للمساعدة، وقد تتغير التعليمات أو تختلف بين جهة وأخرى. تأكد دائماً من الجهة الرسمية قبل التقديم.'

export const FALLBACK_BADGE = 'منصة مستقلة — مو موقع حكومي'

export const FALLBACK_SEARCH_EXAMPLES = ['جواز سفر', 'لا حكم عليه', 'إخراج قيد'] as const

export type PublicSocialLink = { label: string; url: string }

export type PublicHomeSections = {
  showCategories: boolean
  showFeatured: boolean
  showHowItWorks: boolean
  showTrust: boolean
}

export type PublicSiteSettings = {
  siteName: string
  tagline: string
  independenceDisclaimer: string
  footerDisclaimer: string
  contactEmail: string | null
  supportPhone: string | null
  searchExamples: string[]
  socialLinks: PublicSocialLink[]
  featuredTransactionIds: Array<number | string>
  homePageSections: PublicHomeSections
  maintenanceMode: boolean
  /** True when Payload/DB load failed and fallbacks are used. */
  settingsUnavailable: boolean
}

const DEFAULT_SECTIONS: PublicHomeSections = {
  showCategories: true,
  showFeatured: true,
  showHowItWorks: true,
  showTrust: true,
}

/** Pure mapper — safe for Client Components (no Payload imports). */
export function mapPublicSiteSettings(raw: unknown): PublicSiteSettings {
  const doc = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const searchExamples: string[] = []
  if (Array.isArray(doc.searchExamples)) {
    for (const row of doc.searchExamples) {
      if (!row || typeof row !== 'object') continue
      const text = localizedString((row as { text?: LocalizedLike }).text)
      if (text) searchExamples.push(text)
    }
  }

  const socialLinks: PublicSocialLink[] = []
  if (Array.isArray(doc.socialLinks)) {
    for (const row of doc.socialLinks) {
      if (!row || typeof row !== 'object') continue
      const label = localizedString((row as { label?: LocalizedLike }).label)
      const url = typeof (row as { url?: unknown }).url === 'string' ? (row as { url: string }).url.trim() : ''
      if (label && url && isHttpUrl(url)) socialLinks.push({ label, url })
    }
  }

  const featuredTransactionIds: Array<number | string> = []
  if (Array.isArray(doc.featuredTransactions)) {
    for (const item of doc.featuredTransactions) {
      if (item == null) continue
      if (typeof item === 'object' && 'id' in item && (item as { id: unknown }).id != null) {
        featuredTransactionIds.push((item as { id: number | string }).id)
      } else if (typeof item === 'number' || typeof item === 'string') {
        featuredTransactionIds.push(item)
      }
    }
  }

  const sectionsRaw =
    doc.homePageSections && typeof doc.homePageSections === 'object'
      ? (doc.homePageSections as Record<string, unknown>)
      : {}

  return {
    siteName: localizedString(doc.siteName as LocalizedLike) || 'ورقة',
    tagline:
      localizedString(doc.tagline as LocalizedLike) ||
      'منصة إرشادية بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.',
    independenceDisclaimer:
      localizedString(doc.independenceDisclaimer as LocalizedLike) || FALLBACK_INDEPENDENCE,
    footerDisclaimer:
      localizedString(doc.footerDisclaimer as LocalizedLike) || FALLBACK_INDEPENDENCE,
    contactEmail: typeof doc.contactEmail === 'string' && doc.contactEmail.includes('@') ? doc.contactEmail : null,
    supportPhone: typeof doc.supportPhone === 'string' && doc.supportPhone.trim() ? doc.supportPhone.trim() : null,
    searchExamples: searchExamples.length ? searchExamples : [...FALLBACK_SEARCH_EXAMPLES],
    socialLinks,
    featuredTransactionIds,
    homePageSections: {
      showCategories: sectionsRaw.showCategories !== false,
      showFeatured: sectionsRaw.showFeatured !== false,
      showHowItWorks: sectionsRaw.showHowItWorks !== false,
      showTrust: sectionsRaw.showTrust !== false,
    },
    maintenanceMode: doc.maintenanceMode === true,
    settingsUnavailable: false,
  }
}

export function fallbackPublicSiteSettings(): PublicSiteSettings {
  return {
    siteName: 'ورقة',
    tagline: 'منصة إرشادية بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.',
    independenceDisclaimer: FALLBACK_INDEPENDENCE,
    footerDisclaimer: FALLBACK_INDEPENDENCE,
    contactEmail: null,
    supportPhone: null,
    searchExamples: [...FALLBACK_SEARCH_EXAMPLES],
    socialLinks: [],
    featuredTransactionIds: [],
    homePageSections: { ...DEFAULT_SECTIONS },
    maintenanceMode: false,
    settingsUnavailable: true,
  }
}

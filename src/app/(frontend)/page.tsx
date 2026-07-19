import type { Metadata } from 'next'

import { HomeCategories } from '@/components/home/home-categories'
import { HomeFeatured } from '@/components/home/home-featured'
import { HomeHero } from '@/components/home/home-hero'
import { HomeHowItWorks } from '@/components/home/home-how-it-works'
import { HomeLoadingSkeleton } from '@/components/home/home-loading-skeleton'
import { HomeTrust } from '@/components/home/home-trust'
import { MaintenanceNotice } from '@/components/home/maintenance-notice'
import { loadPublicCategories } from '@/lib/public/categories'
import { loadFeaturedTransactions } from '@/lib/public/featured-transactions'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

type HomeSearchParams = {
  qaEmpty?: string
  qaMaintenance?: string
  qaLoading?: string
}

/**
 * Block streaming shell for `/`.
 * Route-level loading.tsx was removed so no-JS clients receive the completed
 * server HTML (not a Suspense loading fallback). All primary data is awaited
 * before the document is returned.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPublicSiteSettings()
  const title = settings.siteName || 'ورقة'
  const description =
    settings.tagline ||
    'ورقة منصة إرشادية بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'ar_SY',
      type: 'website',
      siteName: title,
    },
  }
}

/**
 * Optional QA-only empty/maintenance/loading overrides when ALLOW_QA_EMPTY_STATES=1.
 * Never invents content — only forces empty/loading UI shells for screenshot capture.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>
}) {
  const params = await searchParams
  const qaEnabled = process.env.ALLOW_QA_EMPTY_STATES === '1'

  if (qaEnabled && params.qaLoading === '1') {
    return <HomeLoadingSkeleton />
  }

  const settings = await loadPublicSiteSettings()

  if (settings.maintenanceMode || (qaEnabled && params.qaMaintenance === '1')) {
    return <MaintenanceNotice />
  }

  const sections = settings.homePageSections
  const forceEmptyCategories = qaEnabled && params.qaEmpty === 'categories'
  const forceEmptyFeatured = qaEnabled && params.qaEmpty === 'featured'

  // Await all primary sections before paint — no Suspense boundary around home body.
  const [{ categories, unavailable: categoriesUnavailable }, featured] = await Promise.all([
    sections.showCategories && !forceEmptyCategories
      ? loadPublicCategories()
      : Promise.resolve({ categories: [], unavailable: false }),
    sections.showFeatured && !forceEmptyFeatured
      ? loadFeaturedTransactions(settings.featuredTransactionIds)
      : Promise.resolve({ items: [], unavailable: false }),
  ])

  return (
    <>
      <HomeHero settings={settings} />
      {sections.showCategories ? (
        <HomeCategories
          categories={forceEmptyCategories ? [] : categories}
          unavailable={categoriesUnavailable}
        />
      ) : null}
      {sections.showFeatured ? (
        <HomeFeatured
          items={forceEmptyFeatured ? [] : featured.items}
          unavailable={featured.unavailable}
        />
      ) : null}
      {sections.showHowItWorks ? <HomeHowItWorks /> : null}
      {sections.showTrust ? <HomeTrust /> : null}
    </>
  )
}

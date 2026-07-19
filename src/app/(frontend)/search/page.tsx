import type { Metadata } from 'next'

import { SearchPageView } from '@/components/search/search-page-view'
import { HomeLoadingSkeleton } from '@/components/home/home-loading-skeleton'
import { parseSearchParams } from '@/lib/search/params'
import { runPublicSearch } from '@/lib/search/run-search'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'البحث',
    description: 'ابحث عن معاملة إدارية منشورة — نتائج عربية مع تصفية حسب التصنيف والجهة.',
    openGraph: {
      title: 'البحث — ورقة',
      description: 'ابحث عن معاملة إدارية منشورة.',
      locale: 'ar_SY',
      type: 'website',
    },
  }
}

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Phase 6 — public Arabic search results.
 * Does not implement Phase 7 transaction detail pages.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams
  const allowQa = process.env.ALLOW_QA_EMPTY_STATES === '1'
  const parsed = parseSearchParams(raw as Record<string, unknown>, { allowQa })

  if (parsed.qaLoading) {
    return (
      <div className="waraqa-container py-8" data-search-loading>
        <h1 className="font-display text-2xl font-bold text-ink-950">البحث عن معاملة</h1>
        <p className="mt-2 text-ink-700">جاري تحميل النتائج…</p>
        <HomeLoadingSkeleton />
      </div>
    )
  }

  if (parsed.qaError) {
    return (
      <div className="waraqa-container py-8" data-search-error role="alert">
        <h1 className="font-display text-2xl font-bold text-ink-950">البحث عن معاملة</h1>
        <p className="mt-4 text-ink-800">تعذّر تنفيذ البحث حالياً. حاول مرة ثانية بعد قليل.</p>
        <p className="mt-4">
          <a
            href="/search"
            className="font-semibold text-brand-900 underline-offset-2 hover:underline"
          >
            العودة إلى البحث
          </a>
        </p>
      </div>
    )
  }

  const [settings, result] = await Promise.all([
    loadPublicSiteSettings(),
    runPublicSearch(parsed),
  ])

  if (!result.ok) {
    return (
      <div className="waraqa-container py-8" data-search-error role="alert">
        <h1 className="font-display text-2xl font-bold text-ink-950">البحث عن معاملة</h1>
        <p className="mt-4 text-ink-800">{result.message}</p>
        <p className="mt-4">
          <a
            href="/search"
            className="font-semibold text-brand-900 underline-offset-2 hover:underline"
          >
            العودة إلى البحث
          </a>
        </p>
      </div>
    )
  }

  return <SearchPageView data={result} searchExamples={settings.searchExamples} />
}

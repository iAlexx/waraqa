import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TransactionDetailSkeleton } from '@/components/transaction/transaction-detail-skeleton'
import { TransactionDetailView } from '@/components/transaction/transaction-detail-view'
import { loadPublicTransactionBySlug } from '@/lib/public/transaction-detail'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ qaLoading?: string; qaError?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await loadPublicTransactionBySlug(slug)

  if (!result.ok) {
    return {
      title: 'معاملة غير متاحة',
      robots: { index: false, follow: false },
    }
  }

  const settings = await loadPublicSiteSettings()
  const siteName = settings.siteName || 'ورقة'
  const { title, summary } = result.transaction
  const description = summary.length > 160 ? `${summary.slice(0, 157)}…` : summary

  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${siteName}`,
      description,
      locale: 'ar_SY',
      type: 'article',
      siteName,
    },
  }
}

/**
 * Phase 7 — public transaction detail.
 * Ineligible / missing slugs → notFound (no existence leak).
 * No Phase 8 guide engine, Phase 10 reporting, or Phase 11 SEO system.
 */
export default async function TransactionDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const qa = await searchParams
  const allowQa = process.env.ALLOW_QA_EMPTY_STATES === '1'

  if (allowQa && qa.qaLoading === '1') {
    return <TransactionDetailSkeleton />
  }

  if (allowQa && qa.qaError === '1') {
    return (
      <div
        className="waraqa-container flex min-h-[min(70vh,36rem)] flex-col justify-center py-12 md:py-16"
        data-transaction-error
        role="alert"
      >
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-ink-950">تعذّر عرض المعاملة</h1>
          <p className="mt-3 max-w-xl text-ink-700">حاول مرة ثانية بعد قليل.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/transactions/${encodeURIComponent(slug)}`}
              data-error-retry
              className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
            >
              إعادة المحاولة
            </Link>
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center rounded-[0.8125rem] border border-border bg-surface px-5 font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
            >
              العودة إلى البحث
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const result = await loadPublicTransactionBySlug(slug)
  if (!result.ok) {
    notFound()
  }

  return <TransactionDetailView transaction={result.transaction} />
}

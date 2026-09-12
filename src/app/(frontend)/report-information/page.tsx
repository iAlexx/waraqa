import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReportInformationForm } from '@/components/reports/report-information-form'
import { loadPublicTransactionBySlug } from '@/lib/public/transaction-detail'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ transaction?: string; sent?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPublicSiteSettings()
  const siteName = settings.siteName || 'ورقة'
  return {
    title: `بلّغنا عن معلومة تغيّرت — ${siteName}`,
    description: 'أخبر فريق ورقة إذا لاحظت معلومة إدارية تغيّرت. البلاغ للمراجعة الداخلية فقط.',
    robots: { index: false, follow: false },
  }
}

/**
 * Phase 10 — public changed-information report form.
 * Only reachable for Transactions that pass P0-05/P0-06 public eligibility.
 */
export default async function ReportInformationPage({ searchParams }: Props) {
  const sp = await searchParams
  const slug = typeof sp.transaction === 'string' ? sp.transaction.trim() : ''
  if (!slug) {
    return (
      <div className="waraqa-container py-12 md:py-16" data-report-missing-transaction>
        <h1 className="font-display text-2xl font-bold text-ink-950">بلّغنا عن معلومة تغيّرت</h1>
        <p className="mt-3 max-w-xl text-ink-700 leading-relaxed">
          افتح صفحة المعاملة أولاً، ثم استخدم زر البلاغ من هناك.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white"
        >
          البحث عن معاملة
        </Link>
      </div>
    )
  }

  const result = await loadPublicTransactionBySlug(slug)
  if (!result.ok) {
    notFound()
  }

  const { transaction } = result
  const sent = sp.sent === '1'

  return (
    <div className="waraqa-container py-10 md:py-14" data-report-page>
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-brand-800">بلاغ عن معلومة</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-950 md:text-4xl">
          بلّغنا عن معلومة تغيّرت
        </h1>
        <p className="mt-4 text-ink-700 leading-relaxed">
          لاحظت معلومة تغيّرت؟ خبرنا عنها، وفريق ورقة بيراجعها قبل ما يعدّل المحتوى.
        </p>
      </header>

      <div className="mt-10 max-w-2xl">
        {sent ? (
          <div
            className="rounded-[0.8125rem] border border-border/80 bg-surface px-5 py-8 text-center"
            data-report-success
            role="status"
          >
            <h2 className="font-display text-xl font-bold text-ink-950">تم استلام بلاغك</h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              شكراً لك. فريق ورقة سيراجع البلاغ قبل أي تعديل على المحتوى. ورقة منصة إرشادية مستقلة وليست
              جهة حكومية.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={`/transactions/${encodeURIComponent(transaction.slug)}`}
                className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white"
              >
                العودة إلى المعاملة
              </Link>
            </div>
          </div>
        ) : (
          <ReportInformationForm
            transactionSlug={transaction.slug}
            transactionTitle={transaction.title}
            demoLabeled={transaction.demoLabeled}
          />
        )}
      </div>
    </div>
  )
}

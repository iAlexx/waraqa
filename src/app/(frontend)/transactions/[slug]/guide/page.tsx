import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GuideClient } from '@/components/guide/guide-client'
import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import { loadPublicGuideBySlug } from '@/lib/guide/public-guide'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ qaLoading?: string; qaError?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await loadPublicGuideBySlug(slug)
  if (!result.ok) {
    return {
      title: result.reason === 'not_found' ? 'معاملة غير متاحة' : 'الدليل غير متاح',
      robots: { index: false, follow: false },
    }
  }
  const settings = await loadPublicSiteSettings()
  const siteName = settings.siteName || 'ورقة'
  return {
    title: `الدليل التفاعلي — ${result.guide.title}`,
    description: result.guide.summary.slice(0, 160),
    ...(result.guide.demoLabeled ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: `الدليل التفاعلي — ${result.guide.title} — ${siteName}`,
      description: result.guide.summary.slice(0, 160),
      locale: 'ar_SY',
      type: 'website',
      siteName,
    },
  }
}

/**
 * Phase 8 / Phase 9 — interactive guide.
 * Answers + checklist progress may persist in device-local storage (P9-B).
 * Never sent to the server; public eligibility still uses P0-05/P0-06 loaders.
 * Hidden transactions → same not-found as Phase 7.
 */
export default async function TransactionGuidePage({ params, searchParams }: Props) {
  const { slug } = await params
  const qa = await searchParams
  const allowQa = process.env.ALLOW_QA_EMPTY_STATES === '1'

  if (allowQa && qa.qaLoading === '1') {
    return (
      <div className="waraqa-container py-12" data-guide-loading>
        <div className="mx-auto w-full max-w-5xl">
          <div className="h-4 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="mt-6 h-8 max-w-md animate-pulse rounded-lg bg-brand-100 motion-reduce:animate-none" />
          <div className="mt-4 h-24 animate-pulse rounded-[0.8125rem] border border-border bg-surface motion-reduce:animate-none" />
        </div>
      </div>
    )
  }

  if (allowQa && qa.qaError === '1') {
    return (
      <div
        className="waraqa-container flex min-h-[min(70vh,36rem)] flex-col justify-center py-12"
        data-guide-error
        role="alert"
      >
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-ink-950">تعذّر تحميل الدليل</h1>
          <p className="mt-3 text-ink-700">حاول مرة ثانية بعد قليل.</p>
          <Link
            href={`/transactions/${encodeURIComponent(slug)}/guide`}
            className="mt-8 inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white"
            data-error-retry
          >
            إعادة المحاولة
          </Link>
        </div>
      </div>
    )
  }

  const result = await loadPublicGuideBySlug(slug)
  if (!result.ok) {
    if (result.reason === 'not_found') notFound()
    return (
      <div className="waraqa-container py-12" data-guide-unavailable>
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-ink-950">الدليل غير متاح</h1>
          <p className="mt-3 max-w-xl text-ink-700">
            ما في دليل تفاعلي جاهز لهالمعاملة حالياً. يمكنك مراجعة صفحة التفاصيل العامة.
          </p>
          <Link
            href={`/transactions/${encodeURIComponent(slug)}`}
            className="mt-8 inline-flex min-h-12 items-center rounded-[0.8125rem] border border-border bg-surface px-5 font-semibold text-brand-900"
          >
            العودة لتفاصيل المعاملة
          </Link>
        </div>
      </div>
    )
  }

  const { guide } = result

  return (
    <div className="waraqa-container py-8 md:py-12" data-guide-page data-guide-slug={guide.slug}>
      <nav aria-label="مسار التنقل" className="mx-auto mb-6 w-full max-w-5xl text-sm text-ink-600">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:underline">
              الرئيسية
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={guide.detailHref} className="hover:underline">
              {guide.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-ink-900" aria-current="page">
            الدليل التفاعلي
          </li>
        </ol>
      </nav>

      <header className="mx-auto w-full max-w-5xl border-b border-border/60 pb-6">
        {guide.demoLabeled ? (
          <p
            className="mb-3 rounded-[0.8125rem] border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning"
            data-demo-content-label
            role="status"
          >
            {DEMO_PUBLIC_LABEL_AR}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-bold text-ink-950 md:text-[1.75rem]">
          الدليل التفاعلي — {guide.title}
        </h1>
        <p className="mt-2 max-w-[40rem] text-ink-700">{guide.summary}</p>
        <p className="mt-4 rounded-[0.8125rem] border border-border/80 bg-ivory/80 px-4 py-3 text-sm text-ink-700">
          ورقة منصة إرشادية مستقلة. تقدّمك يُحفظ على جهازك فقط ولا يُرسل إلى الخادم.
        </p>
      </header>

      {/* Progressive enhancement: no-JS users get an honest fallback (not an empty shell). */}
      <noscript>
        <div className="mx-auto mt-8 w-full max-w-5xl rounded-[0.8125rem] border border-border bg-surface px-4 py-5 text-ink-800">
          <p className="font-semibold">الدليل التفاعلي يحتاج جافاسكريبت في المتصفح.</p>
          <p className="mt-2 text-sm leading-relaxed">
            بدون جافاسكريبت ما منقدر نعرض الأسئلة خطوة بخطوة. راجع صفحة تفاصيل المعاملة للاطلاع على
            الوثائق والخطوات والمصادر الرسمية.
          </p>
          <p className="mt-4">
            <a href={guide.detailHref} className="font-semibold text-brand-900 underline">
              فتح تفاصيل المعاملة
            </a>
          </p>
        </div>
      </noscript>

      <div className="mt-8">
        <GuideClient guide={guide} />
      </div>
    </div>
  )
}

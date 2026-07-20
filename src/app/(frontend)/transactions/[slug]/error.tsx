'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Segment error UI for `/transactions/[slug]`.
 * Uses framework `reset()` — never renders technical error details.
 */
export default function TransactionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    }
  }, [error])

  return (
    <div
      className="waraqa-container flex min-h-[min(70vh,36rem)] flex-col justify-center py-12 md:py-16"
      role="alert"
      data-transaction-error
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <h1 className="font-display text-2xl font-bold text-ink-950">تعذّر عرض المعاملة</h1>
        <p className="mt-3 max-w-xl text-ink-700">حاول مرة ثانية بعد قليل.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            data-error-retry
            className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
          >
            إعادة المحاولة
          </button>
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

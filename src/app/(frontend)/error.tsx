'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log only in development — never render stack to users.
    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    }
  }, [error])

  return (
    <div
      className="waraqa-container py-16"
      role="alert"
      data-error="home"
    >
      <h1 className="font-display text-2xl font-bold text-ink-950">صار في مشكلة</h1>
      <p className="mt-3 max-w-xl text-ink-700">
        ما قدرنا نعرض الصفحة الرئيسية هلأ. جرّب مرة تانية، أو ارجع لاحقاً.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-[0.8125rem] border border-brand-800/30 bg-surface px-5 font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
        >
          الصفحة الرئيسية
        </Link>
      </div>
    </div>
  )
}

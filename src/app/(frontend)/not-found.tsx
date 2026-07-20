import Link from 'next/link'

export default function FrontendNotFound() {
  return (
    <div
      className="waraqa-container flex min-h-[min(70vh,36rem)] flex-col justify-center py-12 md:py-16"
      data-not-found
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <h1 className="font-display text-2xl font-bold text-ink-950">الصفحة غير موجودة</h1>
        <p className="mt-3 max-w-xl text-ink-700">
          ما لقينا هالصفحة، أو المعاملة غير متاحة للعرض العام.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
          >
            البحث عن معاملة
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-[0.8125rem] border border-border bg-surface px-5 font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

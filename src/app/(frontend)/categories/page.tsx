import type { Metadata } from 'next'
import Link from 'next/link'

import { loadPublicCategories } from '@/lib/public/categories'

export const metadata: Metadata = {
  title: 'التصنيفات',
  description: 'تصفح معاملات ورقة حسب التصنيف.',
}

export default async function CategoriesIndexPage() {
  const { categories, unavailable } = await loadPublicCategories()

  return (
    <div className="waraqa-container py-12 md:py-16">
      <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">التصنيفات</h1>
      <p className="mt-3 max-w-2xl text-ink-700">
        قائمة التصنيفات المنشورة. صفحات التصنيف التفصيلية والفلاتر جزء من مراحل لاحقة.
      </p>

      {unavailable ? (
        <p className="mt-8 text-ink-700" role="status">
          تعذّر تحميل التصنيفات.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-8 text-ink-700" role="status" data-empty="categories">
          ما في تصنيفات منشورة حالياً.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <li key={String(c.id)}>
              <Link
                href={`/categories/${encodeURIComponent(c.slug)}`}
                className="block rounded-xl border border-border bg-surface p-4 font-semibold text-brand-900 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
              >
                {c.name}
                {c.demoLabeled ? (
                  <span className="ms-2 text-xs font-semibold text-warning">بيانات تجريبية</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10">
        <Link href="/" className="font-semibold text-brand-900 underline-offset-4 hover:underline">
          العودة للرئيسية
        </Link>
      </p>
    </div>
  )
}

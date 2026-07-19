import Link from 'next/link'
import {
  FileText,
  HeartPulse,
  Home,
  Landmark,
  Scale,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { PublicCategoryCard } from '@/lib/public/categories'
import { cn } from '@/lib/utils/cn'

const ICONS: LucideIcon[] = [FileText, Landmark, Scale, Users, HeartPulse, Home]

function iconForIndex(i: number): LucideIcon {
  return ICONS[i % ICONS.length]!
}

export type HomeCategoriesProps = {
  categories: PublicCategoryCard[]
  unavailable?: boolean
  className?: string
}

function HomeCategories({ categories, unavailable, className }: HomeCategoriesProps) {
  return (
    <section
      id="categories"
      aria-labelledby="categories-heading"
      className={cn('border-t border-border/60 bg-surface', className)}
    >
      <div className="waraqa-container py-12 md:py-16">
        <h2
          id="categories-heading"
          className="font-display text-2xl font-bold text-ink-950 md:text-[1.75rem]"
        >
          التصنيفات
        </h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          تصفّح المعاملات حسب المجال — من غير ما تحتاج تعرف الاسم الرسمي.
        </p>

        {unavailable ? (
          <p className="mt-8 text-ink-700" role="status">
            تعذّر تحميل التصنيفات حالياً. جرّب لاحقاً.
          </p>
        ) : categories.length === 0 ? (
          <div
            className="mt-8 rounded-xl border border-dashed border-border bg-ivory/60 px-5 py-8"
            role="status"
            data-empty="categories"
          >
            <p className="font-medium text-ink-900">ما في تصنيفات منشورة حالياً.</p>
            <p className="mt-2 text-sm text-ink-700">
              لمّا تنشر التصنيفات من لوحة التحرير، بتظهر هون. ما عم نعرض بيانات وهمية.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const Icon = iconForIndex(i)
              return (
                <li key={String(cat.id)}>
                  <Link
                    href={`/categories/${encodeURIComponent(cat.slug)}`}
                    className={cn(
                      'group relative flex h-full min-h-[7.5rem] flex-col gap-2 rounded-xl border border-border/80 bg-ivory/40 p-4',
                      'transition-colors hover:border-brand-700/40 hover:bg-brand-50/40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                    )}
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-lg border border-brand-800/20 bg-surface text-brand-900">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-display text-lg font-semibold text-ink-950 group-hover:underline">
                      {cat.name}
                    </span>
                    {cat.description ? (
                      <span className="line-clamp-2 text-sm leading-relaxed text-ink-700">
                        {cat.description}
                      </span>
                    ) : null}
                    {cat.procedureCount != null ? (
                      <span className="mt-auto text-xs font-medium text-ink-600">
                        {cat.procedureCount} معاملة منشورة
                      </span>
                    ) : null}
                    {cat.demoLabeled ? (
                      <span className="absolute start-3 top-3 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warning">
                        بيانات تجريبية
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export { HomeCategories }

import Link from 'next/link'

import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import type { PublicFeaturedCard } from '@/lib/public/featured-transactions'
import { cn } from '@/lib/utils/cn'

export type HomeFeaturedProps = {
  items: PublicFeaturedCard[]
  unavailable?: boolean
  className?: string
}

function formatVerifiedDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return null
  }
}

function HomeFeatured({ items, unavailable, className }: HomeFeaturedProps) {
  return (
    <section
      id="featured"
      aria-labelledby="featured-heading"
      className={cn('border-t border-border/60 bg-ivory/50', className)}
    >
      <div className="waraqa-container py-12 md:py-16">
        <h2
          id="featured-heading"
          className="font-display text-2xl font-bold text-ink-950 md:text-[1.75rem]"
        >
          معاملات مختارة
        </h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          اختيارات تحريرية من إعدادات الموقع — مو ترتيب شعبية آلي.
        </p>

        {unavailable ? (
          <p className="mt-8 text-ink-700" role="status">
            تعذّر تحميل المعاملات المختارة حالياً.
          </p>
        ) : items.length === 0 ? (
          <div
            className="mt-8 rounded-xl border border-dashed border-border bg-surface px-5 py-8"
            role="status"
            data-empty="featured"
          >
            <p className="font-medium text-ink-900">ما في معاملات مختارة للعرض حالياً.</p>
            <p className="mt-2 text-sm text-ink-700">
              لمّا تُضبط معاملات منشورة وصالحة في إعدادات الموقع، بتظهر هون.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const verified = formatVerifiedDate(item.lastReviewedAt)
              return (
                <li key={String(item.id)}>
                  <article
                    className={cn(
                      'flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-surface p-5',
                    )}
                  >
                    {item.demoLabeled ? (
                      <span className="self-start rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warning">
                        {DEMO_PUBLIC_LABEL_AR}
                      </span>
                    ) : null}
                    <h3 className="font-display text-lg font-semibold text-ink-950">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-ink-700">
                        {item.summary}
                      </p>
                    ) : null}
                    <dl className="mt-auto space-y-1 text-xs text-ink-600">
                      {item.categoryName ? (
                        <div className="flex gap-2">
                          <dt className="font-medium">التصنيف:</dt>
                          <dd>{item.categoryName}</dd>
                        </div>
                      ) : null}
                      {verified ? (
                        <div className="flex gap-2">
                          <dt className="font-medium">آخر تحقق:</dt>
                          <dd>
                            <time dateTime={item.lastReviewedAt!}>{verified}</time>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    <Link
                      href={`/transactions/${encodeURIComponent(item.slug)}`}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center rounded-[0.8125rem] border border-brand-800/30 bg-brand-50 px-4 text-sm font-semibold text-brand-900',
                        'hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                      )}
                    >
                      اعرف شو المطلوب
                    </Link>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export { HomeFeatured }

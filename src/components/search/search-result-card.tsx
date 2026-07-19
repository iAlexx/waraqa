import Link from 'next/link'

import type { PublicSearchResultCard } from '@/lib/search/map-result'
import { cn } from '@/lib/utils/cn'

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

export type SearchResultCardProps = {
  item: PublicSearchResultCard
}

/**
 * Full-width ranked result card — bordered surface container for scannable lists.
 * Public fields only (no workflow badges).
 */
function SearchResultCard({ item }: SearchResultCardProps) {
  const verified = formatVerifiedDate(item.lastReviewedAt)

  return (
    <article
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5 rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-4',
        'md:gap-3 md:px-5 md:py-4',
        'shadow-[0_1px_0_rgb(10_61_55_/_0.04)]',
      )}
      data-search-result
      data-search-result-card
      data-search-result-id={String(item.id)}
      data-search-result-slug={item.slug}
    >
      {item.demoLabeled ? (
        <span className="self-start rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warning">
          بيانات تجريبية
        </span>
      ) : null}

      <h2 className="min-w-0 font-display text-lg font-semibold leading-snug text-ink-950 md:text-xl">
        <Link
          href={item.href}
          className={cn(
            'rounded-sm text-ink-950 underline-offset-4',
            'hover:text-brand-900 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
          )}
          data-search-result-title
        >
          {item.title}
        </Link>
      </h2>

      {item.summary ? (
        <p className="line-clamp-2 min-w-0 text-sm leading-relaxed text-ink-700 md:line-clamp-3 md:text-[0.9375rem]">
          {item.summary}
        </p>
      ) : null}

      <ul
        className="flex min-w-0 flex-wrap gap-1.5"
        aria-label="معلومات المعاملة"
        data-search-result-meta
      >
        {item.categoryName ? (
          <li>
            <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-ivory px-2 py-0.5 text-xs text-ink-700">
              <span className="me-1 text-ink-500">التصنيف</span>
              <span className="truncate font-medium text-ink-900">{item.categoryName}</span>
            </span>
          </li>
        ) : null}
        {item.agencyName ? (
          <li>
            <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-ivory px-2 py-0.5 text-xs text-ink-700">
              <span className="me-1 text-ink-500">الجهة</span>
              <span className="truncate font-medium text-ink-900">{item.agencyName}</span>
            </span>
          </li>
        ) : null}
        {verified ? (
          <li>
            <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-ivory px-2 py-0.5 text-xs text-ink-700">
              <span className="me-1 text-ink-500">آخر مراجعة</span>
              <time className="font-medium text-ink-900" dateTime={item.lastReviewedAt ?? undefined}>
                {verified}
              </time>
            </span>
          </li>
        ) : null}
      </ul>

      <p className="pt-0.5">
        <Link
          href={item.href}
          className={cn(
            'inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-brand-900',
            'underline-offset-4 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
          )}
          data-search-result-cta
        >
          عرض تفاصيل المعاملة (قريباً)
        </Link>
      </p>
    </article>
  )
}

export { SearchResultCard }

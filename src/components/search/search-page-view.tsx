import { SearchForm } from '@/components/search/search-form'
import { SearchResultCard } from '@/components/search/search-result-card'
import { formatSearchResultCount } from '@/lib/search/result-count'
import type { SearchPageResult } from '@/lib/search/run-search'
import { cn } from '@/lib/utils/cn'

export type SearchPageViewProps = {
  data: SearchPageResult
  searchExamples: string[]
}

function SearchPageView({ data, searchExamples }: SearchPageViewProps) {
  const statusText = data.emptyQuery
    ? 'اكتب كلمة بحث أو اختر تصفية للبدء.'
    : data.total === 0
      ? 'ما لقينا معاملة مطابقة.'
      : formatSearchResultCount(data.total)

  return (
    <div className="waraqa-container py-8 md:py-12" data-search-page>
      <header className="mb-6 max-w-3xl md:mb-8">
        <h1
          id="search-heading"
          className="font-display text-[1.75rem] font-bold text-ink-950 md:text-[2rem]"
        >
          البحث عن معاملة
        </h1>
        <p className="mt-2 text-ink-700">
          ابحث بالاسم الشائع أو الرسمي. النتائج تعرض المعاملات المنشورة والنشطة فقط.
        </p>
      </header>

      <SearchForm
        query={data.query}
        category={data.filters.category}
        agency={data.filters.agency}
        center={data.filters.center}
        categories={data.filterOptions.categories}
        agencies={data.filterOptions.agencies}
        serviceCenters={data.filterOptions.serviceCenters}
      />

      <div className="mt-5 md:mt-6" role="status" aria-live="polite" data-search-status>
        <p className="text-sm font-semibold text-ink-900" data-search-result-count>
          {statusText}
        </p>
        {!data.emptyQuery && data.query ? (
          <p className="mt-1 text-sm text-ink-600">
            نتائج البحث عن «{data.query}»
            {data.appliedFilterLabels.category
              ? ` · تصنيف: ${data.appliedFilterLabels.category}`
              : ''}
            {data.appliedFilterLabels.agency
              ? ` · جهة: ${data.appliedFilterLabels.agency}`
              : ''}
            {data.appliedFilterLabels.center
              ? ` · مركز: ${data.appliedFilterLabels.center}`
              : ''}
          </p>
        ) : null}
      </div>

      {data.emptyQuery && data.total === 0 ? (
        <div
          className="mt-6 rounded-xl border border-dashed border-border bg-surface px-5 py-8"
          data-empty="search-query"
        >
          <p className="font-medium text-ink-900">اكتب اسم المعاملة للبدء</p>
          <p className="mt-2 text-sm text-ink-700">
            جرّب اسم المعاملة كما بيقولوه الناس، أو صفّي حسب التصنيف أو الجهة.
          </p>
          {searchExamples.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="أمثلة بحث">
              {searchExamples.map((example) => (
                <li key={example}>
                  <a
                    href={`/search?q=${encodeURIComponent(example)}`}
                    className={cn(
                      'inline-flex min-h-11 items-center rounded-md border border-border bg-ivory px-3 text-sm text-ink-800',
                      'underline-offset-2 hover:bg-brand-50 hover:underline',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                    )}
                  >
                    {example}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!data.emptyQuery && data.total === 0 ? (
        <div
          className="mt-6 rounded-xl border border-dashed border-border bg-surface px-5 py-8"
          data-empty="search-no-results"
          role="status"
        >
          <p className="font-medium text-ink-900">ما لقينا معاملة مطابقة.</p>
          <p className="mt-2 text-sm text-ink-700">
            جرّب اسم تاني، أو كلمة الناس بتستخدمها عادةً، أو اشيل التصفية.
          </p>
          {searchExamples.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="أمثلة بحث بديلة">
              {searchExamples.map((example) => (
                <li key={example}>
                  <a
                    href={`/search?q=${encodeURIComponent(example)}`}
                    className="inline-flex min-h-11 items-center rounded-md border border-border bg-ivory px-3 text-sm text-ink-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
                  >
                    {example}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {data.results.length > 0 ? (
        <section
          aria-labelledby="search-results-heading"
          className="mt-4 w-full min-w-0"
          data-search-results
        >
          <h2 id="search-results-heading" className="sr-only">
            نتائج البحث
          </h2>
          <ol className="flex w-full min-w-0 list-none flex-col gap-3 p-0 md:gap-3.5">
            {data.results.map((item) => (
              <li key={String(item.id)} className="w-full min-w-0">
                <SearchResultCard item={item} />
              </li>
            ))}
          </ol>

          {(data.pagination.prevHref || data.pagination.nextHref) && (
            <nav
              className={cn(
                'mt-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-3',
                'rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-3',
              )}
              aria-label="ترقيم صفحات النتائج"
              data-search-pagination
            >
              {data.pagination.prevHref ? (
                <a
                  href={data.pagination.prevHref}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-md border border-border bg-ivory px-3 text-sm font-semibold text-brand-900',
                    'hover:bg-brand-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                  )}
                >
                  الصفحة السابقة
                </a>
              ) : (
                <span className="inline-flex min-h-11 min-w-[6rem] items-center text-sm text-ink-400" aria-hidden>
                  —
                </span>
              )}
              <p className="text-center text-sm font-medium text-ink-700">
                صفحة {data.page} من {data.totalPages}
              </p>
              {data.pagination.nextHref ? (
                <a
                  href={data.pagination.nextHref}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-md border border-border bg-ivory px-3 text-sm font-semibold text-brand-900',
                    'hover:bg-brand-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                  )}
                >
                  الصفحة التالية
                </a>
              ) : (
                <span className="inline-flex min-h-11 min-w-[6rem] items-center justify-end text-sm text-ink-400" aria-hidden>
                  —
                </span>
              )}
            </nav>
          )}
        </section>
      ) : null}
    </div>
  )
}

export { SearchPageView }

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildSearchHref } from '@/lib/search/params'
import type { PublicFilterOption } from '@/lib/search/run-search'
import { cn } from '@/lib/utils/cn'

export type SearchFormProps = {
  query: string
  category: string | null
  agency: string | null
  center: string | null
  categories: PublicFilterOption[]
  agencies: PublicFilterOption[]
  serviceCenters: PublicFilterOption[]
  className?: string
}

/**
 * Native GET search + filters — works without client JavaScript.
 */
function SearchForm({
  query,
  category,
  agency,
  center,
  categories,
  agencies,
  serviceCenters,
  className,
}: SearchFormProps) {
  return (
    <form
      id="public-search"
      action="/search"
      method="get"
      role="search"
      className={cn('flex w-full flex-col gap-4', className)}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
        <label htmlFor="search-q" className="sr-only">
          ابحث عن معاملة
        </label>
        <Input
          id="search-q"
          name="q"
          type="search"
          defaultValue={query}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="اكتب اسم المعاملة أو اسماً شائعاً…"
          className="h-14 min-h-14 flex-1 text-base"
        />
        <Button type="submit" className="h-14 min-h-14 shrink-0 px-6">
          بحث
        </Button>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-ink-900">تصفية النتائج</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <label htmlFor="search-category" className="mb-1 block text-xs text-ink-600">
              التصنيف
            </label>
            <select
              id="search-category"
              name="category"
              defaultValue={category ?? ''}
              className={cn(
                'h-12 w-full min-w-0 max-w-full rounded-[0.8125rem] border border-input bg-surface px-3 text-sm text-ink-950',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
              )}
            >
              <option value="">الكل</option>
              {categories.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="search-agency" className="mb-1 block text-xs text-ink-600">
              الجهة
            </label>
            <select
              id="search-agency"
              name="agency"
              defaultValue={agency ?? ''}
              className={cn(
                'h-12 w-full min-w-0 max-w-full rounded-[0.8125rem] border border-input bg-surface px-3 text-sm text-ink-950',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
              )}
            >
              <option value="">الكل</option>
              {agencies.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="search-center" className="mb-1 block text-xs text-ink-600">
              مركز الخدمة
            </label>
            <select
              id="search-center"
              name="center"
              defaultValue={center ?? ''}
              className={cn(
                'h-12 w-full min-w-0 max-w-full rounded-[0.8125rem] border border-input bg-surface px-3 text-sm text-ink-950',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
              )}
            >
              <option value="">الكل</option>
              {serviceCenters.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(category || agency || center) && (
          <p className="mt-3">
            <a
              href={buildSearchHref({ q: query })}
              className="text-sm text-brand-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
            >
              مسح التصفية
            </a>
          </p>
        )}
      </fieldset>
    </form>
  )
}

export { SearchForm }

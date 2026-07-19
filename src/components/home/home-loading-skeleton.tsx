import { cn } from '@/lib/utils/cn'

/**
 * Accessible home loading skeleton — used for soft-navigation UX previews
 * and QA (`?qaLoading=1`). Not mounted via route-level loading.tsx so
 * no-JS users receive the full SSR home document instead of a streaming shell.
 */
export function HomeLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('bg-ivory', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-loading="home"
    >
      <span className="sr-only">عم نحضر الصفحة…</span>

      {/* Hero skeleton — proportions close to HomeHero */}
      <section className="waraqa-container flex flex-col gap-5 py-10 md:gap-6 md:py-14" aria-hidden="true">
        <div className="h-7 w-44 animate-pulse rounded-md bg-brand-100 motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-9 max-w-[22rem] animate-pulse rounded-lg bg-brand-100 motion-reduce:animate-none sm:max-w-[28rem] md:h-11 md:max-w-[36rem]" />
          <div className="h-9 max-w-[16rem] animate-pulse rounded-lg bg-brand-50 motion-reduce:animate-none md:max-w-[24rem]" />
        </div>
        <div className="h-16 max-w-[36rem] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="flex w-full max-w-[40rem] flex-col gap-3 sm:flex-row">
          <div className="h-14 min-h-14 flex-1 animate-pulse rounded-[0.8125rem] border border-border bg-surface motion-reduce:animate-none" />
          <div className="h-14 min-h-14 w-full animate-pulse rounded-[0.8125rem] bg-brand-200 motion-reduce:animate-none sm:w-28" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-11 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="h-11 w-28 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="h-11 w-20 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        </div>
        <div className="h-14 max-w-3xl animate-pulse rounded-lg bg-muted/80 motion-reduce:animate-none" />
      </section>

      {/* Following section skeleton (categories-like) */}
      <section className="border-t border-border/60 bg-surface" aria-hidden="true">
        <div className="waraqa-container py-12 md:py-16">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-brand-100 motion-reduce:animate-none" />
          <div className="mt-2 h-5 max-w-md animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[7.5rem] animate-pulse rounded-xl border border-border/80 bg-ivory/40 p-4 motion-reduce:animate-none"
              >
                <div className="size-10 rounded-lg bg-brand-50" />
                <div className="mt-3 h-5 w-2/3 rounded bg-brand-100" />
                <div className="mt-2 h-10 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

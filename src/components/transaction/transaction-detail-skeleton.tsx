import { cn } from '@/lib/utils/cn'

/**
 * Detail loading skeleton for soft-nav / QA (`?qaLoading=1`).
 * Not mounted via route-level loading.tsx — preserves no-JS full SSR documents.
 */
export function TransactionDetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('waraqa-container py-8 md:py-12', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-transaction-loading
    >
      <span className="sr-only">جاري تحميل صفحة المعاملة…</span>
      <div className="mx-auto w-full min-w-0 max-w-5xl" aria-hidden="true">
        <div className="h-4 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-6 space-y-3 border-b border-border/60 pb-8">
          <div className="h-9 max-w-[28rem] animate-pulse rounded-lg bg-brand-100 motion-reduce:animate-none" />
          <div className="h-5 max-w-[36rem] animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-5 max-w-[24rem] animate-pulse rounded bg-muted/80 motion-reduce:animate-none" />
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-8 w-28 animate-pulse rounded-md bg-ivory motion-reduce:animate-none" />
            <div className="h-8 w-32 animate-pulse rounded-md bg-ivory motion-reduce:animate-none" />
            <div className="h-8 w-36 animate-pulse rounded-md bg-ivory motion-reduce:animate-none" />
          </div>
          <div className="mt-5 h-14 animate-pulse rounded-[0.8125rem] border border-border/60 bg-ivory/60 motion-reduce:animate-none" />
        </div>
        <div className="mt-10 flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-6 w-40 animate-pulse rounded bg-brand-100 motion-reduce:animate-none" />
              <div className="mt-3 min-h-[5.5rem] animate-pulse rounded-[0.8125rem] border border-border/80 bg-surface p-4 motion-reduce:animate-none">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="mt-3 h-3 w-full rounded bg-muted/70" />
                <div className="mt-2 h-3 w-5/6 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

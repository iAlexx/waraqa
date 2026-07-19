import { FALLBACK_BADGE } from '@/lib/public/site-settings-map'
import { cn } from '@/lib/utils/cn'

export type IndependenceBadgeProps = {
  className?: string
  label?: string
  compact?: boolean
}

/** Compact independence badge — text + border; not color-only. */
function IndependenceBadge({
  className,
  label = FALLBACK_BADGE,
  compact = true,
}: IndependenceBadgeProps) {
  return (
    <span
      data-independence-badge=""
      className={cn(
        'inline-flex max-w-full items-center border border-brand-800/35 bg-brand-50 text-brand-950',
        compact
          ? 'rounded-md px-2 py-1 text-[0.6875rem] font-semibold leading-snug'
          : 'rounded-lg px-3 py-1.5 text-xs font-semibold leading-snug',
        className,
      )}
    >
      {label}
    </span>
  )
}

export { IndependenceBadge }

import { WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'
import { cn } from '@/lib/utils/cn'

export type GeometricDividerProps = {
  className?: string
  tone?: 'gold' | 'brand' | 'ivory'
}

const toneClass = {
  gold: 'text-gold-600',
  brand: 'text-brand-800',
  ivory: 'text-ivory/85',
} as const

/**
 * Horizontal divider: small diamond — line — central interlaced star — line — diamond.
 * Desktop ~220–280px · Mobile ~150–190px · Star ~64–88px.
 */
function GeometricDivider({ className, tone = 'gold' }: GeometricDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'mx-auto flex w-[min(100%,11.5rem)] items-center justify-center gap-2 py-3 md:w-[min(100%,16.5rem)] md:gap-3',
        toneClass[tone],
        className,
      )}
    >
      <svg
        viewBox="0 0 12 20"
        className="h-3.5 w-2.5 shrink-0 md:h-4 md:w-3"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 1 L10 10 L6 19 L2 10 Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="h-px min-w-[1.75rem] flex-1 bg-current opacity-70 md:min-w-[2.5rem]" />
      <WaraqaStarMotif
        tone="current"
        className="size-16 shrink-0 md:size-[5.25rem]"
      />
      <span className="h-px min-w-[1.75rem] flex-1 bg-current opacity-70 md:min-w-[2.5rem]" />
      <svg
        viewBox="0 0 12 20"
        className="h-3.5 w-2.5 shrink-0 md:h-4 md:w-3"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 1 L10 10 L6 19 L2 10 Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export { GeometricDivider }

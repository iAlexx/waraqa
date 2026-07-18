import { WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'
import { cn } from '@/lib/utils/cn'

export type HeroCornerMotifsProps = {
  className?: string
}

/**
 * Light hero decoration: maximum two partial interlaced stars at outer corners.
 * Center content stays clear. Opacity ~2.5–4%.
 */
function HeroCornerMotifs({ className }: HeroCornerMotifsProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        className,
      )}
    >
      {/* Desktop: inline-end (right in LTR / visual start in RTL is physical left for Arabic…)
          Use logical corners: start-top and end-bottom for RTL-friendly placement. */}
      <WaraqaStarMotif
        tone="gold"
        className="absolute -top-10 -end-8 size-[11rem] opacity-[0.032] md:-top-12 md:-end-10 md:size-[14rem] md:opacity-[0.036]"
      />
      <WaraqaStarMotif
        tone="gold"
        className="absolute -bottom-12 -start-10 size-[9rem] opacity-[0.028] md:-bottom-14 md:-start-12 md:size-[12rem] md:opacity-[0.032]"
      />
    </div>
  )
}

export { HeroCornerMotifs }

import { WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'
import { cn } from '@/lib/utils/cn'

export type DarkBandMotifsProps = {
  className?: string
}

/**
 * Dark feature-band decoration — sparse composition, no giant repeating tiles.
 * Desktop: large motif at inline-end + smaller at opposite edge + tiny diamonds.
 * Mobile: one large near top + one small near bottom.
 */
function DarkBandMotifs({ className }: DarkBandMotifsProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.1]',
        className,
      )}
    >
      {/* Large — partially visible near inline-end (desktop) / top (mobile) */}
      <WaraqaStarMotif
        tone="gold-light"
        className="absolute -top-16 end-[-3.5rem] size-[13rem] md:-top-8 md:end-[-2.5rem] md:size-[17rem]"
      />
      {/* Smaller — opposite edge */}
      <WaraqaStarMotif
        tone="gold-light"
        className="absolute bottom-4 start-3 size-[4.5rem] opacity-80 md:bottom-auto md:top-1/2 md:start-6 md:size-[7rem] md:-translate-y-1/2"
      />
      {/* Tiny outer-diamond accents (compact star crops) */}
      <WaraqaStarMotif
        tone="gold-light"
        className="absolute top-6 start-1/2 hidden size-10 -translate-x-1/2 opacity-60 md:block"
      />
      <WaraqaStarMotif
        tone="gold-light"
        className="absolute bottom-8 end-1/3 size-8 opacity-50 md:bottom-6 md:end-1/4 md:size-9"
      />
    </div>
  )
}

export { DarkBandMotifs }

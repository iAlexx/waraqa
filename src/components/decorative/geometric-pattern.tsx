import { cn } from '@/lib/utils/cn'

export type GeometricPatternProps = {
  className?: string
  tone?: 'light' | 'dark'
  size?: number
  opacity?: number
  fade?: 'corners' | 'none'
  responsive?: boolean
}

/**
 * @deprecated Prefer HeroCornerMotifs / DarkBandMotifs — no giant tiled wallpaper.
 * Kept for rare opt-in PatternedSurface usage; tiles are single interlaced stars.
 */
const tileSrc = {
  light: '/brand/waraqa-interlaced-star.svg',
  dark: '/brand/waraqa-interlaced-star-dark.svg',
} as const

function GeometricPattern({
  className,
  tone = 'light',
  size = 360,
  opacity = 0.03,
  fade = 'none',
  responsive = false,
}: GeometricPatternProps) {
  const fadeMask =
    fade === 'corners'
      ? 'radial-gradient(ellipse 68% 62% at 50% 42%, transparent 0%, transparent 42%, rgba(0,0,0,0.35) 72%, #000 100%)'
      : undefined

  return (
    <div
      aria-hidden="true"
      data-pattern-tone={tone}
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        responsive && 'waraqa-pattern-responsive',
        className,
      )}
      style={{
        opacity,
        backgroundImage: `url("${tileSrc[tone]}")`,
        backgroundSize: `${size}px ${size}px`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        ...(fadeMask
          ? {
              maskImage: fadeMask,
              WebkitMaskImage: fadeMask,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }
          : {}),
      }}
    />
  )
}

export { GeometricPattern }

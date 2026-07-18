import type { ReactNode } from 'react'

import { GeometricPattern } from '@/components/decorative/geometric-pattern'
import { cn } from '@/lib/utils/cn'

export type PatternedSurfaceProps = {
  children?: ReactNode
  className?: string
  contentClassName?: string
  variant?: 'light' | 'dark' | 'muted'
  /** Larger tiles reduce repetition noise */
  density?: 'compact' | 'regular' | 'spacious'
  fade?: 'corners' | 'none'
  /** When false, solid surface only (default calm canvas) */
  showPattern?: boolean
  id?: string
}

const variantStyles = {
  light: {
    surface: 'bg-ivory text-ink-950',
    tone: 'light' as const,
    opacity: 0.035,
  },
  muted: {
    surface: 'bg-canvas text-ink-950',
    tone: 'light' as const,
    opacity: 0.03,
  },
  dark: {
    surface: 'bg-brand-950 text-ivory',
    tone: 'dark' as const,
    opacity: 0.115,
  },
} as const

const densitySize = {
  compact: 280,
  regular: 320,
  spacious: 360,
} as const

/**
 * Surface with optional geometric atmosphere.
 * Pattern is off by default — enable only for controlled brand moments.
 */
function PatternedSurface({
  children,
  className,
  contentClassName,
  variant = 'light',
  density = 'regular',
  fade = 'none',
  showPattern = false,
  id,
}: PatternedSurfaceProps) {
  const styles = variantStyles[variant]
  const size = densitySize[density]

  return (
    <div
      id={id}
      className={cn('relative overflow-hidden', styles.surface, className)}
    >
      {showPattern ? (
        <GeometricPattern
          tone={styles.tone}
          size={size}
          opacity={styles.opacity}
          fade={fade}
          responsive
        />
      ) : null}
      <div className={cn('relative z-[1]', contentClassName)}>{children}</div>
    </div>
  )
}

export { PatternedSurface }

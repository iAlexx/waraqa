import { cn } from '@/lib/utils/cn'

export type WaraqaStarMotifProps = {
  className?: string
  tone?: 'gold' | 'gold-light' | 'current'
  size?: number
}

const strokeFor = {
  gold: '#B58C42',
  'gold-light': '#E6C97A',
  current: 'currentColor',
} as const

/** Interlaced diamond layers — not a single perimeter star path. */
const INTERLACED_LAYERS = {
  vertical: 'M 120 26 L 144 120 L 120 214 L 96 120 Z',
  horizontal: 'M 38 120 L 120 98 L 202 120 L 120 142 Z',
  diagonal: 'M 120 48 L 138 120 L 120 192 L 102 120 Z',
  outerTop: 'M 120 6 L 125 18 L 120 30 L 115 18 Z',
  outerRight: 'M 210 120 L 222 115 L 234 120 L 222 125 Z',
  outerBottom: 'M 120 210 L 125 222 L 120 234 L 115 222 Z',
  outerLeft: 'M 6 120 L 18 115 L 30 120 L 18 125 Z',
} as const

/**
 * Decorative interlaced star — overlapping open diamonds + center circle.
 * Outline only; aria-hidden; pointer-events-none.
 */
function WaraqaStarMotif({
  className,
  tone = 'gold',
  size,
}: WaraqaStarMotifProps) {
  const stroke = strokeFor[tone]

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      data-waraqa-motif="interlaced-star"
      className={cn('pointer-events-none', className)}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path data-layer="vertical" d={INTERLACED_LAYERS.vertical} />
        <path data-layer="horizontal" d={INTERLACED_LAYERS.horizontal} />
        <path
          data-layer="diagonal-pos"
          transform="rotate(45 120 120)"
          d={INTERLACED_LAYERS.diagonal}
        />
        <path
          data-layer="diagonal-neg"
          transform="rotate(-45 120 120)"
          d={INTERLACED_LAYERS.diagonal}
        />
        <circle data-layer="center" cx="120" cy="120" r="10" />
        <path data-layer="outer-top" d={INTERLACED_LAYERS.outerTop} />
        <path data-layer="outer-right" d={INTERLACED_LAYERS.outerRight} />
        <path data-layer="outer-bottom" d={INTERLACED_LAYERS.outerBottom} />
        <path data-layer="outer-left" d={INTERLACED_LAYERS.outerLeft} />
      </g>
    </svg>
  )
}

export { WaraqaStarMotif, INTERLACED_LAYERS }

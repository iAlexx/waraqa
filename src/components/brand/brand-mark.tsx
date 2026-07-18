import { cn } from '@/lib/utils/cn'

export type BrandMarkProps = {
  className?: string
  size?: 'footer' | 'compact' | 'default' | 'hero' | 'min'
  variant?: 'primary' | 'reversed' | 'ink'
}

const sizeClass = {
  min: 'text-[1.25rem] font-bold leading-none',
  footer: 'text-[1.625rem] font-bold leading-none md:text-[1.875rem]',
  compact: 'text-[2rem] font-bold leading-none md:text-[2.5rem]',
  default: 'text-[2.25rem] font-bold leading-none md:text-[2.625rem]',
  hero: 'text-[clamp(4.5rem,9vw,6rem)] font-bold leading-[1.2]',
} as const

/**
 * Explicit semantic colors — applied last so parents cannot force danger/red.
 * Aref Ruqaa Ink is a COLR font; font-palette overrides neutralize built-in ink red.
 */
const variantClass = {
  primary:
    'text-brand-900 !text-brand-900 [color:var(--color-brand-900)] [font-palette:--waraqa-wm-primary]',
  reversed:
    'text-ivory !text-ivory [color:var(--color-ivory)] [font-palette:--waraqa-wm-reversed]',
  ink: 'text-ink-950 !text-ink-950 [color:var(--color-ink-950)] [font-palette:--waraqa-wm-ink]',
} as const

/**
 * Official Waraqa brand mark «ورقة» — Aref Ruqaa Ink Bold (700) only.
 * Not for ordinary headings or UI copy. Never red / danger / gradient.
 */
function BrandMark({
  className,
  size = 'default',
  variant = 'primary',
}: BrandMarkProps) {
  return (
    <span
      data-brand-mark=""
      data-brand-variant={variant}
      className={cn(
        'font-wordmark tracking-normal [text-shadow:none] [filter:none] [mix-blend-mode:normal]',
        sizeClass[size],
        className,
        variantClass[variant],
      )}
    >
      ورقة
    </span>
  )
}

export { BrandMark }

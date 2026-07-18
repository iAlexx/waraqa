import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const cardVariants = cva(
  'rounded-[var(--radius-card)] border border-border/80 bg-card text-card-foreground',
  {
    variants: {
      variant: {
        plain: 'p-5 shadow-none',
        interactive:
          'p-5 transition-colors hover:border-brand-700/30 hover:bg-brand-50/40 focus-within:ring-2 focus-within:ring-ring',
        selected: 'p-5 border-brand-800 bg-brand-50 shadow-[var(--shadow-sm)]',
        muted: 'border-transparent bg-ivory/90 p-5',
        compact: 'p-3.5',
      },
    },
    defaultVariants: {
      variant: 'plain',
    },
  },
)

export type CardProps = React.ComponentProps<'div'> &
  VariantProps<typeof cardVariants>

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'font-display text-lg font-semibold leading-snug text-brand-900',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('mt-1.5 text-sm leading-relaxed text-ink-700', className)} {...props} />
  )
}

export { Card, CardTitle, CardDescription, cardVariants }

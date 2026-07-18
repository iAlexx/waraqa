import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex h-7 items-center rounded-md border px-2.5 text-[0.8125rem] font-medium leading-none',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-ink-700',
        verified: 'border-success/35 bg-success/10 text-success',
        review: 'border-info/35 bg-info/10 text-info',
        warning: 'border-warning/40 bg-warning/10 text-warning',
        error: 'border-danger/35 bg-danger/10 text-danger',
        new: 'border-brand-700/25 bg-brand-50 text-brand-800',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

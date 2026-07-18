import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  ShieldAlertIcon,
  BookMarkedIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils/cn'

const calloutVariants = cva(
  'flex gap-3 rounded-[var(--radius-card)] border-s-[3px] border border-transparent bg-surface p-3.5 text-sm leading-relaxed text-ink-950',
  {
    variants: {
      variant: {
        information: 'border-s-info bg-info/[0.06]',
        source: 'border-s-brand-700 bg-ivory',
        warning: 'border-s-warning bg-warning/[0.08]',
        success: 'border-s-success bg-success/[0.08]',
        danger: 'border-s-danger bg-danger/[0.07]',
      },
    },
    defaultVariants: {
      variant: 'information',
    },
  },
)

const icons = {
  information: InfoIcon,
  source: BookMarkedIcon,
  warning: AlertTriangleIcon,
  success: CheckCircle2Icon,
  danger: ShieldAlertIcon,
} as const

export type CalloutProps = React.ComponentProps<'aside'> &
  VariantProps<typeof calloutVariants> & {
    title?: string
  }

function Callout({
  className,
  variant = 'information',
  title,
  children,
  ...props
}: CalloutProps) {
  const resolved = variant ?? 'information'
  const Icon = icons[resolved]

  return (
    <aside
      data-slot="callout"
      role="note"
      className={cn(calloutVariants({ variant: resolved }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0">
        {title ? (
          <p className="mb-0.5 font-semibold text-ink-950">{title}</p>
        ) : null}
        <div className="text-ink-700">{children}</div>
      </div>
    </aside>
  )
}

export { Callout, calloutVariants }

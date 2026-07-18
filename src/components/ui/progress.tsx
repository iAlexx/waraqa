'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils/cn'

export type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  value: number
  label: string
  max?: number
}

function Progress({
  className,
  value,
  label,
  max = 100,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(value, max))
  const percent = Math.round((clamped / max) * 100)

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-ink-950">{label}</span>
        <span className="text-ink-700" aria-hidden="true">
          اكتمل {percent}٪
        </span>
      </div>
      <ProgressPrimitive.Root
        data-slot="progress"
        value={clamped}
        max={max}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-label={label}
        className="relative h-3.5 w-full overflow-hidden rounded-full bg-brand-100"
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full bg-brand-800 transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export { Progress }

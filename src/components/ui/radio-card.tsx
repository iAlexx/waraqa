'use client'

import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { CircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

export type RadioCardOption = {
  value: string
  title: string
  description?: string
}

function RadioCardGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-card-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  )
}

function RadioCardItem({
  className,
  title,
  description,
  value,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  title: string
  description?: string
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      data-slot="radio-card-item"
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-[1rem] border border-border bg-card p-4 text-start transition-colors',
        'hover:border-brand-700/30 hover:bg-brand-50/50 focus-visible:outline-none data-[state=checked]:border-brand-800 data-[state=checked]:bg-brand-50 data-[state=checked]:shadow-[var(--shadow-sm)]',
        'min-h-11 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input bg-surface group-data-[state=checked]:border-brand-800">
        <CircleIcon className="size-2.5 fill-brand-800 text-brand-800 opacity-0 group-data-[state=checked]:opacity-100" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold text-ink-950">{title}</span>
        {description ? (
          <span className="text-sm leading-relaxed text-ink-700">{description}</span>
        ) : null}
      </span>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioCardGroup, RadioCardItem }

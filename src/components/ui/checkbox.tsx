'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'
import { Label } from '@/components/ui/field'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 rounded-[6px] border border-input bg-surface shadow-none transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-800 data-[state=checked]:bg-brand-800 data-[state=checked]:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export type CheckboxFieldProps = {
  id: string
  label: string
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  error?: string
  onCheckedChange?: (checked: boolean) => void
}

function CheckboxField({
  id,
  label,
  checked,
  defaultChecked,
  disabled,
  error,
  onCheckedChange,
}: CheckboxFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="min-h-11 cursor-pointer py-1.5 text-[0.9375rem] leading-relaxed text-ink-950">
          {label}
        </Label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Checkbox, CheckboxField }

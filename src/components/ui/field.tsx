import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils/cn'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-[0.9375rem] font-medium leading-snug text-ink-950 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export type FieldProps = {
  id: string
  label: string
  required?: boolean
  helperText?: string
  error?: string
  children: React.ReactNode
  className?: string
}

function Field({
  id,
  label,
  required,
  helperText,
  error,
  children,
  className,
}: FieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ms-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ms-1 text-sm font-normal text-ink-500">
            (اختياري)
          </span>
        )}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              id,
              'aria-invalid': Boolean(error) || undefined,
              'aria-describedby': describedBy,
              'aria-required': required || undefined,
            },
          )
        : children}
      {helperText ? (
        <p id={helperId} className="text-[0.875rem] leading-relaxed text-ink-700">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="text-[0.875rem] font-medium leading-relaxed text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Label, Field }

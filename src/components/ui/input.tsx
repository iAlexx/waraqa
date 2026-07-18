import * as React from 'react'

import { cn } from '@/lib/utils/cn'

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full min-w-0 rounded-[0.8125rem] border border-input bg-surface px-3.5 py-2.5 text-base text-ink-950 shadow-none transition-[border-color,box-shadow] placeholder:text-ink-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

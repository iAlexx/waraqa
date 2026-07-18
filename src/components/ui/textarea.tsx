import * as React from 'react'

import { cn } from '@/lib/utils/cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-32 w-full resize-y rounded-[0.8125rem] border border-input bg-surface px-3.5 py-3 text-base leading-[1.8] text-ink-950 transition-[border-color,box-shadow] placeholder:text-ink-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

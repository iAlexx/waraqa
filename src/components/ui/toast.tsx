'use client'

import * as React from 'react'
import { Toaster as Sonner, toast } from 'sonner'

import { cn } from '@/lib/utils/cn'

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ className, ...props }: ToasterProps) {
  return (
    <Sonner
      dir="rtl"
      theme="light"
      className={cn('toaster group', className)}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group toast !w-[min(100%,22rem)] !border !border-border !bg-surface !text-ink-950 shadow-[var(--shadow-md)] !rounded-[0.875rem] !px-3.5 !py-3 !text-sm',
          title: '!text-ink-950 !text-sm !font-medium',
          description: '!text-ink-700 !text-sm',
          actionButton: '!bg-brand-800 !text-white',
          cancelButton: '!bg-brand-50 !text-brand-900',
          closeButton: '!bg-surface !border-border !text-ink-700',
          success: '!bg-surface !text-ink-950 !border-success/35',
          error: '!bg-surface !text-ink-950 !border-danger/35',
          info: '!bg-surface !text-ink-950 !border-info/35',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

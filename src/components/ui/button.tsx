import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-[0.8125rem] text-[0.9375rem] font-semibold leading-none',
    'transition-[background-color,box-shadow,border-color,color] duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    'min-h-12 min-w-11 px-5 py-2.5',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-brand-800 text-white shadow-[var(--shadow-sm)] hover:bg-brand-900 hover:shadow-[var(--shadow-md)] active:bg-brand-950',
        secondary:
          'border border-brand-700/25 bg-brand-50 text-brand-900 hover:bg-brand-100 hover:border-brand-700/40',
        outline:
          'border border-brand-800/30 bg-surface text-brand-900 hover:bg-brand-50 hover:border-brand-800/50',
        ghost: 'bg-transparent text-brand-900 hover:bg-brand-50',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[var(--shadow-sm)] hover:bg-danger/90',
        link: 'min-h-0 min-w-0 px-0 text-brand-800 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-11 min-h-11 px-3.5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11 min-h-11 min-w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingLabel?: string
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel = 'عم نحفظ…',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }

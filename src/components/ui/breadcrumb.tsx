import { ChevronLeftIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
  label?: string
}

function Breadcrumb({
  items,
  className,
  label = 'مسار التنقل',
}: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? (
                <ChevronLeftIcon
                  className="size-3.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              ) : null}
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'max-w-[16rem] truncate',
                    isCurrent && 'font-medium text-foreground',
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="max-w-[16rem] truncate underline-offset-4 hover:underline"
                >
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumb }

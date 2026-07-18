import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils/cn'

export type SiteHeaderProps = {
  className?: string
}

function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/70 bg-surface/95 backdrop-blur-sm',
        className,
      )}
    >
      <div className="waraqa-container flex h-16 items-center md:h-[4rem]">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none"
        >
          <BrandMark size="compact" variant="primary" />
        </Link>
      </div>
    </header>
  )
}

export { SiteHeader }

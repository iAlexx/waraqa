import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils/cn'

export type ComingSoonPageProps = {
  title: string
  description: string
  phaseNote?: string
  className?: string
}

/** Honest informational placeholder — not a fake feature. */
function ComingSoonPage({
  title,
  description,
  phaseNote,
  className,
}: ComingSoonPageProps) {
  return (
    <div className={cn('waraqa-container py-12 md:py-16', className)}>
      <BrandMark size="compact" variant="primary" className="mb-6" />
      <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-700">
        {description}
      </p>
      {phaseNote ? (
        <p className="mt-4 max-w-2xl text-sm text-ink-600" role="status">
          {phaseNote}
        </p>
      ) : null}
      <p className="mt-8">
        <Link
          href="/"
          className="font-semibold text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
        >
          العودة للصفحة الرئيسية
        </Link>
      </p>
    </div>
  )
}

export { ComingSoonPage }

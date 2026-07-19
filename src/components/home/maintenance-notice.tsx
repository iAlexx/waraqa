import Link from 'next/link'

import { IndependenceBadge } from '@/components/layout/independence-badge'
import { FALLBACK_BADGE } from '@/lib/public/site-settings-map'
import { cn } from '@/lib/utils/cn'

export type MaintenanceNoticeProps = {
  className?: string
}

function MaintenanceNotice({ className }: MaintenanceNoticeProps) {
  return (
    <section
      aria-labelledby="maintenance-heading"
      className={cn('bg-ivory', className)}
      data-maintenance=""
    >
      <div className="waraqa-container flex max-w-2xl flex-col gap-4 py-16 md:py-20">
        <IndependenceBadge label={FALLBACK_BADGE} />
        <h1
          id="maintenance-heading"
          className="font-display text-2xl font-bold text-ink-950 md:text-3xl"
        >
          الموقع تحت صيانة مؤقتة
        </h1>
        <p className="text-[1.0625rem] leading-relaxed text-ink-700">
          عم نحدّث المحتوى أو البنية. الرجاء المحاولة لاحقاً. لوحة الإدارة تبقى
          متاحة للفريق التحريري.
        </p>
        <p className="text-sm text-ink-600">
          إن كنت من فريق ورقة:{' '}
          <Link
            href="/admin"
            className="font-semibold text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
          >
            الدخول إلى /admin
          </Link>
        </p>
      </div>
    </section>
  )
}

export { MaintenanceNotice }

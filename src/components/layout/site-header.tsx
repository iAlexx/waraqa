import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'
import { IndependenceBadge } from '@/components/layout/independence-badge'
import { FALLBACK_BADGE } from '@/lib/public/site-settings-map'
import type { PublicSiteSettings } from '@/lib/public/site-settings-map'
import { cn } from '@/lib/utils/cn'

export type SiteHeaderProps = {
  className?: string
  settings: Pick<PublicSiteSettings, 'siteName'>
  currentPath?: string
}

const NAV = [
  { href: '/#categories', label: 'التصنيفات', match: '/categories' },
  { href: '/#how-it-works', label: 'كيف بتشتغل ورقة؟', match: '#how-it-works' },
  { href: '/about', label: 'عن ورقة', match: '/about' },
] as const

const MOBILE_NAV_ID = 'waraqa-mobile-nav'

function navIsActive(currentPath: string, item: (typeof NAV)[number]): boolean {
  if (item.match.startsWith('#')) return false
  if (item.match === '/about') return currentPath === '/about' || currentPath.startsWith('/about/')
  if (item.match === '/categories') {
    return currentPath === '/categories' || currentPath.startsWith('/categories/')
  }
  return false
}

/**
 * Mobile nav: checkbox + labels (no JavaScript).
 *
 * Critical: backdrop + drawer MUST NOT live inside the sticky/backdrop-blur header.
 * `backdrop-filter` / `filter` make `position: fixed` descendants use the header as
 * containing block (~64px tall), which clips the drawer to the chrome row only.
 */
function SiteHeader({ className, settings, currentPath = '/' }: SiteHeaderProps) {
  const homeLabel = settings.siteName || 'ورقة'

  const linkClass = cn(
    'block w-full rounded-md px-3 py-3 text-sm font-medium leading-snug text-ink-900 text-start',
    'hover:bg-brand-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
  )

  return (
    <>
      {/* Viewport-fixed overlays — sibling group outside header blur/sticky. */}
      <div className="lg:hidden" data-mobile-nav-root="">
        <input
          id={MOBILE_NAV_ID}
          type="checkbox"
          className="peer/nav sr-only"
          aria-controls="waraqa-mobile-nav-panel"
        />

        <label
          htmlFor={MOBILE_NAV_ID}
          className={cn(
            'fixed inset-0 z-[60] hidden cursor-pointer bg-ink-950/50',
            'peer-checked/nav:block',
          )}
          aria-label="إغلاق قائمة التنقل"
          data-mobile-nav-backdrop=""
        />

        <div
          id="waraqa-mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="قائمة الجوال"
          data-mobile-nav-panel=""
          className={cn(
            'fixed inset-y-0 left-0 z-[70] hidden min-w-[17.5rem] w-[min(100vw-2.5rem,20rem)] max-w-[20rem] flex-col',
            'border-e border-border bg-surface text-ink-950 shadow-[var(--shadow-md)]',
            'peer-checked/nav:flex',
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
            <p className="font-display text-base font-semibold text-ink-950">القائمة</p>
            <label
              htmlFor={MOBILE_NAV_ID}
              tabIndex={0}
              className={cn(
                'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-sm font-medium text-brand-900',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
              )}
            >
              إغلاق
            </label>
          </div>
          <nav
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3"
            aria-label="قائمة الجوال"
          >
            <Link href="/#hero-search" className={linkClass}>
              بحث
            </Link>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-border pt-3">
              <IndependenceBadge label={FALLBACK_BADGE} className="max-w-full whitespace-normal" />
            </div>
          </nav>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-40 border-b border-border/70 bg-surface/95 backdrop-blur-sm',
          className,
        )}
      >
        <div className="waraqa-container flex h-16 max-h-16 items-center justify-between gap-3">
          <Link
            href="/"
            aria-label={`${homeLabel} — الصفحة الرئيسية`}
            className="inline-flex min-h-11 min-w-0 shrink items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
          >
            <BrandMark size="compact" variant="primary" />
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
            <Link
              href="/#hero-search"
              className={cn(
                'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink-800',
                'underline-offset-4 hover:bg-brand-50 hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
              )}
            >
              بحث
            </Link>
            {NAV.map((item) => {
              const active = navIsActive(currentPath, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink-800',
                    'underline-offset-4 hover:bg-brand-50',
                    active && 'bg-brand-50 font-semibold underline decoration-2 decoration-brand-800',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <IndependenceBadge label={FALLBACK_BADGE} className="ms-2 max-w-[12rem] truncate" />
          </nav>

          <label
            htmlFor={MOBILE_NAV_ID}
            tabIndex={0}
            className={cn(
              'flex size-11 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-brand-900 lg:hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
            )}
            aria-label="فتح قائمة التنقل"
          >
            <span className="sr-only">القائمة</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
              <path
                d="M3 5.5h14M3 10h14M3 14.5h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </label>
        </div>
      </header>
    </>
  )
}

export { SiteHeader }

import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'
import type { PublicSiteSettings } from '@/lib/public/site-settings-map'
import { cn } from '@/lib/utils/cn'

export type SiteFooterProps = {
  className?: string
  settings: Pick<
    PublicSiteSettings,
    | 'footerDisclaimer'
    | 'independenceDisclaimer'
    | 'contactEmail'
    | 'supportPhone'
    | 'socialLinks'
    | 'settingsUnavailable'
  >
}

const FOOTER_LINKS = [
  { href: '/methodology', label: 'المنهجية' },
  { href: '/about', label: 'عن ورقة' },
  { href: '/privacy', label: 'الخصوصية' },
  { href: '/terms', label: 'الشروط' },
  { href: '/contact', label: 'تواصل' },
] as const

function SiteFooter({ className, settings }: SiteFooterProps) {
  const year = new Date().getFullYear()
  const disclaimer = settings.footerDisclaimer || settings.independenceDisclaimer

  return (
    <footer
      data-site-footer=""
      className={cn('border-t border-border bg-ivory/90', className)}
    >
      <div className="waraqa-container flex flex-col gap-6 py-8 md:py-10">
        <BrandMark size="footer" variant="primary" />

        <p className="max-w-3xl text-sm leading-relaxed text-ink-800" data-footer-disclaimer="">
          {disclaimer}
        </p>

        {settings.settingsUnavailable ? (
          <p className="text-sm text-ink-600" role="status">
            تعذّر تحميل بعض إعدادات الموقع — عُرضت قيم افتراضية آمنة.
          </p>
        ) : null}

        <nav aria-label="روابط التذييل" className="flex flex-wrap gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2 rounded-sm"
            >
              {link.label}
            </Link>
          ))}
          <span
            className="text-sm text-ink-600"
            title="نموذج الإبلاغ عن معلومات قديمة سيُتاح لاحقاً (Phase 10)"
          >
            بلّغ عن معلومة قديمة{' '}
            <span className="font-semibold text-ink-700">(قريباً)</span>
          </span>
        </nav>

        {(settings.contactEmail || settings.supportPhone) && (
          <div className="text-sm text-ink-700">
            {settings.contactEmail ? (
              <p>
                البريد:{' '}
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="font-medium text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
                >
                  {settings.contactEmail}
                </a>
              </p>
            ) : null}
            {settings.supportPhone ? <p className="mt-1">الهاتف: {settings.supportPhone}</p> : null}
          </div>
        )}

        {settings.socialLinks.length > 0 ? (
          <ul className="flex flex-wrap gap-3" aria-label="حسابات التواصل">
            {settings.socialLinks.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-sm font-medium text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-sm text-ink-600">
          © {year} ورقة — منصة إرشادية مستقلة — ليست موقعاً حكومياً
        </p>
      </div>
    </footer>
  )
}

export { SiteFooter }

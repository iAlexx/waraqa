import Link from 'next/link'

import { HeroCornerMotifs } from '@/components/decorative/hero-corner-motifs'
import { IndependenceBadge } from '@/components/layout/independence-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FALLBACK_BADGE, type PublicSiteSettings } from '@/lib/public/site-settings-map'
import { cn } from '@/lib/utils/cn'

export type HomeHeroProps = {
  settings: Pick<
    PublicSiteSettings,
    'independenceDisclaimer' | 'searchExamples' | 'tagline'
  >
  className?: string
}

/**
 * Native GET search entry — submits to `/search` (Phase 6 results).
 */
function HomeHero({ settings, className }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className={cn('relative overflow-hidden bg-ivory', className)}
    >
      <HeroCornerMotifs />
      <div className="relative z-[1] waraqa-container flex flex-col gap-5 py-10 md:gap-6 md:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <IndependenceBadge label={FALLBACK_BADGE} />
        </div>

        <h1
          id="home-hero-heading"
          className="max-w-[22rem] font-display text-[1.75rem] font-bold leading-snug text-ink-950 sm:max-w-[28rem] sm:text-[2rem] md:max-w-[36rem] md:text-[2.375rem]"
        >
          خلّينا نجهز معاملتك قبل ما تطلع
        </h1>

        <p className="max-w-[36rem] text-[1.0625rem] leading-[1.85] text-ink-700 md:text-[1.125rem]">
          ابحث عن المعاملة، جاوب على كم سؤال، وخد قائمة واضحة بالأوراق والخطوات حسب
          حالتك.
        </p>

        <form
          id="hero-search"
          action="/search"
          method="get"
          role="search"
          className="flex w-full max-w-[40rem] flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label htmlFor="home-search-q" className="sr-only">
            ابحث عن معاملة
          </label>
          <Input
            id="home-search-q"
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="اكتب اسم المعاملة… مثل جواز سفر أو لا حكم عليه"
            className="h-14 min-h-14 flex-1 text-base md:text-[1.0625rem]"
          />
          <Button type="submit" className="h-14 min-h-14 shrink-0 px-6 sm:w-auto">
            بحث
          </Button>
        </form>

        {settings.searchExamples.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="أمثلة بحث">
            {settings.searchExamples.map((example) => (
              <li key={example}>
                <a
                  href={`/search?q=${encodeURIComponent(example)}`}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm text-ink-800',
                    'underline-offset-2 hover:bg-brand-50 hover:underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2',
                  )}
                >
                  {example}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <p
          className="max-w-3xl text-sm leading-relaxed text-ink-800"
          data-hero-disclaimer=""
        >
          {settings.independenceDisclaimer}
        </p>

        <p className="max-w-[36rem] text-sm leading-relaxed text-ink-700">
          منصة مستقلة — المعلومات إرشادية، ومتأكد إنك تراجع الجهة الرسمية قبل
          التقديم.
        </p>

        <p>
          <Link
            href="/#categories"
            className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 rounded-sm"
          >
            تصفح حسب التصنيف
          </Link>
        </p>
      </div>
    </section>
  )
}

export { HomeHero }

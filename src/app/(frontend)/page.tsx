import { BrandMark } from '@/components/brand/brand-mark'
import { HeroCornerMotifs } from '@/components/decorative/hero-corner-motifs'
import { HomeStartCta } from '@/components/layout/home-start-cta'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <section className="relative overflow-hidden bg-ivory">
      <HeroCornerMotifs />
      <div className="relative z-[1] mx-auto flex w-full max-w-[52rem] flex-col items-stretch gap-6 px-4 py-12 pb-14 text-start md:items-center md:gap-7 md:px-6 md:py-16 md:pb-20 md:text-center">
        <h1>
          <BrandMark size="hero" variant="primary" />
        </h1>
        <p className="max-w-[34rem] text-[1.0625rem] leading-[1.85] text-ink-700 md:text-[1.125rem]">
          عم نجهّز منصة ورقة لتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.
        </p>
        <HomeStartCta />
        <Card className="w-full max-w-[34rem] border border-border/70 bg-surface text-start shadow-[var(--shadow-sm)]">
          <CardTitle className="font-display text-xl">قريباً</CardTitle>
          <CardDescription className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">
            هالصفحة لسا قيد التجهيز. رح تلاقي الدليل التفاعلي والبحث بعد ما
            نكمّل المراحل الجاية.
          </CardDescription>
        </Card>
      </div>
    </section>
  )
}

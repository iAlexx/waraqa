import { ClipboardList, MessageCircleQuestion, Search } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

const STEPS = [
  {
    title: 'دوّر على معاملتك.',
    body: 'اكتب الاسم الشائع أو الرسمي — ورح نوجّهك للصفحة المناسبة لما يصير البحث جاهز.',
    Icon: Search,
  },
  {
    title: 'جاوب حسب حالتك.',
    body: 'أسئلة قصيرة توضّح وضعك — قريباً ضمن الدليل التفاعلي.',
    Icon: MessageCircleQuestion,
  },
  {
    title: 'جهّز أوراقك وخطواتك.',
    body: 'قائمة واضحة بالمطلوب قبل ما تطلع — حسب حالتك.',
    Icon: ClipboardList,
  },
] as const

export type HomeHowItWorksProps = {
  className?: string
}

function HomeHowItWorks({ className }: HomeHowItWorksProps) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className={cn('border-t border-border/60 bg-surface', className)}
    >
      <div className="waraqa-container py-12 md:py-16">
        <h2
          id="how-heading"
          className="font-display text-2xl font-bold text-ink-950 md:text-[1.75rem]"
        >
          كيف بتشتغل ورقة؟
        </h2>
        <p className="mt-2 max-w-2xl text-ink-700">ثلاث خطوات بسيطة — من البحث للتجهيز.</p>

        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-lg border border-brand-800/25 bg-brand-50 text-brand-900">
                <step.Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                الخطوة {index + 1}
              </p>
              <h3 className="font-display text-lg font-semibold text-ink-950">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export { HomeHowItWorks }

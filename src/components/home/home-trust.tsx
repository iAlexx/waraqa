import { cn } from '@/lib/utils/cn'

const POINTS = [
  {
    title: 'كل ادّعاء مهم له مصدر',
    body: 'المراجع الرسمية تُربط بالمحتوى التحريري — وبتظهر مع تفاصيل المعاملة لما تكتمل صفحات المعاملات.',
  },
  {
    title: 'تاريخ آخر تحقق ظاهر',
    body: 'لمّا تتوفّر بيانات التحقق، بنعرض تاريخ المراجعة عشان تعرف حداثة المعلومة.',
  },
  {
    title: 'الإبلاغ عن معلومة تغيّرت',
    body: 'رح تقدر تبلّغنا إذا لاحظت تغييراً — النموذج الكامل قريباً.',
  },
  {
    title: 'ورقة مستقلة — مو حكومية',
    body: 'منصة إرشادية مستقلة. ما منمثّل أي جهة رسمية، ودائماً تأكد من المصدر الرسمي قبل التقديم.',
  },
] as const

export type HomeTrustProps = {
  className?: string
}

function HomeTrust({ className }: HomeTrustProps) {
  return (
    <section
      id="trust"
      aria-labelledby="trust-heading"
      className={cn('border-t border-border/60 bg-ivory/40', className)}
    >
      <div className="waraqa-container py-12 md:py-16">
        <h2
          id="trust-heading"
          className="font-display text-2xl font-bold text-ink-950 md:text-[1.75rem]"
        >
          ليش تثق بورقة؟
        </h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          وضوح المصادر، تواريخ التحقق، والاستقلالية — بدون ادّعاءات أكبر من الواقع.
        </p>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-xl border border-border/70 bg-surface p-5">
              <h3 className="font-display text-base font-semibold text-ink-950">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export { HomeTrust }

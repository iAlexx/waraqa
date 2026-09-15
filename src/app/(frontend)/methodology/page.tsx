import type { Metadata } from 'next'
import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'

export const metadata: Metadata = {
  title: 'المنهجية',
  description: 'كيف نبني محتوى ورقة: ادّعاء أولاً، مصادر، تواريخ تحقق، وتمييز DEMO عن PRODUCTION.',
}

export default function MethodologyPage() {
  return (
    <div className="waraqa-container py-12 md:py-16">
      <BrandMark size="compact" variant="primary" className="mb-6" />
      <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">المنهجية</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-700">
        نبني الإرشاد على ادّعاءات قابلة للتتبع إلى مصادر، مع تواريخ تحقق ظاهرة — بدون اختراع رسوم أو متطلبات
        غير مؤكدة.
      </p>

      <div className="mt-10 max-w-2xl space-y-8 text-[1.0625rem] leading-relaxed text-ink-800">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">ادّعاء أولاً</h2>
          <p className="mt-2 text-ink-700">
            التفاصيل المهمة (متطلبات، خطوات، رسوم، مدد، أهلية…) تُمثَّل كادّعاءات مرتبطة بأدلة من مصادر.
            ما منعرض تفصيلاً رسمياً كحقيقة مؤكدة بدون مسار تحريري ومصدر.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">المصادر هي المرجع</h2>
          <p className="mt-2 text-ink-700">
            صفحة المعاملة تعرض المصادر وروابطها عندما تكون آمنة (http/https). عند التعارض أو التحديث، المصدر
            الرسمي يبقى أعلى سلطة من نص المنصة.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">تواريخ التحقق</h2>
          <p className="mt-2 text-ink-700">
            نحرص على إظهار تواريخ تحقق/مراجعة حيث يدعمها النموذج التحريري، ونُعلّم الحالات غير المؤكدة أو
            المتعارضة بدل إخفائها.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">DEMO و PRODUCTION</h2>
          <p className="mt-2 text-ink-700">
            محتوى <span className="font-semibold">DEMO</span> للعرض والاختبار ويُعلَّم بوضوح عند إتاحته
            للعامة في وضع العرض. محتوى <span className="font-semibold">PRODUCTION</span> يخضع لبوابات
            أوضح للنشر والعزل. محتوى اختبار داخلي (QA_TEST) لا يُعرض للعامة.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">الاستقلالية</h2>
          <p className="mt-2 text-ink-700">
            ورقة منصة مستقلة. المنهجية هنا وصف لعمل تحريري وتقني — ليست اعتماداً حكومياً ولا شهادة امتثال
            قانونية.
          </p>
        </section>
      </div>

      <p className="mt-10">
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

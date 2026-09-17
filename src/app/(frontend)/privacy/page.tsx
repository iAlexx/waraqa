import type { Metadata } from 'next'
import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'

export const metadata: Metadata = {
  title: 'الخصوصية',
  description:
    'كيف تتعامل ورقة مع بياناتك: منصة مستقلة، بلا رقم وطني، بلا رفع وثائق هوية، وتخزين محلي لاختيارات الدليل.',
}

export default function PrivacyPage() {
  return (
    <div className="waraqa-container py-12 md:py-16">
      <BrandMark size="compact" variant="primary" className="mb-6" />
      <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">الخصوصية</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-700">
        هالصفحة تلخّص سلوك المنصة الفعلي اليوم. ما هي استشارة قانونية سورية رسمية، وقد يلزم رأي مستشار
        مختص لأي امتثال شكلي أوسع.
      </p>

      <div className="mt-10 max-w-2xl space-y-8 text-[1.0625rem] leading-relaxed text-ink-800">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">منصة مستقلة</h2>
          <p className="mt-2 text-ink-700">
            ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. المعلومات للمساعدة في التحضير، والمصادر الرسمية
            تبقى المرجع عند التعارض.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">ما لا نجمعه</h2>
          <ul className="mt-2 list-disc space-y-2 pe-6 text-ink-700">
            <li>ما منطلب رقم وطني عبر المنصة.</li>
            <li>ما في رفع لوثائق هوية أو مرفقات أخرى من الزوّار.</li>
            <li>ما في حسابات مواطنين لتسجيل الدخول على الواجهة العامة.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">الإبلاغ عن معلومة تغيّرت</h2>
          <p className="mt-2 text-ink-700">
            عند إرسال بلاغ، النص يُحفظ للمراجعة التحريرية. حقل التواصل اختياري؛ ما بيننشر تلقائياً وما
            بيظهر في الروابط العامة. البلاغات مش متاحة للقراءة العامة.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">الدليل التفاعلي على جهازك</h2>
          <p className="mt-2 text-ink-700">
            إجابات الدليل وتقدّم قائمة المستندات تُحفظ محلياً في متصفحك (`localStorage`) لتسهيل المتابعة.
            ما منبعتها للخادم ضمن رابط المشاركة أو واتساب. مسح بيانات الموقع أو جهاز مشترك قد يكشف أو يمسح
            هالتقدّم.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">المصادر وبيانات العرض</h2>
          <p className="mt-2 text-ink-700">
            المصادر الرسمية هي المرجع. بعض المحتوى قد يظهر بتصنيف تجريبي (DEMO) للعرض والاختبار — ويُعلَّم
            بوضوح عند ظهوره للعامة في وضع العرض.
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

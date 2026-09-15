import type { Metadata } from 'next'
import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'

export const metadata: Metadata = {
  title: 'الشروط',
  description: 'شروط استخدام منصة ورقة الإرشادية المستقلة — إرشاد فقط وليست جهة حكومية.',
}

export default function TermsPage() {
  return (
    <div className="waraqa-container py-12 md:py-16">
      <BrandMark size="compact" variant="primary" className="mb-6" />
      <h1 className="font-display text-2xl font-bold text-ink-950 md:text-3xl">شروط الاستخدام</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-700">
        باستخدامك لورقة، فأنت تفهم أن المنصة تقدّم إرشاداً عاماً للمساعدة في التحضير للمعاملات — ضمن الحدود
        الموضحة أدناه.
      </p>

      <div className="mt-10 max-w-2xl space-y-8 text-[1.0625rem] leading-relaxed text-ink-800">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">إرشاد فقط — ليست جهة حكومية</h2>
          <p className="mt-2 text-ink-700">
            ورقة ليست موقعاً حكومياً ولا تنوب عن أي وزارة أو بعثة أو دائرة. ما مننجز معاملات عنك وما منصدر
            وثائق رسمية عبر المنصة.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">المعلومات قد تتغيّر</h2>
          <p className="mt-2 text-ink-700">
            الرسوم والمتطلبات والمدد والقنوات الرسمية قد تتبدّل. راجع المصدر الرسمي وتواريخ التحقق الظاهرة
            على صفحة المعاملة قبل الاعتماد على أي تفصيل.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">ليست استشارة قانونية</h2>
          <p className="mt-2 text-ink-700">
            المحتوى لا يُعدّ استشارة قانونية أو تمثيلاً قانونياً. للحالات الخاصة أو النزاعات، راجع جهة مختصة
            أو السلطة المختصة مباشرة.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">حدود الاستخدام</h2>
          <p className="mt-2 text-ink-700">
            لا تستخدم المنصة لإرسال محتوى مسيء أو مضلّل عبر نماذج الإبلاغ، ولا لمحاولة الوصول غير المصرّح
            به إلى لوحة التحرير. نحتفظ بحق رفض أو تجاهل البلاغات المسيئة ضمن سياسات التشغيل.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink-950">تنبيه حول الامتثال</h2>
          <p className="mt-2 text-ink-700">
            هالنص يصف المنتج كما هو مُصمَّم. ما منقدّم هنا خلاصة قانونية سورية نهائية؛ قد يلزم رأي مستشار
            لأي متطلبات امتثال رسمية.
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

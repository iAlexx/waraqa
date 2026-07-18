import { BrandMark } from '@/components/brand/brand-mark'
import { Callout } from '@/components/ui/callout'

/**
 * Development showcase for the selected Aref Ruqaa Ink wordmark.
 * Lateef is rejected and not loaded. Colors via BrandMark variants only.
 */
export function WordmarkLab() {
  return (
    <div id="wordmark-aref-ruqaa" className="min-h-full bg-canvas">
      <div className="waraqa-container max-w-[48rem] space-y-8 py-12 md:py-16">
        <header className="space-y-4">
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-snug text-brand-900">
            علامة ورقة — Aref Ruqaa Ink
          </h1>
          <p className="max-w-2xl text-[1.0625rem] leading-[1.85] text-ink-700">
            اختيار المالك للإنتاج: Aref Ruqaa Ink Bold لكلمة «ورقة» فقط — بلون
            brand-900 على الأسطح الفاتحة، وعاجي على الأخضر الداكن. بدون أحمر.
          </p>
          <Callout variant="success" title="ألوان العلامة المعتمدة">
            primary → brand-900 · reversed → ivory · ink → ink-950. الأحمر محجوز
            للأخطاء والإجراءات التدميرية فقط. Lateef مرفوض — غير محمّل.
          </Callout>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <div
            id="wordmark-primary-light"
            className="rounded-[1rem] border border-border bg-ivory p-5"
          >
            <p className="mb-4 text-sm text-ink-700">أخضر brand-900 على عاج</p>
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-2 text-xs text-ink-700">موبايل هيدر</p>
                <BrandMark size="compact" variant="primary" />
              </div>
              <div>
                <p className="mb-2 text-xs text-ink-700">ديسكتوب هيدر</p>
                <BrandMark size="default" variant="primary" />
              </div>
              <div>
                <p className="mb-2 text-xs text-ink-700">بطل الصفحة</p>
                <BrandMark size="hero" variant="primary" />
              </div>
              <div>
                <p className="mb-2 text-xs text-ink-700">تذييل</p>
                <BrandMark size="footer" variant="primary" />
              </div>
            </div>
          </div>
          <div
            id="wordmark-reversed-dark"
            className="rounded-[1rem] bg-brand-950 p-5"
          >
            <p className="mb-4 text-sm text-ivory/80">عاجي على أخضر داكن</p>
            <div className="flex flex-col gap-6">
              <BrandMark size="compact" variant="reversed" />
              <BrandMark size="default" variant="reversed" />
              <BrandMark size="hero" variant="reversed" />
              <BrandMark size="footer" variant="reversed" />
            </div>
          </div>
          <div
            id="wordmark-ink-print"
            className="rounded-[1rem] border border-border bg-surface p-5 md:col-span-2"
          >
            <p className="mb-4 text-sm text-ink-700">طباعة — ink-950</p>
            <BrandMark size="default" variant="ink" />
          </div>
        </div>
      </div>
    </div>
  )
}

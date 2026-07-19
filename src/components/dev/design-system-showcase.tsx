'use client'

import * as React from 'react'

import { BrandMark } from '@/components/brand/brand-mark'
import { WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'
import { DarkBandMotifs } from '@/components/decorative/dark-band-motifs'
import { GeometricDivider } from '@/components/decorative/geometric-divider'
import { HeroCornerMotifs } from '@/components/decorative/hero-corner-motifs'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { fallbackPublicSiteSettings } from '@/lib/public/site-settings-map'
import { CheckboxField } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { RadioCardGroup, RadioCardItem } from '@/components/ui/radio-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'

const palette = [
  ['brand-950', '#062f2b'],
  ['brand-800', '#115149'],
  ['brand-100', '#dff1ed'],
  ['gold-700', '#9b7632'],
  ['gold-100', '#f4ead4'],
  ['ink-950', '#14201e'],
  ['ink-700', '#3f4d4a'],
  ['success', '#19734d'],
  ['warning', '#9a6700'],
  ['danger', '#b42318'],
  ['info', '#175cd3'],
] as const

const nav = [
  { href: '#brand', label: 'الهوية' },
  { href: '#pattern', label: 'النمط' },
  { href: '#colors', label: 'الألوان' },
  { href: '#typography', label: 'الخطوط' },
  { href: '#buttons', label: 'الأزرار' },
  { href: '#forms', label: 'النماذج' },
  { href: '#overlays', label: 'النوافذ' },
] as const

const darkBandItems = [
  'اعرف الخطوات',
  'حضّر أوراقك',
  'راجع المصدر',
  'تابع التحديث',
  'بلّغ عن تعديل',
] as const

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 md:py-16">
      <h2 className="font-display mb-6 text-[1.55rem] font-bold leading-snug text-brand-900 md:mb-8 md:text-3xl">
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

export function DesignSystemShowcase() {
  const [location, setLocation] = React.useState('inside')

  return (
    <div className="min-h-full bg-canvas">
      <div className="waraqa-container max-w-[72rem] py-10 md:py-14">
        <Callout variant="warning" title="صفحة تطوير فقط">
          هالصفحة متاحة للتطوير ومعاينة التصميم. ما بتنعرض بالإنتاج، وما فيها
          بيانات معاملات رسمية.
        </Callout>

        <header className="mt-10 flex flex-col gap-4 md:mt-12">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.3] text-brand-900">
            نظام تصميم ورقة
          </h1>
          <p className="max-w-2xl text-[1.0625rem] leading-[1.8] text-ink-700">
            هوية هادئة ومقروءة: محتوى وطباعة ومسافات تقود الواجهة، والنمط
            الهندسي تفصيل ثانوي محدود.
          </p>
          <Breadcrumb
            items={[
              { label: 'الرئيسية', href: '/' },
              { label: 'نظام التصميم' },
            ]}
          />
          <nav aria-label="أقسام الصفحة" className="mt-1">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="prose-link font-medium text-brand-800">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <Section id="brand" title="علامة ورقة — Aref Ruqaa Ink">
          <Callout variant="success" title="اختيار المالك">
            Aref Ruqaa Ink Bold لكلمة «ورقة» فقط. Lateef مرفوض. العناوين
            Alexandria، والواجهة IBM Plex Sans Arabic.
          </Callout>
          <div
            id="wordmark-aref-showcase"
            className="grid gap-5 md:grid-cols-2"
          >
            <div
              id="wordmark-primary-light"
              className="rounded-[1rem] border border-border bg-ivory p-6"
            >
              <p className="mb-4 text-sm text-ink-700">موبايل / ديسكتوب / بطل — brand-900</p>
              <div className="flex flex-col gap-5">
                <BrandMark size="compact" variant="primary" />
                <BrandMark size="default" variant="primary" />
                <BrandMark size="hero" variant="primary" />
              </div>
            </div>
            <div
              id="wordmark-reversed-dark"
              className="rounded-[1rem] bg-brand-950 p-6"
            >
              <p className="mb-4 text-sm text-ivory/80">عكس — ivory على brand-950</p>
              <BrandMark size="default" variant="reversed" />
            </div>
            <div
              id="wordmark-ink-print"
              className="rounded-[1rem] border border-border bg-surface p-6 md:col-span-2"
            >
              <p className="mb-4 text-sm text-ink-700">طباعة — ink-950</p>
              <BrandMark size="default" variant="ink" />
            </div>
          </div>
        </Section>

        <Section id="pattern" title="الهوية الهندسية">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-700">
            نجمة متشابكة من معينات متراكبة — خط هندسي معماري، ليست بوصلة ولا
            وردة كثيفة.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div
              id="waraqa-interlaced-star-light"
              className="rounded-[1rem] border border-border bg-ivory p-5"
            >
              <p className="mb-4 text-sm font-medium text-ink-950">موتيف فاتح خام</p>
              <WaraqaStarMotif tone="gold" className="mx-auto size-40 md:size-48" />
            </div>
            <div
              id="waraqa-interlaced-star-dark"
              className="rounded-[1rem] border border-border bg-brand-950 p-5"
            >
              <p className="mb-4 text-sm font-medium text-ivory">موتيف داكن خام</p>
              <WaraqaStarMotif tone="gold-light" className="mx-auto size-40 md:size-48" />
            </div>
            <div className="rounded-[1rem] border border-border bg-surface p-5">
              <p className="mb-4 text-sm font-medium text-ink-950">مدمج</p>
              <WaraqaStarMotif tone="gold" className="mx-auto size-16" />
            </div>
            <div className="rounded-[1rem] border border-border bg-ivory p-5">
              <p className="mb-4 text-sm font-medium text-ink-950">كبير</p>
              <WaraqaStarMotif tone="gold" className="mx-auto size-56 md:size-64" />
            </div>
          </div>

          <div
            id="pattern-light"
            className="relative min-h-48 overflow-hidden rounded-[1.125rem] border border-border bg-ivory p-6"
          >
            <HeroCornerMotifs />
            <div className="relative z-[1]">
              <p className="font-medium text-ink-950">حواف الـ Hero (~٣٪)</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-700">
                موتيفان جزئيان كحد أقصى — المركز هادئ.
              </p>
              <Card className="mt-5 max-w-md bg-surface shadow-[var(--shadow-sm)]">
                <CardTitle>بطاقة صلبة</CardTitle>
                <CardDescription>لا نمط خلف المحتوى.</CardDescription>
              </Card>
            </div>
          </div>

          <div
            id="pattern-dark-band"
            className="relative overflow-hidden rounded-[1.125rem] bg-brand-950 p-6 text-ivory md:p-10"
          >
            <DarkBandMotifs />
            <div className="relative z-[1] space-y-6">
              <div>
                <h3 className="font-display text-xl font-semibold md:text-2xl">
                  شريط أخضر موقّع
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ivory/85 md:text-[0.9375rem]">
                  تكوين متناثر — نجمة كبيرة جزئية وصغيرة، بدون بلاط عملاق متكرر.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {darkBandItems.slice(0, 5).map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center justify-center rounded-[0.875rem] border border-ivory/20 bg-brand-900/90 px-4 py-3 text-sm font-medium text-ivory"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            id="geometric-divider"
            className="rounded-[1rem] border border-border bg-surface py-5"
          >
            <p className="mb-2 text-center text-sm text-ink-700">فاصل أفقي</p>
            <GeometricDivider />
          </div>
        </Section>

        <Section id="colors" title="الألوان والرموز">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {palette.map(([name, value]) => (
              <div
                key={name}
                className="overflow-hidden rounded-[0.875rem] border border-border/80 bg-surface"
              >
                <div className="h-14" style={{ background: value }} />
                <div className="px-2.5 py-2 text-xs">
                  <div className="font-medium text-ink-950">{name}</div>
                  <div className="text-ink-700" dir="ltr">
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="typography" title="الخطوط">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-[1rem] border border-border bg-surface p-5">
              <p className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-bold leading-[1.3] text-brand-900">
                عنوان Alexandria
              </p>
              <p className="font-display text-xl font-semibold text-brand-900">
                عنوان قسم بوزن ٦٠٠–٧٠٠
              </p>
              <p className="text-[1.0625rem] leading-[1.8] text-ink-950">
                نص الجسم بخط IBM Plex Sans Arabic، بحجم ١٦px على الموبايل، ومسافة
                سطر مريحة للقراءة العربية الطويلة مع تشكيل خفيف: مَعلومة.
              </p>
              <p className="text-[0.875rem] leading-relaxed text-ink-700">
                نص مساعد أو تسمية — ١٤ بكسل.
              </p>
            </div>
            <div className="space-y-2 rounded-[1rem] border border-border bg-surface p-5 text-sm text-ink-700">
              <p>
                <strong className="text-ink-950">صحيح:</strong> علامة SVG لاسم
                «ورقة»، عناوين Alexandria، جسم IBM Plex.
              </p>
              <p>
                <strong className="text-ink-950">خطأ:</strong> استخدام شكل العلامة
                لفقرات أو واجهة عامة.
              </p>
            </div>
          </div>
        </Section>

        <Section id="buttons" title="الأزرار">
          <div className="grid gap-3 rounded-[1rem] border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Button>بلّش من هون</Button>
            <Button variant="secondary">متابعة</Button>
            <Button variant="outline">اعرضلي المطلوب</Button>
            <Button variant="ghost">حفظ التغييرات</Button>
            <Button variant="destructive">حذف</Button>
            <Button loading loadingLabel="عم نحفظ…">
              حفظ
            </Button>
            <Button disabled>معطّل</Button>
            <Button variant="link">جرّب من جديد</Button>
          </div>
        </Section>

        <Section id="forms" title="الحقول والنماذج">
          <div className="grid gap-5 rounded-[1rem] border border-border bg-surface p-5 md:grid-cols-2">
            <Field
              id="procedure-name"
              label="اسم المعاملة"
              required
              helperText="اكتب الاسم الرسمي أو الاسم اللي الناس بتستخدمه عادةً."
            >
              <Input placeholder="اكتب اسم المعاملة…" />
            </Field>
            <Field
              id="procedure-error"
              label="اسم المعاملة"
              required
              error="تأكد من هالحقل قبل ما تكمل."
            >
              <Input defaultValue="" aria-invalid />
            </Field>
            <Field id="notes" label="ملاحظات" helperText="اختياري للتفاصيل الإضافية.">
              <Textarea placeholder="اكتب ملاحظاتك هون…" />
            </Field>
            <Field id="category" label="التصنيف" required>
              <Select defaultValue="civil">
                <SelectTrigger aria-label="التصنيف">
                  <SelectValue placeholder="اختَر تصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civil">الأحوال المدنية</SelectItem>
                  <SelectItem value="travel">الجوازات والسفر</SelectItem>
                  <SelectItem value="education">التعليم والشهادات</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="rounded-[1rem] border border-border bg-surface p-5">
            <CheckboxField
              id="confirm-docs"
              label="تأكدت إنو الأوراق اللي عندي كاملة قبل ما كمّل."
            />
            <p className="mb-3 mt-5 font-semibold text-ink-950">وين رح تقدّم المعاملة؟</p>
            <RadioCardGroup
              value={location}
              onValueChange={setLocation}
              className="md:grid-cols-2"
            >
              <RadioCardItem
                value="inside"
                title="داخل سوريا"
                description="تقديم بالمركز أو الجهة المحلية."
              />
              <RadioCardItem
                value="outside"
                title="خارج سوريا"
                description="خطوات السفارة أو القنصلية حسب الحالة."
              />
            </RadioCardGroup>
          </div>
        </Section>

        <Section id="feedback" title="الشارات والتنبيهات">
          <div className="flex flex-wrap gap-2">
            <Badge variant="verified">موثّق</Badge>
            <Badge variant="review">بحاجة مراجعة</Badge>
            <Badge variant="warning">تنبيه</Badge>
            <Badge variant="new">جديد</Badge>
            <Badge variant="error">خطأ</Badge>
            <Badge variant="neutral">محايد</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Callout variant="information" title="ملاحظة">
              جاوبنا على كم سؤال لنطلعلك المطلوب حسب حالتك.
            </Callout>
            <Callout variant="source" title="مصدر">
              آخر تحقق من هالمعلومة بتاريخ تجريبي للمعاينة فقط.
            </Callout>
            <Callout variant="warning" title="انتباه">
              تأكد من هالأوراق قبل ما تطلع.
            </Callout>
            <Callout variant="success" title="تم">
              تم حفظ التغييرات.
            </Callout>
          </div>
        </Section>

        <Section id="cards" title="البطاقات والتقدّم">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="bg-surface">
              <CardTitle>بطاقة عادية</CardTitle>
              <CardDescription>تجميع محتوى مرتبط فقط.</CardDescription>
            </Card>
            <Card variant="selected">
              <CardTitle>بطاقة مختارة</CardTitle>
              <CardDescription>حدود أوضح ولون خلفية خفيف.</CardDescription>
            </Card>
            <Card variant="compact" className="bg-surface">
              <CardTitle className="text-base">مضغوطة</CardTitle>
              <CardDescription>حشو أقل للمساحات الضيقة.</CardDescription>
            </Card>
          </div>
          <Progress value={40} max={100} label="الخطوة ٢ من ٥" />
          <div className="grid gap-2 md:grid-cols-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full md:col-span-3" />
          </div>
        </Section>

        <Section id="overlays" title="الحوار والدرج والتنبيهات المؤقتة">
          <div className="flex flex-wrap gap-3 rounded-[1rem] border border-border bg-surface p-5">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">افتح حوار</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تأكيد بسيط</DialogTitle>
                  <DialogDescription>
                    هالحوار للتأكد من التركيز وإغلاق Escape وإرجاع التركيز.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>متابعة</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="outline">إلغاء</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary">افتح درج الجوال</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>درج من الأسفل</DrawerTitle>
                  <DrawerDescription>
                    الارتفاع حسب المحتوى، مع مساحة آمنة للأسفل وإغلاق واضح.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerClose asChild>
                  <Button className="mt-4 w-full">إغلاق</Button>
                </DrawerClose>
              </DrawerContent>
            </Drawer>

            <Button variant="ghost" onClick={() => toast.success('تم حفظ التغييرات.')}>
              Toast نجاح
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.error('صار في مشكلة. جرّب مرة تانية.')}
            >
              Toast خطأ
            </Button>
            <Button variant="ghost" onClick={() => toast.message('تم نسخ الرابط.')}>
              Toast نسخ
            </Button>
          </div>
        </Section>

        <Section id="shells" title="هيكل الرأس والذيل">
          <div className="overflow-hidden rounded-[1.125rem] border border-border bg-surface">
            <SiteHeader settings={fallbackPublicSiteSettings()} />
            <div className="px-5 py-6">
              <p className="text-sm text-ink-700">معاينة الرأس والذيل على سطح أبيض هادئ.</p>
            </div>
            <SiteFooter settings={fallbackPublicSiteSettings()} />
          </div>
        </Section>

        <Section id="stress" title="اختبار ضغط للنصوص العربية">
          <div className="space-y-4 rounded-[1rem] border border-border bg-surface p-5">
            <h3 className="font-display text-xl font-semibold leading-snug text-brand-900">
              عنوان طويل جداً لمعاملة افتراضية تجريبية بدون أي معلومة حكومية حقيقية
              للتأكد من الالتفاف وعدم القص أو الفيض الأفقي على الشاشات الضيقة
            </h3>
            <p className="max-w-3xl text-[1.0625rem] leading-[1.8] text-ink-700">
              نص طويل للتجربة فقط: جاوبنا على كم سؤال لنطلعلك المطلوب حسب حالتك،
              وتأكد من هالأوراق قبل ما تطلع. الرابط:{' '}
              <span dir="ltr" className="font-medium text-info">
                https://example.org/very/long/path/demo
              </span>
            </p>
            <Button className="max-w-full whitespace-normal text-start">
              زر متعدد الأسطر مع نص عربي طويل للتأكد من المساحة والضغط
            </Button>
          </div>
        </Section>
      </div>
    </div>
  )
}

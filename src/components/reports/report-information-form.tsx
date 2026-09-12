'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { REPORT_SECTION_LABELS_AR, REPORT_SECTIONS, type ReportSection } from '@/lib/reports/types'

type Props = {
  transactionSlug: string
  transactionTitle: string
  demoLabeled: boolean
}

type FieldErrors = Partial<Record<string, string>>

export function ReportInformationForm({
  transactionSlug,
  transactionTitle,
  demoLabeled,
}: Props) {
  const router = useRouter()
  const [section, setSection] = React.useState<ReportSection | ''>('')
  const [message, setMessage] = React.useState('')
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [consent, setConsent] = React.useState(false)
  const [honeypot, setHoneypot] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [success, setSuccess] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setBusy(true)

    try {
      const res = await fetch('/api/public/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          transactionSlug,
          section,
          message,
          sourceUrl: sourceUrl.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          consent: consent === true,
          website: honeypot,
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        message?: string
        fields?: FieldErrors
        code?: string
      } | null

      if (!res.ok || !data?.ok) {
        setFieldErrors(data?.fields || {})
        setFormError(data?.message || 'تعذّر إرسال البلاغ. حاول مرة ثانية.')
        return
      }

      setSuccess(true)
      // Ensure success URL has no contact/message leakage.
      router.replace(`/report-information?transaction=${encodeURIComponent(transactionSlug)}&sent=1`)
    } catch {
      setFormError('تعذّر إرسال البلاغ حالياً. حاول مرة ثانية بعد قليل.')
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-[0.8125rem] border border-border/80 bg-surface px-5 py-8 text-center"
        data-report-success
        role="status"
      >
        <h2 className="font-display text-xl font-bold text-ink-950">تم استلام بلاغك</h2>
        <p className="mt-3 text-ink-700 leading-relaxed">
          شكراً لك. فريق ورقة سيراجع البلاغ قبل أي تعديل على المحتوى. ورقة منصة إرشادية مستقلة وليست
          جهة حكومية.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/transactions/${encodeURIComponent(transactionSlug)}`}
            className="inline-flex min-h-12 items-center rounded-[0.8125rem] bg-brand-800 px-5 font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
          >
            العودة إلى المعاملة
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-12 items-center rounded-[0.8125rem] border border-border bg-surface px-5 font-semibold text-brand-900 hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
          >
            البحث
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      data-report-form
      noValidate
    >
      <div className="rounded-[0.8125rem] border border-border/80 bg-ivory/70 px-4 py-3 text-sm text-ink-700">
        <p className="font-medium text-ink-900">المعاملة</p>
        <p className="mt-1 break-words">{transactionTitle}</p>
        {demoLabeled ? (
          <p className="mt-2 text-xs text-ink-600" data-report-demo-context>
            بيانات تجريبية للعرض — البلاغ يبقى ضمن سياق العرض التجريبي.
          </p>
        ) : null}
      </div>

      <Field
        id="report-section"
        label="ما القسم الذي يبدو غير دقيق؟"
        required
        error={fieldErrors.section}
      >
        <select
          id="report-section"
          name="section"
          required
          value={section}
          onChange={(e) => setSection(e.target.value as ReportSection | '')}
          className="flex h-12 w-full rounded-[0.8125rem] border border-input bg-surface px-3.5 text-base text-ink-950"
          aria-invalid={Boolean(fieldErrors.section)}
        >
          <option value="">— اختر —</option>
          {REPORT_SECTIONS.map((s) => (
            <option key={s} value={s}>
              {REPORT_SECTION_LABELS_AR[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="report-message"
        label="ما المعلومة التي تغيّرت أو تبدو خاطئة؟"
        required
        helperText="اكتب بأسلوب واضح بدون مرفقات. لا تُرسل أرقاماً وطنية أو وثائق هوية."
        error={fieldErrors.message}
      >
        <Textarea
          id="report-message"
          name="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2200}
          aria-invalid={Boolean(fieldErrors.message)}
        />
      </Field>

      <Field
        id="report-source-url"
        label="رابط مصدر يدعم ملاحظتك"
        helperText="اختياري — رابط http/https فقط."
        error={fieldErrors.sourceUrl}
      >
        <Input
          id="report-source-url"
          name="sourceUrl"
          type="url"
          inputMode="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          autoComplete="off"
        />
      </Field>

      <fieldset className="flex flex-col gap-4 rounded-[0.8125rem] border border-border/70 bg-surface px-4 py-4">
        <legend className="px-1 text-sm font-medium text-ink-900">تواصل اختياري للمتابعة</legend>
        <p className="text-sm leading-relaxed text-ink-600">
          إن رغبت، يمكنك ترك بريداً أو هاتفاً لمتابعة هذا البلاغ فقط. لا نعد بالتواصل، وورقة ليست جهة
          حكومية. بيانات التواصل محمية ولا تُعرض للعامة.
        </p>
        <Field id="report-contact-email" label="البريد الإلكتروني" error={fieldErrors.contactEmail}>
          <Input
            id="report-contact-email"
            name="contactEmail"
            type="email"
            inputMode="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field id="report-contact-phone" label="رقم الهاتف" error={fieldErrors.contactPhone}>
          <Input
            id="report-contact-phone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            autoComplete="tel"
          />
        </Field>
      </fieldset>

      {/* Honeypot — visually hidden from humans */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        tabIndex={-1}
      >
        <label htmlFor="report-website">الموقع</label>
        <input
          id="report-website"
          name="website"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="report-consent"
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          aria-invalid={Boolean(fieldErrors.consent)}
        />
        <label htmlFor="report-consent" className="text-sm leading-relaxed text-ink-800">
          أوافق على معالجة هذا البلاغ من قبل فريق ورقة لأغراض مراجعة المحتوى فقط. *
        </label>
      </div>
      {fieldErrors.consent ? (
        <p className="text-sm text-destructive" role="alert">
          {fieldErrors.consent}
        </p>
      ) : null}

      {formError ? (
        <p className="rounded-[0.8125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert" data-report-error>
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || !consent || !section} data-report-submit>
          {busy ? 'جارٍ الإرسال…' : 'إرسال البلاغ'}
        </Button>
        <Link
          href={`/transactions/${encodeURIComponent(transactionSlug)}`}
          className="inline-flex min-h-12 items-center rounded-[0.8125rem] border border-border px-5 font-semibold text-brand-900 hover:bg-ivory"
        >
          إلغاء
        </Link>
      </div>
    </form>
  )
}

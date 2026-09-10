'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import {
  runPublicGuideEvaluation,
} from '@/lib/guide/public-guide-map'
import { visibleQuestions } from '@/lib/guide/evaluate'
import type { GuideAnswers, GuideChecklistItem, GuideNotice } from '@/lib/guide/types'
import { cn } from '@/lib/utils/cn'

export type GuideClientProps = {
  guide: PublicGuideDTO
}

function kindLabel(kind: GuideChecklistItem['kind']): string {
  switch (kind) {
    case 'generally_required':
      return 'مطلوب عموماً'
    case 'required_by_answers':
      return 'مطلوب حسب إجاباتك'
    case 'verify_with_authority':
      return 'قد يُطلب — راجع الجهة الرسمية'
    default:
      return ''
  }
}

function GuideClient({ guide }: GuideClientProps) {
  const [answers, setAnswers] = useState<GuideAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const statusId = useId()

  const visible = useMemo(
    () => visibleQuestions(guide.questions, answers),
    [guide.questions, answers],
  )

  const current = visible[stepIndex] ?? null
  const total = visible.length
  const progressLabel = showResult
    ? 'النتيجة'
    : total > 0
      ? `السؤال ${Math.min(stepIndex + 1, total)} من ${total}`
      : 'لا أسئلة'

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex, showResult])

  function restart() {
    setAnswers({})
    setStepIndex(0)
    setShowResult(false)
    setError(null)
  }

  function setAnswer(questionKey: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }))
    setError(null)
  }

  function goNext() {
    if (!current) return
    if (current.required) {
      const raw = answers[current.key]
      const ok = Array.isArray(raw) ? raw.length > 0 : Boolean(raw)
      if (!ok) {
        setError('هذا السؤال إلزامي.')
        return
      }
    }
    if (stepIndex >= visible.length - 1) {
      setShowResult(true)
      return
    }
    setStepIndex((i) => i + 1)
  }

  function goBack() {
    setError(null)
    if (showResult) {
      setShowResult(false)
      return
    }
    setStepIndex((i) => Math.max(0, i - 1))
  }

  const evaluation = showResult ? runPublicGuideEvaluation(guide, answers) : null

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl" data-guide-client>
      <p className="text-sm text-ink-600" aria-live="polite" id={statusId}>
        {progressLabel}
      </p>

      {!showResult && current ? (
        <section className="mt-6" aria-labelledby="guide-question-heading">
          <h2
            id="guide-question-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-xl font-bold text-ink-950 outline-none md:text-2xl"
          >
            {current.prompt}
          </h2>
          {current.helpText ? (
            <p className="mt-2 max-w-[40rem] text-sm leading-relaxed text-ink-600">
              {current.helpText}
            </p>
          ) : null}

          <fieldset className="mt-6">
            <legend className="sr-only">{current.prompt}</legend>
            {current.questionType === 'boolean' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    { key: 'yes', label: 'نعم' },
                    { key: 'no', label: 'لا' },
                  ] as const
                ).map((opt) => {
                  const selected = answers[current.key] === opt.key
                  return (
                    <label
                      key={opt.key}
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center justify-center rounded-[0.8125rem] border px-4 text-sm font-semibold',
                        selected
                          ? 'border-brand-800 bg-brand-50 text-brand-900'
                          : 'border-border bg-surface text-ink-800 hover:bg-ivory',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={current.key}
                        value={opt.key}
                        checked={selected}
                        onChange={() => setAnswer(current.key, opt.key)}
                      />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : null}

            {current.questionType === 'single' ? (
              <div className="flex flex-col gap-2">
                {current.options.map((opt) => {
                  const selected = answers[current.key] === opt.key
                  return (
                    <label
                      key={opt.key}
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center rounded-[0.8125rem] border px-4 text-sm font-medium',
                        selected
                          ? 'border-brand-800 bg-brand-50 text-brand-900'
                          : 'border-border bg-surface text-ink-800 hover:bg-ivory',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={current.key}
                        value={opt.key}
                        checked={selected}
                        onChange={() => setAnswer(current.key, opt.key)}
                      />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : null}

            {current.questionType === 'multi' ? (
              <div className="flex flex-col gap-2">
                {current.options.map((opt) => {
                  const selected = Array.isArray(answers[current.key])
                    ? (answers[current.key] as string[]).includes(opt.key)
                    : false
                  return (
                    <label
                      key={opt.key}
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center rounded-[0.8125rem] border px-4 text-sm font-medium',
                        selected
                          ? 'border-brand-800 bg-brand-50 text-brand-900'
                          : 'border-border bg-surface text-ink-800 hover:bg-ivory',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        name={`${current.key}[]`}
                        value={opt.key}
                        checked={selected}
                        onChange={() => {
                          const prev = Array.isArray(answers[current.key])
                            ? [...(answers[current.key] as string[])]
                            : []
                          if (selected) {
                            setAnswer(
                              current.key,
                              prev.filter((k) => k !== opt.key),
                            )
                          } else {
                            setAnswer(current.key, [...prev, opt.key])
                          }
                        }}
                      />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            ) : null}
          </fieldset>

          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {showResult && evaluation ? (
        <section className="mt-6" aria-labelledby="guide-result-heading">
          <h2
            id="guide-result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-xl font-bold text-ink-950 outline-none md:text-2xl"
          >
            نتيجة التحضير
          </h2>
          {!evaluation.ok ? (
            <p className="mt-4 text-ink-700" role="alert">
              {evaluation.message}
            </p>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {evaluation.variant ? (
                <div className="rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-3">
                  <p className="text-xs text-ink-500">المتغير المحدد</p>
                  <p className="font-semibold text-ink-950">{evaluation.variant.title}</p>
                  {evaluation.variant.explanation ? (
                    <p className="mt-1 text-sm text-ink-700">{evaluation.variant.explanation}</p>
                  ) : null}
                </div>
              ) : null}

              <ResultList title="الوثائق" items={evaluation.documents} />
              <ResultList title="الخطوات" items={evaluation.steps} />
              <ResultList title="الرسوم" items={evaluation.fees} />

              {evaluation.notices.length > 0 ? (
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-950">ملاحظات</h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {evaluation.notices.map((n: GuideNotice & { why: string | null }) => (
                      <li
                        key={n.key}
                        className="rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-3"
                      >
                        <p className="font-semibold text-ink-950">{n.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{n.body}</p>
                        {n.why ? (
                          <p className="mt-2 text-xs text-ink-500">لماذا: {n.why}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="rounded-[0.8125rem] border border-border/80 bg-ivory/80 px-4 py-3 text-sm text-ink-700">
                ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. هذه النتيجة مساعدة للتحضير وليست قراراً
                رسمياً أو ضمان قبول. راجع الجهة الرسمية قبل التقديم.
                {guide.lastReviewedLabel ? (
                  <>
                    {' '}
                    آخر مراجعة للمحتوى: <strong>{guide.lastReviewedLabel}</strong>.
                  </>
                ) : null}
              </p>

              {guide.sources.length > 0 ? (
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-950">المصادر الرسمية</h3>
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {guide.sources.map((s, i) => (
                      <li key={`${s.title}-${i}`}>
                        {s.officialLink ? (
                          <a
                            href={s.officialLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-medium text-brand-900 underline-offset-4 hover:underline"
                          >
                            {s.primary ? 'أساسي — ' : ''}
                            {s.title}
                          </a>
                        ) : (
                          <span>{s.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3 border-t border-border/60 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={!showResult && stepIndex === 0}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-brand-900 disabled:opacity-40"
        >
          رجوع
        </button>
        {!showResult ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-11 items-center rounded-md bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-900"
          >
            {stepIndex >= total - 1 ? 'عرض النتيجة' : 'التالي'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={restart}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-ink-800"
        >
          ابدأ من جديد
        </button>
        <Link
          href={guide.detailHref}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-brand-900"
        >
          العودة لتفاصيل المعاملة
        </Link>
      </div>
    </div>
  )
}

function ResultList({ title, items }: { title: string; items: GuideChecklistItem[] }) {
  if (items.length < 1) return null
  return (
    <div>
      <h3 className="font-display text-lg font-bold text-ink-950">{title}</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-3"
          >
            <p className="font-semibold text-ink-950">{item.title}</p>
            <p className="mt-1 text-xs font-medium text-ink-600">{kindLabel(item.kind)}</p>
            {item.detail ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{item.detail}</p>
            ) : null}
            {item.why ? <p className="mt-2 text-xs text-ink-500">لماذا: {item.why}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { GuideClient }

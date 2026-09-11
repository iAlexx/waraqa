'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'

import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import {
  runPublicGuideEvaluation,
} from '@/lib/guide/public-guide-map'
import { visibleQuestions } from '@/lib/guide/evaluate'
import {
  CHECKLIST_CLEAR_ALL_LABEL_AR,
  CHECKLIST_SAFETY_COPY_AR,
  pruneCheckedDocumentKeys,
  toggleCheckedDocumentKey,
} from '@/lib/guide/checklist-state'
import {
  clearGuideLocalState,
  readGuideLocalState,
  writeGuideLocalState,
} from '@/lib/guide/guide-local-storage'
import {
  PRINT_ANSWER_SUMMARY_HEADING_AR,
  PRINT_GENERATED_DATE_LABEL_AR,
  PRINT_RESULT_BUTTON_LABEL_AR,
  PRINT_SHEET_KIND_LABEL_AR,
} from '@/lib/guide/print-labels'
import type {
  GuideAnswers,
  GuideChecklistItem,
  GuideNotice,
  GuideQuestion,
} from '@/lib/guide/types'
import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import { formatPublicDateTime } from '@/lib/public/transaction-labels'
import { cn } from '@/lib/utils/cn'

function formatAnswerLabel(question: GuideQuestion, answers: GuideAnswers): string | null {
  const val = answers[question.key]
  if (val == null || val === '') return null
  if (question.questionType === 'boolean') {
    if (val === 'yes') return 'نعم'
    if (val === 'no') return 'لا'
    return null
  }
  if (question.questionType === 'single' && typeof val === 'string') {
    return question.options.find((o) => o.key === val)?.label ?? null
  }
  if (question.questionType === 'multi' && Array.isArray(val)) {
    const labels = val
      .map((k) => question.options.find((o) => o.key === k)?.label)
      .filter((label): label is string => Boolean(label))
    return labels.length > 0 ? labels.join('، ') : null
  }
  return null
}

function buildPrintAnswerRows(
  questions: GuideQuestion[],
  answers: GuideAnswers,
): Array<{ prompt: string; answer: string }> {
  return visibleQuestions(questions, answers)
    .map((q) => {
      const answer = formatAnswerLabel(q, answers)
      return answer ? { prompt: q.prompt, answer } : null
    })
    .filter((row): row is { prompt: string; answer: string } => row != null)
}

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
  /** P9-A/B: checked document keys — device-local only (never sent to server). */
  const [checkedDocKeys, setCheckedDocKeys] = useState<Set<string>>(() => new Set())
  const [prunedForSignature, setPrunedForSignature] = useState<string | null>(null)
  /**
   * P9-B persistence gate: writes are blocked until restore has finished.
   * Ref is the authoritative arming flag (survives awkward effect reordering);
   * state drives re-render + `data-guide-storage-ready` for tests.
   */
  const hasRestoredLocalState = useRef(false)
  const [persistenceReady, setPersistenceReady] = useState(false)
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

  const evaluation = showResult ? runPublicGuideEvaluation(guide, answers) : null

  // Prune stale checks while a successful result is visible (React “adjust state
  // during render” pattern — keep in-memory checks when editing answers).
  const activeDocKeysSignature =
    evaluation && evaluation.ok
      ? evaluation.documents.map((d) => d.key).join('\0')
      : null
  if (activeDocKeysSignature !== null && activeDocKeysSignature !== prunedForSignature) {
    setPrunedForSignature(activeDocKeysSignature)
    const keys = activeDocKeysSignature.length > 0 ? activeDocKeysSignature.split('\0') : []
    setCheckedDocKeys((prev) => {
      const pruned = pruneCheckedDocumentKeys(prev, keys)
      if (pruned.size === prev.size) {
        let same = true
        for (const k of prev) {
          if (!pruned.has(k)) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return pruned
    })
  }

  // P9-B: restore in useLayoutEffect so it always completes before any useEffect write.
  // Lifecycle: localStorage → apply React state → arm persistenceReady (never write first).
  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- P9-B device-local restore after SSR */
    hasRestoredLocalState.current = false
    setPersistenceReady(false)

    const restored = readGuideLocalState(guide)
    if (restored) {
      setAnswers(restored.answers)
      setCheckedDocKeys(new Set(restored.checkedDocumentKeys))
      setStepIndex(restored.stepIndex)
      setShowResult(restored.showResult)
      setPrunedForSignature(null)
      setError(null)
    }

    hasRestoredLocalState.current = true
    setPersistenceReady(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per mounted guide identity
  }, [guide.slug, guide.transactionId])

  // P9-B: persist only after restore has armed the gate (ref + state).
  useEffect(() => {
    if (!hasRestoredLocalState.current || !persistenceReady) return
    writeGuideLocalState(guide, {
      answers,
      checkedDocumentKeys: checkedDocKeys,
      stepIndex,
      showResult,
    })
  }, [persistenceReady, guide, answers, checkedDocKeys, stepIndex, showResult])

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex, showResult])

  function restart() {
    clearGuideLocalState(guide.slug)
    setAnswers({})
    setStepIndex(0)
    setShowResult(false)
    setError(null)
    setCheckedDocKeys(new Set())
    setPrunedForSignature(null)
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

  function clearAllChecks() {
    setCheckedDocKeys(new Set())
  }

  function setDocumentChecked(key: string, checked: boolean) {
    setCheckedDocKeys((prev) => toggleCheckedDocumentKey(prev, key, checked))
  }

  const [printGeneratedAt, setPrintGeneratedAt] = useState<string | null>(null)

  function handlePrintResult() {
    flushSync(() => {
      setPrintGeneratedAt(formatPublicDateTime(new Date()))
    })
    window.print()
  }

  const printAnswerRows =
    showResult && evaluation?.ok ? buildPrintAnswerRows(guide.questions, answers) : []

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl"
      data-guide-client
      data-guide-storage-ready={persistenceReady ? 'true' : 'false'}
    >
      <p className="text-sm text-ink-600" aria-live="polite" id={statusId} data-print-hide="">
        {progressLabel}
      </p>

      {!showResult && current ? (
        <section className="mt-6" aria-labelledby="guide-question-heading" data-print-hide="">
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
            <div
              className="mt-6 flex flex-col gap-8"
              data-guide-print-sheet=""
              data-guide-result-ok=""
            >
              <PrintSheetChrome
                title={guide.title}
                demoLabeled={guide.demoLabeled}
                answerRows={printAnswerRows}
                generatedAt={printGeneratedAt}
              />

              <div data-print-hide="" className="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-guide-print-button=""
                  onClick={handlePrintResult}
                  className="inline-flex min-h-11 items-center rounded-md bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
                >
                  {PRINT_RESULT_BUTTON_LABEL_AR}
                </button>
              </div>

              {evaluation.variant ? (
                <div
                  data-print-result-card=""
                  data-print-break-avoid=""
                  className="rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-3"
                >
                  <p className="text-xs text-ink-500">المتغير المحدد</p>
                  <p className="font-semibold text-ink-950">{evaluation.variant.title}</p>
                  {evaluation.variant.explanation ? (
                    <p className="mt-1 text-sm text-ink-700">{evaluation.variant.explanation}</p>
                  ) : null}
                </div>
              ) : null}

              <DocumentsChecklist
                items={evaluation.documents}
                checkedKeys={checkedDocKeys}
                onCheckedChange={setDocumentChecked}
                onClearAll={clearAllChecks}
              />
              <ResultList title="الخطوات" items={evaluation.steps} listKind="steps" />
              <ResultList title="الرسوم" items={evaluation.fees} listKind="fees" />

              {evaluation.notices.length > 0 ? (
                <div data-guide-print-notices="">
                  <h3 className="font-display text-lg font-bold text-ink-950">ملاحظات</h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {evaluation.notices.map((n: GuideNotice & { why: string | null }) => (
                      <li
                        key={n.key}
                        data-print-notice=""
                        data-print-break-avoid=""
                        data-print-result-card=""
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

              <p
                data-print-disclaimer=""
                data-print-break-avoid=""
                data-print-result-card=""
                className="rounded-[0.8125rem] border border-border/80 bg-ivory/80 px-4 py-3 text-sm text-ink-700"
              >
                ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. هذه النتيجة مساعدة للتحضير وليست قراراً
                رسمياً أو ضمان قبول. راجع الجهة الرسمية قبل التقديم.
                {guide.lastReviewedLabel ? (
                  <>
                    {' '}
                    آخر مراجعة للمحتوى:{' '}
                    <strong data-guide-verification-label="">{guide.lastReviewedLabel}</strong>.
                  </>
                ) : null}
              </p>

              {guide.sources.length > 0 ? (
                <div data-guide-print-sources="">
                  <h3 className="font-display text-lg font-bold text-ink-950">المصادر الرسمية</h3>
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {guide.sources.map((s, i) => (
                      <li
                        key={`${s.title}-${i}`}
                        data-print-source-entry=""
                        data-print-break-avoid=""
                      >
                        {s.officialLink ? (
                          <>
                            <a
                              href={s.officialLink.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-medium text-brand-900 underline-offset-4 hover:underline"
                            >
                              {s.primary ? 'أساسي — ' : ''}
                              {s.title}
                            </a>
                            <span data-print-only="" data-print-source-url="">
                              {s.officialLink.href}
                            </span>
                          </>
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

      <div
        className="mt-10 flex flex-wrap gap-3 border-t border-border/60 pt-6"
        data-print-hide=""
        data-guide-controls=""
      >
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

function PrintSheetChrome({
  title,
  demoLabeled,
  answerRows,
  generatedAt,
}: {
  title: string
  demoLabeled: boolean
  answerRows: Array<{ prompt: string; answer: string }>
  generatedAt: string | null
}) {
  // Stable client stamp for the sheet before the citizen presses print (not a verification date).
  const [fallbackStamp] = useState(() => formatPublicDateTime(new Date()))
  const stamp = generatedAt ?? fallbackStamp

  return (
    <div data-print-only="" data-guide-print-chrome="" className="mb-4">
      <p className="font-wordmark text-2xl font-bold text-ink-950">ورقة</p>
      <p className="mt-1 text-sm text-ink-700">{PRINT_SHEET_KIND_LABEL_AR}</p>
      <p className="mt-3 font-display text-xl font-bold text-ink-950" data-guide-print-title="">
        {title}
      </p>
      {demoLabeled ? (
        <p className="mt-2 text-sm font-semibold text-ink-950" data-demo-content-label="" role="status">
          {DEMO_PUBLIC_LABEL_AR}
        </p>
      ) : null}
      {answerRows.length > 0 ? (
        <div className="mt-4" data-guide-print-answer-summary="">
          <p className="font-semibold text-ink-950">{PRINT_ANSWER_SUMMARY_HEADING_AR}</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-800">
            {answerRows.map((row) => (
              <li key={row.prompt} data-print-break-avoid="">
                <span className="text-ink-600">{row.prompt}: </span>
                <span className="font-medium">{row.answer}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p
        className="mt-4 text-sm text-ink-700"
        data-guide-print-generated-at=""
        suppressHydrationWarning
      >
        {PRINT_GENERATED_DATE_LABEL_AR}
        {stamp ? (
          <>
            : <time suppressHydrationWarning>{stamp}</time>
          </>
        ) : null}
      </p>
    </div>
  )
}

type DocumentsChecklistProps = {
  items: GuideChecklistItem[]
  checkedKeys: ReadonlySet<string>
  onCheckedChange: (key: string, checked: boolean) => void
  onClearAll: () => void
}

function DocumentsChecklist({
  items,
  checkedKeys,
  onCheckedChange,
  onClearAll,
}: DocumentsChecklistProps) {
  if (items.length < 1) return null

  const checkedCount = items.reduce(
    (n, item) => n + (checkedKeys.has(item.key) ? 1 : 0),
    0,
  )
  const headingId = 'guide-documents-checklist-heading'
  const safetyId = 'guide-documents-checklist-safety'

  return (
    <div data-guide-documents-checklist data-testid="guide-documents-checklist">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg font-bold text-ink-950">
          الوثائق
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          disabled={checkedCount === 0}
          data-checklist-clear-all
          className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-border bg-surface px-3 text-sm font-semibold text-ink-800 hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-40"
        >
          {CHECKLIST_CLEAR_ALL_LABEL_AR}
        </button>
      </div>
      <p id={safetyId} className="mt-2 max-w-[40rem] text-sm leading-relaxed text-ink-600" data-checklist-safety>
        {CHECKLIST_SAFETY_COPY_AR}
      </p>
      <ul className="mt-3 flex flex-col gap-3" aria-labelledby={headingId} aria-describedby={safetyId}>
        {items.map((item) => {
          const inputId = `guide-doc-check-${item.key}`
          const checked = checkedKeys.has(item.key)
          return (
            <li key={item.key}>
              <label
                htmlFor={inputId}
                data-checklist-item={item.key}
                data-checklist-checked={checked ? 'true' : 'false'}
                className={cn(
                  'flex min-h-12 cursor-pointer items-start gap-3 rounded-[0.8125rem] border bg-surface px-4 py-3',
                  checked
                    ? 'border-brand-800/50 bg-brand-50/40'
                    : 'border-border/80 hover:bg-ivory/60',
                )}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 rounded border-border text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
                  checked={checked}
                  onChange={(e) => onCheckedChange(item.key, e.target.checked)}
                  data-checklist-checkbox={item.key}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-950">{item.title}</span>
                  <span className="mt-1 block text-xs font-medium text-ink-600">
                    {kindLabel(item.kind)}
                    {checked ? ' — محدّد للتحضير' : ''}
                  </span>
                  {item.detail ? (
                    <span className="mt-2 block whitespace-pre-wrap text-sm text-ink-700">
                      {item.detail}
                    </span>
                  ) : null}
                  {item.why ? (
                    <span className="mt-2 block text-xs text-ink-500">لماذا: {item.why}</span>
                  ) : null}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ResultList({
  title,
  items,
  listKind,
}: {
  title: string
  items: GuideChecklistItem[]
  listKind: 'steps' | 'fees'
}) {
  if (items.length < 1) return null
  return (
    <div data-guide-print-list={listKind}>
      <h3 className="font-display text-lg font-bold text-ink-950">{title}</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.key}
            data-print-break-avoid=""
            data-print-result-card=""
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

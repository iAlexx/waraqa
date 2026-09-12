'use client'

import React, { useId, useState } from 'react'

import type {
  GuidePreviewCatalogResponse,
  GuidePreviewQuestion,
  TransactionGuidePreview,
} from '@/lib/admin/guide-preview-types'
import type { GuideAnswers } from '@/lib/guide/types'

export function setGuidePreviewAnswerValue(
  answers: GuideAnswers,
  question: GuidePreviewQuestion,
  next: string | string[] | null,
): GuideAnswers {
  const copy = { ...answers }
  if (next == null || next === '' || (Array.isArray(next) && next.length === 0)) {
    delete copy[question.key]
    return copy
  }
  copy[question.key] = next
  return copy
}

/** Presentational panel — unit-testable without Payload hooks. */
export function GuideRulePreviewView({
  catalog,
  preview,
  answers,
  onAnswersChange,
  loading,
  evaluating,
  error,
  onReloadCatalog,
  onEvaluate,
  onReset,
}: {
  catalog: GuidePreviewCatalogResponse | null
  preview: TransactionGuidePreview | null
  answers: GuideAnswers
  onAnswersChange: (next: GuideAnswers) => void
  loading?: boolean
  evaluating?: boolean
  error?: string | null
  onReloadCatalog?: () => void
  onEvaluate?: () => void
  onReset?: () => void
}) {
  const techId = useId()
  const [techOpen, setTechOpen] = useState(false)

  const questions = preview?.questions ?? catalog?.questions ?? []
  const visibleQuestions = questions.filter((q) => q.visible)
  const state = preview?.evaluationState ?? catalog?.evaluationState
  const messageAr = preview?.messageAr ?? catalog?.messageAr

  return (
    <section
      dir="rtl"
      lang="ar"
      data-waraqa-guide-preview="1"
      data-waraqa-guide-preview-state={state ?? 'loading'}
      aria-label="معاينة قواعد الدليل"
      style={{
        ...panelStyle,
        // Isolate ephemeral preview chrome from Payload document-form readOnly look.
        pointerEvents: 'auto',
        opacity: 1,
        filter: 'none',
      }}
    >
      <div style={headerRow}>
        <strong style={{ fontSize: 15 }}>معاينة قواعد الدليل</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {onReloadCatalog ? (
            <button
              type="button"
              onClick={onReloadCatalog}
              disabled={loading}
              data-waraqa-guide-preview-reload="1"
              aria-label="تحديث الدليل المحفوظ للمعاينة"
              style={btnStyle}
            >
              {loading ? 'جاري التحميل…' : 'تحديث المحفوظ'}
            </button>
          ) : null}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              data-waraqa-guide-preview-reset="1"
              aria-label="إعادة تعيين إجابات المعاينة"
              style={btnStyle}
            >
              إعادة تعيين الإجابات
            </button>
          ) : null}
        </div>
      </div>

      <p data-waraqa-guide-preview-saved="1" style={noticeStyle}>
        المعاينة تعتمد على آخر نسخة محفوظة من الدليل.
      </p>
      <p data-waraqa-guide-preview-disclaimer="1" style={noticeStyle}>
        هذه المعاينة أداة تحريرية ولا تغيّر حالة النشر أو التحقق. الإجابات مؤقتة ولا تُحفظ.
      </p>

      {error ? (
        <div role="alert" data-waraqa-guide-preview-error="1" style={errorStyle}>
          {error}
        </div>
      ) : null}

      {loading && !catalog && !preview ? (
        <div data-waraqa-guide-preview-loading="1" aria-busy="true">
          جارٍ تحميل الدليل المحفوظ…
        </div>
      ) : null}

      {state === 'guide_invalid' && messageAr ? (
        <div role="alert" data-waraqa-guide-preview-invalid="1" style={errorStyle}>
          {messageAr}
        </div>
      ) : null}

      {visibleQuestions.length > 0 ? (
        <div data-waraqa-guide-preview-questions="1" style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13 }}>أسئلة المعاينة</strong>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 12 }}>
            {visibleQuestions.map((q) => (
              <li key={q.key} data-waraqa-guide-preview-question={q.key} style={questionBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {q.prompt}
                  {q.required ? ' *' : ''}
                </div>
                {q.helpText ? (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>{q.helpText}</div>
                ) : null}
                <QuestionControl
                  question={q}
                  value={answers[q.key]}
                  onChange={(next) =>
                    onAnswersChange(setGuidePreviewAnswerValue(answers, q, next))
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onEvaluate && state !== 'guide_invalid' ? (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={onEvaluate}
            disabled={evaluating || loading}
            data-waraqa-guide-preview-run="1"
            aria-label="تشغيل معاينة القواعد"
            style={primaryBtn}
          >
            {evaluating ? 'جاري التقييم…' : 'تشغيل المعاينة'}
          </button>
        </div>
      ) : null}

      {preview ? (
        <div data-waraqa-guide-preview-result="1" style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 14 }}>نتيجة المعاينة</strong>
          <p style={{ margin: '6px 0', fontSize: 12, color: '#555' }}>{preview.rulesSummaryAr}</p>

          {preview.evaluationState === 'incomplete' ||
          preview.evaluationState === 'conflict' ||
          preview.evaluationState === 'invalid_config' ? (
            <div role="status" data-waraqa-guide-preview-incomplete="1" style={warnStyle}>
              {preview.messageAr ?? 'النتيجة غير مكتملة أو غير مؤكدة.'}
              {preview.unknownWhenRuleKeys.length > 0 ? (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  قواعد بشروط غير مؤكدة (UNKNOWN): {preview.unknownWhenRuleKeys.join('، ')}
                </div>
              ) : null}
            </div>
          ) : null}

          {preview.evaluationState === 'ready' ? (
            <>
              <div data-waraqa-guide-preview-variant="1" style={blockStyle}>
                <strong>المتغير:</strong>{' '}
                {preview.variant ? preview.variant.title : '— (لم يُختر متغير)'}
              </div>

              {preview.firedRules.length > 0 ? (
                <div data-waraqa-guide-preview-fired="1" style={blockStyle}>
                  <strong>القواعد التي تم تشغيلها</strong>
                  <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
                    {preview.firedRules.map((r) => (
                      <li key={r.key}>
                        <span>{r.explanation || r.key}</span>
                        <span style={{ color: '#666', fontSize: 12 }}> — {r.key} (تم التشغيل)</span>
                        <ul style={{ margin: '4px 0 0', paddingInlineStart: 16, fontSize: 12 }}>
                          {r.effects.map((fx, i) => (
                            <li key={`${r.key}-${fx.type}-${fx.targetKey}-${i}`}>{fx.labelAr}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div data-waraqa-guide-preview-fired-empty="1" style={blockStyle}>
                  لم تُشغَّل أي قاعدة بهذه الإجابات.
                </div>
              )}

              <ResultList label="الوثائق" items={preview.documents} testId="docs" />
              <ResultList label="الخطوات" items={preview.steps} testId="steps" />
              <ResultList label="الرسوم" items={preview.fees} testId="fees" />
              <ResultList
                label="الملاحظات"
                items={preview.notices.map((n) => ({
                  key: n.key,
                  title: n.title,
                  detail: n.detail,
                  why: n.why,
                }))}
                testId="notices"
              />

              {preview.unknownWhenRuleKeys.length > 0 ? (
                <div data-waraqa-guide-preview-unknown="1" style={warnStyle}>
                  بعض القواعد تحتوي شروطاً غير مؤكدة (UNKNOWN) ولم تُشغَّل:{' '}
                  {preview.unknownWhenRuleKeys.join('، ')}. تشخيص أعمق لكل شرط مؤجّل.
                </div>
              ) : null}
            </>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              aria-expanded={techOpen}
              aria-controls={techId}
              data-waraqa-guide-preview-tech="1"
              onClick={() => setTechOpen((v) => !v)}
              style={btnStyle}
            >
              {techOpen ? 'إخفاء التفاصيل التقنية' : 'تفاصيل تقنية (مفاتيح)'}
            </button>
            {techOpen ? (
              <div id={techId} style={{ ...blockStyle, fontSize: 12, color: '#444' }}>
                <div>firedRuleKeys: {preview.firedRuleKeys.join(', ') || '—'}</div>
                <div>sanitized: {JSON.stringify(preview.sanitizedAnswers)}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: GuidePreviewQuestion
  value: string | string[] | undefined
  onChange: (next: string | string[] | null) => void
}) {
  // Use type="button" controls — not native radio/checkbox/select — so Payload's
  // document-form readOnly cascade cannot mark ephemeral preview inputs as disabled-looking.
  if (question.questionType === 'boolean') {
    return (
      <div
        role="group"
        aria-label={question.prompt}
        data-waraqa-guide-preview-controls="boolean"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        <PreviewChoiceButton
          selected={value === 'yes'}
          onClick={() => onChange('yes')}
          testId="boolean-yes"
          label="نعم"
        />
        <PreviewChoiceButton
          selected={value === 'no'}
          onClick={() => onChange('no')}
          testId="boolean-no"
          label="لا"
        />
      </div>
    )
  }

  if (question.questionType === 'single') {
    return (
      <div
        role="listbox"
        aria-label={question.prompt}
        data-waraqa-guide-preview-controls="single"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        <PreviewChoiceButton
          selected={!value}
          onClick={() => onChange(null)}
          testId="single-clear"
          label="— اختر —"
        />
        {question.options.map((o) => (
          <PreviewChoiceButton
            key={o.key}
            selected={value === o.key}
            onClick={() => onChange(o.key)}
            testId={`single-${o.key}`}
            label={o.label}
          />
        ))}
      </div>
    )
  }

  const selected = Array.isArray(value) ? value : []
  return (
    <div
      role="group"
      aria-label={question.prompt}
      data-waraqa-guide-preview-controls="multi"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {question.options.map((o) => {
        const checked = selected.includes(o.key)
        return (
          <PreviewChoiceButton
            key={o.key}
            selected={checked}
            onClick={() => {
              if (checked) onChange(selected.filter((k) => k !== o.key))
              else onChange([...selected, o.key])
            }}
            testId={`multi-${o.key}`}
            label={o.label}
          />
        )
      })}
    </div>
  )
}

function PreviewChoiceButton({
  selected,
  onClick,
  label,
  testId,
}: {
  selected: boolean
  onClick: () => void
  label: string
  testId: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-waraqa-guide-preview-choice={testId}
      data-waraqa-guide-preview-selected={selected ? '1' : '0'}
      onClick={onClick}
      style={{
        ...choiceBtnBase,
        background: selected ? '#0b3d2e' : '#fff',
        color: selected ? '#fff' : '#1a1a1a',
        borderColor: selected ? '#0b3d2e' : '#8a9690',
        fontWeight: selected ? 600 : 500,
        cursor: 'pointer',
        opacity: 1,
        pointerEvents: 'auto',
      }}
    >
      {label}
    </button>
  )
}

function ResultList({
  label,
  items,
  testId,
}: {
  label: string
  items: Array<{ key: string; title: string; detail: string | null; why: string | null }>
  testId: string
}) {
  return (
    <div data-waraqa-guide-preview-list={testId} style={blockStyle}>
      <strong>{label}</strong>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#666' }}>—</div>
      ) : (
        <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
          {items.map((item) => (
            <li key={item.key}>
              {item.title}
              {item.detail ? ` — ${item.detail}` : ''}
              {item.why ? (
                <span style={{ display: 'block', fontSize: 12, color: '#666' }}>{item.why}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: '#f7f9f8',
  border: '1px solid #c5d0cb',
  borderRadius: 8,
  padding: '12px 14px',
  width: '100%',
  marginBottom: 16,
}

const headerRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
}

const noticeStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 12,
  color: '#555',
  lineHeight: 1.5,
}

const errorStyle: React.CSSProperties = {
  background: '#f8e8e8',
  border: '1px solid #c45c5c',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#5c1a1a',
  marginTop: 8,
  fontSize: 13,
}

const warnStyle: React.CSSProperties = {
  background: '#fff4df',
  border: '1px solid #c4a35a',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#5c4510',
  marginTop: 8,
  fontSize: 13,
}

const questionBox: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d5ddd9',
  borderRadius: 6,
  padding: '10px 12px',
}

const blockStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  lineHeight: 1.5,
}

const btnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #bbb',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  fontSize: 12,
}

const primaryBtn: React.CSSProperties = {
  ...btnStyle,
  background: '#0b3d2e',
  borderColor: '#0b3d2e',
  color: '#fff',
  fontWeight: 600,
}

const choiceBtnBase: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 6,
  border: '1px solid #8a9690',
  fontSize: 13,
  lineHeight: 1.3,
}

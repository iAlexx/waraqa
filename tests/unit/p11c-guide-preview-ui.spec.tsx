import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GuideRulePreviewView } from '@/components/admin/GuideRulePreviewView'
import type {
  GuidePreviewCatalogResponse,
  TransactionGuidePreview,
} from '@/lib/admin/guide-preview-types'

afterEach(() => cleanup())

function catalog(
  partial: Partial<GuidePreviewCatalogResponse> = {},
): GuidePreviewCatalogResponse {
  return {
    basedOn: 'last_saved',
    loadedAt: '2026-09-12T00:00:00.000Z',
    guideEnabled: true,
    evaluationState: 'incomplete',
    messageAr: null,
    activeRuleCount: 2,
    unknownDiagnosticsLimited: true,
    questions: [
      {
        key: 'age_group',
        prompt: 'هل أنت بالغ؟',
        helpText: null,
        questionType: 'boolean',
        required: true,
        options: [],
        visible: true,
      },
      {
        key: 'issuance',
        prompt: 'نوع المعاملة؟',
        helpText: null,
        questionType: 'single',
        required: true,
        options: [
          { key: 'first_time', label: 'أول مرة' },
          { key: 'renewal', label: 'تجديد' },
        ],
        visible: true,
      },
      {
        key: 'needs',
        prompt: 'احتياجات؟',
        helpText: null,
        questionType: 'multi',
        required: false,
        options: [{ key: 'urgent', label: 'مستعجل' }],
        visible: true,
      },
    ],
    ...partial,
  }
}

function readyPreview(
  partial: Partial<TransactionGuidePreview> = {},
): TransactionGuidePreview {
  return {
    basedOn: 'last_saved',
    evaluatedAt: '2026-09-12T00:00:00.000Z',
    guideEnabled: true,
    evaluationState: 'ready',
    messageAr: null,
    questions: catalog().questions,
    sanitizedAnswers: { age_group: 'yes', issuance: 'first_time' },
    activeRuleCount: 2,
    firedRuleKeys: ['rule_first'],
    firedRules: [
      {
        key: 'rule_first',
        explanation: 'لأنك أول مرة',
        status: 'fired',
        effects: [{ type: 'selectVariant', targetKey: 'variant_first', labelAr: 'اختيار متغير ← variant_first' }],
      },
    ],
    unknownWhenRuleKeys: [],
    rulesSummaryAr: 'تم تشغيل 1 من أصل 2 قاعدة',
    variant: { key: 'variant_first', title: 'إصدار أول مرة', explanation: null },
    documents: [{ key: 'doc_id', title: 'هوية', detail: null, why: null }],
    steps: [{ key: 'step_prepare', title: 'حضّر', detail: null, why: null }],
    fees: [{ key: 'fee_base', title: 'رسم', detail: null, why: null }],
    notices: [],
    unknownDiagnosticsLimited: true,
    ...partial,
  }
}

describe('P11-C GuideRulePreviewView', () => {
  it('renders panel, saved notice, disclaimer, human labels, controls', () => {
    const onEvaluate = vi.fn()
    const onReset = vi.fn()
    const onReload = vi.fn()
    const onAnswers = vi.fn()
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={null}
        answers={{}}
        onAnswersChange={onAnswers}
        onEvaluate={onEvaluate}
        onReset={onReset}
        onReloadCatalog={onReload}
      />,
    )
    expect(screen.getByLabelText('معاينة قواعد الدليل')).toBeTruthy()
    expect(screen.getByText(/المعاينة تعتمد على آخر نسخة محفوظة/)).toBeTruthy()
    expect(screen.getByText(/أداة تحريرية ولا تغيّر حالة النشر/)).toBeTruthy()
    expect(screen.getByText(/هل أنت بالغ؟/)).toBeTruthy()
    expect(screen.getByText('أول مرة')).toBeTruthy()
    expect(screen.getByText('مستعجل')).toBeTruthy()
    expect(screen.getByLabelText('تشغيل معاينة القواعد')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('تشغيل معاينة القواعد'))
    expect(onEvaluate).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('إعادة تعيين إجابات المعاينة'))
    expect(onReset).toHaveBeenCalled()
  })

  it('boolean / single / multi choice buttons call onAnswersChange and look interactive', () => {
    const onAnswers = vi.fn()
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={null}
        answers={{}}
        onAnswersChange={onAnswers}
      />,
    )
    const yes = screen.getByRole('button', { name: 'نعم' })
    expect(yes.getAttribute('aria-pressed')).toBe('false')
    expect((yes as HTMLButtonElement).disabled).toBe(false)
    expect(yes.getAttribute('readonly')).toBeNull()
    fireEvent.click(yes)
    expect(onAnswers).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'أول مرة' }))
    expect(onAnswers).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'مستعجل' }))
    expect(onAnswers).toHaveBeenCalled()
  })

  it('selected choice buttons expose aria-pressed without looking disabled', () => {
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={null}
        answers={{ age_group: 'yes', issuance: 'first_time', needs: ['urgent'] }}
        onAnswersChange={() => {}}
      />,
    )
    const yes = screen.getByRole('button', { name: 'نعم' })
    expect(yes.getAttribute('aria-pressed')).toBe('true')
    expect(yes.getAttribute('data-waraqa-guide-preview-selected')).toBe('1')
    expect((yes as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('READY: fired rules + variant + result lists', () => {
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={readyPreview()}
        answers={{ age_group: 'yes', issuance: 'first_time' }}
        onAnswersChange={() => {}}
      />,
    )
    expect(screen.getByText('نتيجة المعاينة')).toBeTruthy()
    expect(screen.getByText(/إصدار أول مرة/)).toBeTruthy()
    expect(screen.getByText(/لأنك أول مرة/)).toBeTruthy()
    expect(screen.getByText('هوية')).toBeTruthy()
    expect(screen.getByText('حضّر')).toBeTruthy()
    expect(screen.getByText('رسم')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/ObjectId|mongodb/i)
  })

  it('incomplete / UNKNOWN state displayed safely', () => {
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={readyPreview({
          evaluationState: 'incomplete',
          messageAr: 'أجب على كل الأسئلة الإلزامية الظاهرة قبل عرض النتيجة.',
          variant: null,
          firedRuleKeys: [],
          firedRules: [],
          unknownWhenRuleKeys: ['rule_first'],
        })}
        answers={{ age_group: 'yes' }}
        onAnswersChange={() => {}}
      />,
    )
    expect(screen.getByText(/أجب على كل الأسئلة/)).toBeTruthy()
    expect(screen.getByText(/UNKNOWN/)).toBeTruthy()
  })

  it('no mutation buttons introduced', () => {
    render(
      <GuideRulePreviewView
        catalog={catalog()}
        preview={readyPreview()}
        answers={{}}
        onAnswersChange={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /نشر|اعتماد|حفظ الإجابات/ })).toBeNull()
  })
})

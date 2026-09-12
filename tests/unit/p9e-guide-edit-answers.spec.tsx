import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { GuideClient } from '@/components/guide/guide-client'
import {
  ANSWER_SUMMARY_HEADING_AR,
  EDIT_ANSWER_LABEL_AR,
} from '@/lib/guide/answer-labels'
import { PRINT_RESULT_BUTTON_LABEL_AR } from '@/lib/guide/print-labels'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import {
  WHATSAPP_SHARE_BUTTON_LABEL_AR,
  decodeWhatsAppShareText,
} from '@/lib/guide/whatsapp-share'

const SITE = 'https://waraqa.test'

beforeEach(() => {
  process.env.NEXT_PUBLIC_SERVER_URL = SITE
  try {
    window.localStorage.clear()
  } catch {
    // ignore
  }
})

afterEach(() => {
  cleanup()
  try {
    window.localStorage.clear()
  } catch {
    // ignore
  }
  vi.restoreAllMocks()
})

function buildGuide(overrides: Partial<PublicGuideDTO> = {}): PublicGuideDTO {
  return {
    transactionId: 1,
    slug: 'tx-p9e-fixture',
    title: 'معاملة اختبار تعديل الإجابات',
    summary: 'ملخص',
    lastReviewedLabel: '١ كانون الثاني ٢٠٢٦',
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    demoLabeled: false,
    detailHref: '/transactions/tx-p9e-fixture',
    questions: [
      {
        key: 'is_adult',
        questionType: 'boolean',
        prompt: 'هل أنت بالغ؟',
        helpText: null,
        required: true,
        active: true,
        options: [],
        visibleWhen: null,
      },
      {
        key: 'needs_guardian',
        questionType: 'boolean',
        prompt: 'هل تحتاج موافقة ولي الأمر؟',
        helpText: null,
        required: true,
        active: true,
        options: [],
        visibleWhen: {
          all: [{ questionKey: 'is_adult', operator: 'equals', value: 'no' }],
        },
      },
      {
        key: 'doc_kind',
        questionType: 'single',
        prompt: 'نوع الوثيقة؟',
        helpText: null,
        required: true,
        active: true,
        options: [
          { key: 'passport', label: 'جواز سفر' },
          { key: 'id_card', label: 'بطاقة هوية' },
        ],
        visibleWhen: null,
      },
      {
        key: 'extras',
        questionType: 'multi',
        prompt: 'إضافات؟',
        helpText: null,
        required: false,
        active: true,
        options: [
          { key: 'photo', label: 'صور' },
          { key: 'stamp', label: 'طابع' },
        ],
        visibleWhen: null,
      },
    ],
    variants: [],
    notices: [],
    rules: [
      {
        key: 'include-guardian-doc',
        priority: 10,
        active: true,
        explanation: null,
        when: {
          all: [{ questionKey: 'needs_guardian', operator: 'equals', value: 'yes' }],
        },
        effects: [{ type: 'includeDocument', targetKey: 'doc_guardian' }],
      },
      {
        key: 'include-passport-doc',
        priority: 20,
        active: true,
        explanation: null,
        when: {
          all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'passport' }],
        },
        effects: [{ type: 'includeDocument', targetKey: 'doc_passport' }],
      },
    ],
    documents: [
      {
        key: 'doc_id',
        requirementType: 'required',
        title: 'هوية شخصية',
        detail: null,
      },
      {
        key: 'doc_guardian',
        requirementType: 'conditional',
        title: 'موافقة ولي الأمر',
        detail: null,
      },
      {
        key: 'doc_passport',
        requirementType: 'conditional',
        title: 'جواز السفر الحالي',
        detail: null,
      },
    ],
    steps: [{ key: 'step_one', title: 'خطوة إعداد', detail: null }],
    fees: [],
    sources: [],
    ...overrides,
  }
}

async function waitForStorageReady() {
  await vi.waitFor(() => {
    expect(document.querySelector('[data-guide-storage-ready="true"]')).toBeTruthy()
  })
}

async function answerFlowMinorWithGuardian(user: ReturnType<typeof userEvent.setup>) {
  await waitForStorageReady()
  // Q1 adult? → no (shows guardian)
  await user.click(screen.getByText(/^لا$/))
  await user.click(screen.getByRole('button', { name: 'التالي' }))
  // Q2 guardian? → yes
  await user.click(screen.getByText(/^نعم$/))
  await user.click(screen.getByRole('button', { name: 'التالي' }))
  // Q3 doc kind → passport
  await user.click(screen.getByText('جواز سفر'))
  await user.click(screen.getByRole('button', { name: 'التالي' }))
  // Q4 multi optional — skip
  await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
  expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
}

describe('P9-E GuideClient edit answers', () => {
  it('A–G: answer summary shows human labels and edit actions', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)

    const summary = screen.getByTestId('guide-answer-summary')
    expect(within(summary).getByRole('heading', { name: ANSWER_SUMMARY_HEADING_AR })).toBeInTheDocument()
    expect(within(summary).getByText('هل أنت بالغ؟')).toBeInTheDocument()
    expect(within(summary).getByText('لا')).toBeInTheDocument()
    expect(within(summary).getByText('هل تحتاج موافقة ولي الأمر؟')).toBeInTheDocument()
    expect(within(summary).getByText('نعم')).toBeInTheDocument()
    expect(within(summary).getByText('نوع الوثيقة؟')).toBeInTheDocument()
    expect(within(summary).getByText('جواز سفر')).toBeInTheDocument()

    expect(summary.textContent).not.toContain('is_adult')
    expect(summary.textContent).not.toContain('needs_guardian')
    expect(summary.textContent).not.toContain('passport')
    expect(summary.textContent).not.toContain('doc_kind')

    expect(within(summary).getAllByRole('button', { name: EDIT_ANSWER_LABEL_AR }).length).toBeGreaterThanOrEqual(3)
  })

  it('H–N: edit earlier answer recalculates, prunes stale docs, keeps surviving checks', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)

    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /جواز السفر الحالي/ })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()

    const editAdult = document.querySelector(
      '[data-guide-edit-answer="is_adult"]',
    ) as HTMLButtonElement
    expect(editAdult).toBeTruthy()
    await user.click(editAdult)

    expect(screen.queryByRole('heading', { name: 'نتيجة التحضير' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'هل أنت بالغ؟' })).toBeInTheDocument()

    await user.click(screen.getByText(/^نعم$/))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByRole('heading', { name: 'نوع الوثيقة؟' })).toBeInTheDocument()
    await user.click(screen.getByText('جواز سفر'))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))

    expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /موافقة ولي الأمر/ })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /جواز السفر الحالي/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()

    const summary = screen.getByTestId('guide-answer-summary')
    expect(within(summary).queryByText('هل تحتاج موافقة ولي الأمر؟')).not.toBeInTheDocument()
    expect(within(summary).getByText('هل أنت بالغ؟')).toBeInTheDocument()
    expect(within(summary).getByText('نعم')).toBeInTheDocument()
  })

  it('O–P: persistence updates and reload restores edited answers', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)

    const editAdult = document.querySelector('[data-guide-edit-answer="is_adult"]') as HTMLButtonElement
    await user.click(editAdult)
    await user.click(screen.getByText(/^نعم$/))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByText('بطاقة هوية'))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))

    await vi.waitFor(() => {
      const raw = window.localStorage.getItem('waraqa:guide:tx-p9e-fixture')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!) as { answers: Record<string, unknown>; showResult: boolean }
      expect(parsed.showResult).toBe(true)
      expect(parsed.answers.is_adult).toBe('yes')
      expect(parsed.answers).not.toHaveProperty('needs_guardian')
      expect(parsed.answers.doc_kind).toBe('id_card')
    })

    unmount()
    render(<GuideClient guide={buildGuide()} />)
    await waitForStorageReady()
    expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
    expect(screen.getByTestId('guide-answer-summary')).toHaveTextContent('بطاقة هوية')
    expect(screen.queryByRole('checkbox', { name: /جواز السفر الحالي/ })).not.toBeInTheDocument()
  })

  it('Q–S: print/share use recalculated result; WhatsApp has no raw answers', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)

    expect(screen.getByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR })).toBeInTheDocument()
    const beforeHref = screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR }).getAttribute('href')!
    expect(decodeWhatsAppShareText(beforeHref)).toContain('موافقة ولي الأمر')

    const editAdult = document.querySelector('[data-guide-edit-answer="is_adult"]') as HTMLButtonElement
    await user.click(editAdult)
    await user.click(screen.getByText(/^نعم$/))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByText('جواز سفر'))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))

    const afterHref = screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR }).getAttribute('href')!
    const text = decodeWhatsAppShareText(afterHref)
    expect(text).not.toContain('موافقة ولي الأمر')
    expect(text).toContain('جواز السفر الحالي')
    expect(text).not.toContain('is_adult')
    expect(text).not.toContain('needs_guardian')
    expect(document.querySelector('[data-guide-answer-summary]')).toBeTruthy()
    expect(document.querySelector('[data-guide-edit-answer]')?.hasAttribute('data-print-hide')).toBe(true)
  })

  it('T: restart clears answers, checklist, persistence, result', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('button', { name: 'ابدأ من جديد' }))
    expect(screen.queryByRole('heading', { name: 'نتيجة التحضير' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'هل أنت بالغ؟' })).toBeInTheDocument()
    expect(window.localStorage.getItem('waraqa:guide:tx-p9e-fixture')).toBeNull()
  })

  it('U: edit controls are keyboard operable buttons', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await answerFlowMinorWithGuardian(user)
    const edit = screen.getAllByRole('button', { name: EDIT_ANSWER_LABEL_AR })[0]
    edit.focus()
    expect(edit).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('heading', { name: 'نتيجة التحضير' })).not.toBeInTheDocument()
  })
})

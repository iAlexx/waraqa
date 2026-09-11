import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { GuideClient } from '@/components/guide/guide-client'
import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import {
  PRINT_GENERATED_DATE_LABEL_AR,
  PRINT_RESULT_BUTTON_LABEL_AR,
} from '@/lib/guide/print-labels'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'

beforeEach(() => {
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
    slug: 'tx-p9c-fixture',
    title: 'معاملة اختبار طباعة',
    summary: 'ملخص',
    lastReviewedLabel: '١ كانون الثاني ٢٠٢٦',
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    demoLabeled: false,
    detailHref: '/transactions/tx-p9c-fixture',
    questions: [
      {
        key: 'needs_guardian',
        questionType: 'boolean',
        prompt: 'هل تحتاج موافقة ولي الأمر؟',
        helpText: null,
        required: true,
        active: true,
        options: [],
        visibleWhen: null,
      },
    ],
    variants: [],
    notices: [
      {
        key: 'notice_one',
        title: 'تنبيه مهم',
        body: 'راجع الدوام الرسمي قبل الحضور.',
        severity: 'warning',
        active: true,
      },
    ],
    rules: [
      {
        key: 'include-guardian',
        priority: 10,
        active: true,
        explanation: null,
        when: {
          all: [{ questionKey: 'needs_guardian', operator: 'equals', value: 'yes' }],
        },
        effects: [
          { type: 'includeDocument', targetKey: 'doc_guardian' },
          { type: 'includeNotice', targetKey: 'notice_one' },
        ],
      },
      {
        key: 'exclude-guardian',
        priority: 20,
        active: true,
        explanation: null,
        when: {
          all: [{ questionKey: 'needs_guardian', operator: 'equals', value: 'no' }],
        },
        effects: [{ type: 'excludeDocument', targetKey: 'doc_guardian' }],
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
    ],
    steps: [{ key: 'step_one', title: 'خطوة إعداد', detail: null }],
    fees: [{ key: 'fee_one', title: 'رسم أساسي', detail: null }],
    sources: [
      {
        title: 'مصدر رسمي للطباعة',
        primary: true,
        officialLink: { href: 'https://example.gov.sy/source', label: 'مصدر' },
      },
    ],
    ...overrides,
  }
}

async function waitForStorageReady() {
  await vi.waitFor(() => {
    expect(document.querySelector('[data-guide-storage-ready="true"]')).toBeTruthy()
  })
}

async function reachResult(user: ReturnType<typeof userEvent.setup>, answer: 'yes' | 'no' = 'yes') {
  await waitForStorageReady()
  const label = answer === 'yes' ? /^نعم$/ : /^لا$/
  await user.click(screen.getByText(label))
  await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
  expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
}

describe('P9-C GuideClient print result', () => {
  it('A: shows print button on successful result', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)
    expect(screen.getByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR })).toBeInTheDocument()
  })

  it('B: hides print button before result', async () => {
    render(<GuideClient guide={buildGuide()} />)
    await waitForStorageReady()
    expect(screen.queryByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR })).not.toBeInTheDocument()
  })

  it('C–F: print calls window.print without mutating answers, checklist, or localStorage', async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await vi.waitFor(() => {
      const raw = window.localStorage.getItem('waraqa:guide:tx-p9c-fixture')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!) as {
        answers: Record<string, string>
        checkedDocumentKeys: string[]
      }
      expect(parsed.answers.needs_guardian).toBe('yes')
      expect(parsed.checkedDocumentKeys).toContain('doc_id')
    })

    const beforeStorage = window.localStorage.getItem('waraqa:guide:tx-p9c-fixture')
    expect(beforeStorage).toBeTruthy()
    const beforeParsed = JSON.parse(beforeStorage!) as {
      answers: Record<string, string>
      checkedDocumentKeys: string[]
      updatedAt: string
    }

    await user.click(screen.getByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR }))
    expect(printSpy).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).not.toBeChecked()

    const afterStorage = window.localStorage.getItem('waraqa:guide:tx-p9c-fixture')
    expect(afterStorage).toBe(beforeStorage)
    const afterParsed = JSON.parse(afterStorage!) as typeof beforeParsed
    expect(afterParsed.answers).toEqual(beforeParsed.answers)
    expect(afterParsed.checkedDocumentKeys).toEqual(beforeParsed.checkedDocumentKeys)
  })

  it('G–L: print sheet contains title, docs, steps, fees, notices, sources, disclaimer', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    const sheet = document.querySelector('[data-guide-print-sheet]')
    expect(sheet).toBeTruthy()
    expect(within(sheet as HTMLElement).getByText('معاملة اختبار طباعة')).toBeInTheDocument()
    expect(within(sheet as HTMLElement).getByText('هوية شخصية')).toBeInTheDocument()
    expect(within(sheet as HTMLElement).getByText('خطوة إعداد')).toBeInTheDocument()
    expect(within(sheet as HTMLElement).getByText('رسم أساسي')).toBeInTheDocument()
    expect(within(sheet as HTMLElement).getByText('تنبيه مهم')).toBeInTheDocument()
    expect(within(sheet as HTMLElement).getByText(/مصدر رسمي للطباعة/)).toBeInTheDocument()
    expect(
      within(sheet as HTMLElement).getByText(/ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً/),
    ).toBeInTheDocument()
  })

  it('M: DEMO result chrome includes demo warning', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide({ demoLabeled: true })} />)
    await reachResult(user)

    const chrome = document.querySelector('[data-guide-print-chrome]')
    expect(chrome).toBeTruthy()
    expect(within(chrome as HTMLElement).getByText(DEMO_PUBLIC_LABEL_AR)).toBeInTheDocument()
  })

  it('N: PRODUCTION result chrome omits demo warning', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide({ demoLabeled: false })} />)
    await reachResult(user)

    const chrome = document.querySelector('[data-guide-print-chrome]')
    expect(chrome).toBeTruthy()
    expect(within(chrome as HTMLElement).queryByText(DEMO_PUBLIC_LABEL_AR)).not.toBeInTheDocument()
  })

  it('O: generated print date is separate from verification label', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    const generated = document.querySelector('[data-guide-print-generated-at]')
    expect(generated?.textContent).toContain(PRINT_GENERATED_DATE_LABEL_AR)
    expect(generated?.textContent?.length).toBeGreaterThan(PRINT_GENERATED_DATE_LABEL_AR.length + 2)

    const verification = document.querySelector('[data-guide-verification-label]')
    expect(verification?.textContent).toBe('١ كانون الثاني ٢٠٢٦')
    expect(generated?.textContent).not.toContain('١ كانون الثاني ٢٠٢٦')
  })

  it('P: checked and unchecked checklist items expose print-readable state attrs', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))

    const checked = document.querySelector('[data-checklist-item="doc_id"]')
    const unchecked = document.querySelector('[data-checklist-item="doc_guardian"]')
    expect(checked?.getAttribute('data-checklist-checked')).toBe('true')
    expect(unchecked?.getAttribute('data-checklist-checked')).toBe('false')
  })

  it('Q: guide controls carry print-hide markers', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    expect(document.querySelector('[data-guide-controls][data-print-hide]')).toBeTruthy()
    expect(document.querySelector('[data-guide-print-button][data-print-hide], [data-guide-print-button]')).toBeTruthy()
    const printBtn = document.querySelector('[data-guide-print-button]')
    expect(printBtn?.closest('[data-print-hide]')).toBeTruthy()
  })
})

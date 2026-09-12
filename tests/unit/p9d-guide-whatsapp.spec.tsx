import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { GuideClient } from '@/components/guide/guide-client'
import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import { PRINT_RESULT_BUTTON_LABEL_AR } from '@/lib/guide/print-labels'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'
import {
  WHATSAPP_SHARE_BUTTON_LABEL_AR,
  WHATSAPP_SHARE_DISCLAIMER_AR,
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
    slug: 'tx-p9d-fixture',
    title: 'معاملة اختبار واتساب',
    summary: 'ملخص',
    lastReviewedLabel: '١ كانون الثاني ٢٠٢٦',
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    demoLabeled: false,
    detailHref: '/transactions/tx-p9d-fixture',
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
        key: 'notice_warn',
        title: 'تنبيه دوام',
        body: 'راجع قبل الحضور',
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
          { type: 'includeNotice', targetKey: 'notice_warn' },
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
        title: 'مصدر رسمي',
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
  await user.click(screen.getByText(answer === 'yes' ? /^نعم$/ : /^لا$/))
  await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
  expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
}

describe('P9-D GuideClient WhatsApp share', () => {
  it('A: shows WhatsApp share on successful result', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)
    expect(screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR })).toBeInTheDocument()
  })

  it('B: share action absent before result', async () => {
    render(<GuideClient guide={buildGuide()} />)
    await waitForStorageReady()
    expect(screen.queryByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR })).not.toBeInTheDocument()
  })

  it('T–U: reading share href does not mutate answers, checklist, or localStorage', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))

    await vi.waitFor(() => {
      const raw = window.localStorage.getItem('waraqa:guide:tx-p9d-fixture')
      expect(raw).toBeTruthy()
    })
    const before = window.localStorage.getItem('waraqa:guide:tx-p9d-fixture')

    const link = screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/)
    link.addEventListener('click', (e) => e.preventDefault())
    await user.click(link)

    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(window.localStorage.getItem('waraqa:guide:tx-p9d-fixture')).toBe(before)
  })

  it('message from href includes title/docs/steps/disclaimer/URL and no raw keys', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)

    const href = screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR }).getAttribute('href')
    expect(href).toBeTruthy()
    const text = decodeWhatsAppShareText(href!)
    expect(text).toContain('معاملة اختبار واتساب')
    expect(text).toContain('هوية شخصية')
    expect(text).toContain('موافقة ولي الأمر')
    expect(text).toContain('خطوة إعداد')
    expect(text).toContain(WHATSAPP_SHARE_DISCLAIMER_AR)
    expect(text).toContain(`${SITE}/transactions/tx-p9d-fixture`)
    expect(text).not.toContain('needs_guardian')
    expect(text).not.toContain('include-guardian')
    expect(text).not.toContain('doc_id')
    expect(text).not.toContain('محدّد للتحضير')
  })

  it('M/N: DEMO vs PRODUCTION warning in share text', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<GuideClient guide={buildGuide({ demoLabeled: true })} />)
    await reachResult(user)
    const demoText = decodeWhatsAppShareText(
      screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR }).getAttribute('href')!,
    )
    expect(demoText).toContain(DEMO_PUBLIC_LABEL_AR)
    unmount()
    window.localStorage.clear()

    render(<GuideClient guide={buildGuide({ demoLabeled: false })} />)
    await reachResult(user)
    const prodText = decodeWhatsAppShareText(
      screen.getByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR }).getAttribute('href')!,
    )
    expect(prodText).not.toContain(DEMO_PUBLIC_LABEL_AR)
  })

  it('W: hides share when site origin missing', async () => {
    delete process.env.NEXT_PUBLIC_SERVER_URL
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user)
    expect(screen.queryByRole('link', { name: WHATSAPP_SHARE_BUTTON_LABEL_AR })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: PRINT_RESULT_BUTTON_LABEL_AR })).toBeInTheDocument()
  })
})

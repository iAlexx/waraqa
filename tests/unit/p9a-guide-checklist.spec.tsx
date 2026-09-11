import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { GuideClient } from '@/components/guide/guide-client'
import {
  CHECKLIST_CLEAR_ALL_LABEL_AR,
  CHECKLIST_SAFETY_COPY_AR,
} from '@/lib/guide/checklist-state'
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
})

function buildGuide(): PublicGuideDTO {
  return {
    transactionId: 1,
    slug: 'tx-p9a-fixture',
    title: 'معاملة اختبار قائمة',
    summary: 'ملخص',
    lastReviewedLabel: null,
    lastReviewedAt: null,
    demoLabeled: false,
    detailHref: '/transactions/tx-p9a-fixture',
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
    notices: [],
    rules: [
      {
        key: 'include-guardian',
        priority: 10,
        active: true,
        explanation: null,
        when: {
          all: [{ questionKey: 'needs_guardian', operator: 'equals', value: 'yes' }],
        },
        effects: [{ type: 'includeDocument', targetKey: 'doc_guardian' }],
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
    sources: [],
  }
}

async function waitForStorageReady() {
  await vi.waitFor(() => {
    expect(document.querySelector('[data-guide-storage-ready="true"]')).toBeTruthy()
  })
}

async function reachResult(user: ReturnType<typeof userEvent.setup>, answer: 'yes' | 'no') {
  await waitForStorageReady()
  const label = answer === 'yes' ? /^نعم$/ : /^لا$/
  await user.click(screen.getByText(label))
  await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
  expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
}

describe('P9-A GuideClient documents checklist', () => {
  it('renders checkboxes, safety copy, and keeps steps/fees display-only', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')

    expect(screen.getByText(CHECKLIST_SAFETY_COPY_AR)).toBeInTheDocument()

    const checklist = screen.getByTestId('guide-documents-checklist')
    expect(within(checklist).getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).toBeInTheDocument()

    // Steps/fees remain display-only (no checkboxes outside the documents list)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'الخطوات' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'الرسوم' })).toBeInTheDocument()
    expect(screen.getByText('خطوة إعداد')).toBeInTheDocument()
    expect(screen.getByText('رسم أساسي')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CHECKLIST_CLEAR_ALL_LABEL_AR })).toBeDisabled()
  })

  it('checks, unchecks, and clear-all without changing answers', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')

    const idBox = screen.getByRole('checkbox', { name: /هوية شخصية/ })
    const guardianBox = screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })

    await user.click(idBox)
    expect(idBox).toBeChecked()
    await user.click(idBox)
    expect(idBox).not.toBeChecked()

    await user.click(idBox)
    await user.click(guardianBox)
    expect(idBox).toBeChecked()
    expect(guardianBox).toBeChecked()

    await user.click(screen.getByRole('button', { name: CHECKLIST_CLEAR_ALL_LABEL_AR }))
    expect(idBox).not.toBeChecked()
    expect(guardianBox).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(screen.getByRole('heading', { name: 'هل تحتاج موافقة ولي الأمر؟' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'نعم' })).toBeChecked()
  })

  it('restart clears checklist state', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')

    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'ابدأ من جديد' }))
    await reachResult(user, 'yes')
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).not.toBeChecked()
  })

  it('prunes removed docs, keeps surviving checked docs, and starts new docs unchecked', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')

    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    await user.click(screen.getByRole('radio', { name: 'لا' }))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))

    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /موافقة ولي الأمر/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    await user.click(screen.getByRole('radio', { name: 'نعم' }))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))

    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).not.toBeChecked()
  })

  it('supports keyboard checkbox operation', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')

    const idBox = screen.getByRole('checkbox', { name: /هوية شخصية/ })
    idBox.focus()
    expect(idBox).toHaveFocus()
    await user.keyboard(' ')
    expect(idBox).toBeChecked()
    await user.keyboard(' ')
    expect(idBox).not.toBeChecked()
  })

  it('does not put checklist state in the URL', async () => {
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))

    expect(window.location.search).not.toMatch(/doc_id|checked|checklist/i)
    expect(window.location.hash).not.toMatch(/doc_id|checked|checklist/i)
  })

  it('does not submit checklist state to the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ }))
    await user.click(screen.getByRole('button', { name: CHECKLIST_CLEAR_ALL_LABEL_AR }))
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

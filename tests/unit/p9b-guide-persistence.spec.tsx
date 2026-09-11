import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { GuideClient } from '@/components/guide/guide-client'
import {
  GUIDE_LOCAL_STORAGE_VERSION,
  computeGuideSchemaVersion,
  guideLocalStorageKey,
} from '@/lib/guide/guide-local-storage'
import type { PublicGuideDTO } from '@/lib/guide/public-guide-map'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

function buildGuide(): PublicGuideDTO {
  return {
    transactionId: 7,
    slug: 'tx-p9b-ui',
    title: 'معاملة حفظ',
    summary: 'ملخص',
    lastReviewedLabel: null,
    lastReviewedAt: null,
    demoLabeled: false,
    detailHref: '/transactions/tx-p9b-ui',
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
      { key: 'doc_id', requirementType: 'required', title: 'هوية شخصية', detail: null },
      {
        key: 'doc_guardian',
        requirementType: 'conditional',
        title: 'موافقة ولي الأمر',
        detail: null,
      },
    ],
    steps: [],
    fees: [],
    sources: [],
  }
}

async function waitReady() {
  await vi.waitFor(() => {
    expect(document.querySelector('[data-guide-storage-ready="true"]')).toBeTruthy()
  })
}

async function reachResult(user: ReturnType<typeof userEvent.setup>, answer: 'yes' | 'no') {
  await waitReady()
  await user.click(screen.getByText(answer === 'yes' ? /^نعم$/ : /^لا$/))
  await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
  expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
}

describe('P9-B GuideClient local persistence', () => {
  it('restores answers and checked documents after remount', async () => {
    const user = userEvent.setup()
    const guide = buildGuide()
    const { unmount } = render(<GuideClient guide={guide} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).toBeChecked()

    unmount()
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /موافقة ولي الأمر/ })).toBeChecked()
  })

  it('persists clear-all and restores unchecked state', async () => {
    const user = userEvent.setup()
    const guide = buildGuide()
    const { unmount } = render(<GuideClient guide={guide} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('button', { name: 'إلغاء تحديد الكل' }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).not.toBeChecked()

    unmount()
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).not.toBeChecked()
  })

  it('restart deletes stored state so remount does not restore', async () => {
    const user = userEvent.setup()
    const guide = buildGuide()
    const { unmount } = render(<GuideClient guide={guide} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    await user.click(screen.getByRole('button', { name: 'ابدأ من جديد' }))
    expect(window.localStorage.getItem(guideLocalStorageKey(guide.slug))).toBeNull()

    unmount()
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(screen.queryByRole('heading', { name: 'نتيجة التحضير' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'هل تحتاج موافقة ولي الأمر؟' })).toBeInTheDocument()
  })

  it('restores valid boolean no and drops stale checklist keys on result', async () => {
    const guide = buildGuide()
    window.localStorage.setItem(
      guideLocalStorageKey(guide.slug),
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: guide.slug,
        transactionId: String(guide.transactionId),
        answers: { needs_guardian: 'no' },
        checkedDocumentKeys: ['doc_id', 'doc_guardian', 'doc_stale'],
        stepIndex: 0,
        showResult: true,
        updatedAt: new Date().toISOString(),
      }),
    )
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /موافقة ولي الأمر/ })).not.toBeInTheDocument()
  })

  it('keeps working when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()
  })

  it('does not put answers or checklist in the URL and does not fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    render(<GuideClient guide={buildGuide()} />)
    await reachResult(user, 'yes')
    await user.click(screen.getByRole('checkbox', { name: /هوية شخصية/ }))
    expect(window.location.search).not.toMatch(/needs_guardian|doc_id|checked|checklist/i)
    expect(window.location.hash).not.toMatch(/needs_guardian|doc_id|checked|checklist/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('A/B: valid saved state is not overwritten by default empty state on mount', async () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    const saved = {
      storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
      guideSchemaVersion: computeGuideSchemaVersion(guide),
      transactionKey: guide.slug,
      transactionId: String(guide.transactionId),
      answers: { needs_guardian: 'yes' },
      checkedDocumentKeys: ['doc_id'],
      stepIndex: 0,
      showResult: true,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(key, JSON.stringify(saved))

    const writes: Array<{ answers: Record<string, unknown>; checked: string[] }> = []
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      k: string,
      v: string,
    ) {
      if (String(k) === key) {
        const parsed = JSON.parse(v) as {
          answers: Record<string, unknown>
          checkedDocumentKeys: string[]
        }
        writes.push({ answers: parsed.answers, checked: parsed.checkedDocumentKeys })
      }
      return originalSetItem.call(this, k, v)
    })

    render(<GuideClient guide={guide} />)
    // Before persistence arms, saved payload must still be intact.
    expect(JSON.parse(window.localStorage.getItem(key)!).answers).toEqual({
      needs_guardian: 'yes',
    })

    await waitReady()
    expect(screen.getByRole('heading', { name: 'نتيجة التحضير' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /هوية شخصية/ })).toBeChecked()

    // No write may persist empty default answers over the saved progress.
    expect(writes.every((w) => Object.keys(w.answers).length > 0)).toBe(true)
    expect(writes[0]?.answers).toMatchObject({ needs_guardian: 'yes' })
    expect(writes[0]?.checked).toContain('doc_id')
    expect(JSON.parse(window.localStorage.getItem(key)!).answers).toMatchObject({
      needs_guardian: 'yes',
    })
  })

  it('C: invalid saved payload is cleared; fresh answers can persist afterward', async () => {
    const guide = buildGuide()
    const key = guideLocalStorageKey(guide.slug)
    window.localStorage.setItem(key, '{not-json')
    const user = userEvent.setup()
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(window.localStorage.getItem(key)).toBeNull()
    expect(screen.getByRole('heading', { name: 'هل تحتاج موافقة ولي الأمر؟' })).toBeInTheDocument()

    await user.click(screen.getByText(/^نعم$/))
    await user.click(screen.getByRole('button', { name: 'عرض النتيجة' }))
    await vi.waitFor(() => {
      const raw = window.localStorage.getItem(key)
      expect(raw).toBeTruthy()
      expect(JSON.parse(raw!).answers).toMatchObject({ needs_guardian: 'yes' })
    })
  })

  it('D/E: out-of-range stepIndex clamps; stale showResult cannot force invalid result', async () => {
    const guide = buildGuide()
    window.localStorage.setItem(
      guideLocalStorageKey(guide.slug),
      JSON.stringify({
        storageVersion: GUIDE_LOCAL_STORAGE_VERSION,
        guideSchemaVersion: computeGuideSchemaVersion(guide),
        transactionKey: guide.slug,
        transactionId: String(guide.transactionId),
        answers: {}, // incomplete after sanitize
        checkedDocumentKeys: ['doc_id'],
        stepIndex: 99,
        showResult: true,
        updatedAt: new Date().toISOString(),
      }),
    )
    render(<GuideClient guide={guide} />)
    await waitReady()
    expect(screen.queryByRole('heading', { name: 'نتيجة التحضير' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'هل تحتاج موافقة ولي الأمر؟' })).toBeInTheDocument()
  })
})

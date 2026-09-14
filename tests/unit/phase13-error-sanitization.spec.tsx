/**
 * Phase 13 — public error UIs / report errors must not leak stacks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import HomeError from '@/app/(frontend)/error'
import TransactionDetailError from '@/app/(frontend)/transactions/[slug]/error'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function leakyError(): Error & { digest?: string } {
  const err = new Error('SECRET_INTERNAL_FAILURE at Foo.bar (src/secret.ts:99:1)') as Error & {
    digest?: string
  }
  err.stack =
    'Error: SECRET_INTERNAL_FAILURE at Foo.bar (src/secret.ts:99:1)\n    at Foo.bar (src/secret.ts:99:1)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)'
  err.digest = 'DIGEST_SHOULD_NOT_RENDER'
  return err
}

const STACKISH =
  /SECRET_INTERNAL_FAILURE|src\/secret\.ts|Foo\.bar|DIGEST_SHOULD_NOT_RENDER|node:internal/

describe('Phase 13 error sanitization', () => {
  it('home error page never renders stack / digest / message internals', () => {
    const { container } = render(<HomeError error={leakyError()} reset={() => undefined} />)
    const text = container.textContent ?? ''
    expect(text).toMatch(/صار في مشكلة/)
    expect(text).not.toMatch(STACKISH)
    expect(container.innerHTML).not.toMatch(STACKISH)
  })

  it('transaction detail error page never renders stack / digest', () => {
    const { container } = render(
      <TransactionDetailError error={leakyError()} reset={() => undefined} />,
    )
    const text = container.textContent ?? ''
    expect(text).toMatch(/تعذّر عرض المعاملة/)
    expect(text).not.toMatch(STACKISH)
    expect(container.innerHTML).not.toMatch(STACKISH)
  })

  it('report validation failures expose only public Arabic messages', () => {
    const result = validatePublicReportSubmit({
      transactionSlug: '',
      section: 'not-a-section',
      message: '<script>alert(1)</script>',
      encountered: '',
      consent: false,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/stack|Error:|at\s+\w+\.|node_modules|TypeError/i)
    expect(result.message).toMatch(/تحقق|مطلوب|صالح|نص/)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIError } from 'payload'

import { preventUnsafeTransactionHardDelete } from '@/lib/admin/transaction-delete-guard'

type MockReq = {
  context: Record<string, unknown>
  payload: {
    count: ReturnType<typeof vi.fn>
    findByID: ReturnType<typeof vi.fn>
  }
}

function mockReq(overrides: Partial<MockReq> = {}): MockReq {
  return {
    context: {},
    payload: {
      count: vi.fn(),
      findByID: vi.fn(),
    },
    ...overrides,
  }
}

describe('Phase 11 transaction hard-delete guard', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL_ENV', '')
  })

  it('allows seed bypass when context.seed is set', async () => {
    const req = mockReq({ context: { seed: true } })
    await expect(
      preventUnsafeTransactionHardDelete({ req, id: 1 } as never),
    ).resolves.toBeUndefined()
    expect(req.payload.count).not.toHaveBeenCalled()
  })

  it('blocks delete when linked user-reports exist', async () => {
    const req = mockReq()
    req.payload.count.mockResolvedValue({ totalDocs: 2 })
    await expect(
      preventUnsafeTransactionHardDelete({ req, id: 9 } as never),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('blocks previously published / approved / archived content', async () => {
    const req = mockReq()
    req.payload.count.mockResolvedValue({ totalDocs: 0 })
    req.payload.findByID.mockResolvedValue({
      workflowState: 'published',
      _status: 'published',
      publishedAt: '2026-01-01T00:00:00.000Z',
    })
    await expect(
      preventUnsafeTransactionHardDelete({ req, id: 3 } as never),
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows never-published draft hard delete', async () => {
    const req = mockReq()
    req.payload.count.mockResolvedValue({ totalDocs: 0 })
    req.payload.findByID.mockResolvedValue({
      workflowState: 'draft',
      _status: 'draft',
      publishedAt: null,
      archivedAt: null,
    })
    await expect(
      preventUnsafeTransactionHardDelete({ req, id: 4 } as never),
    ).resolves.toBeUndefined()
  })
})

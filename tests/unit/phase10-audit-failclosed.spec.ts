import { beforeEach, describe, expect, it, vi } from 'vitest'

const writeAuditEvent = vi.hoisted(() => vi.fn())

vi.mock('@/lib/workflow/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workflow/audit')>()
  return {
    ...actual,
    writeAuditEvent: (...args: unknown[]) => writeAuditEvent(...args),
  }
})

import { enforceUserReportTriage } from '@/lib/reports/triage'

describe('Phase 10 editorial audit fail-closed', () => {
  beforeEach(() => {
    writeAuditEvent.mockReset()
    writeAuditEvent.mockResolvedValue(undefined)
  })

  it('D: simulated audit failure cannot silently produce unlogged terminal state', async () => {
    writeAuditEvent.mockRejectedValueOnce(new Error('audit down'))
    const req = {
      user: { id: 7, role: 'reviewer', isActive: true },
      context: {},
      payload: {},
    }

    await expect(
      enforceUserReportTriage({
        data: {
          status: 'resolved',
          resolutionSummary: 'سبب إغلاق كافٍ للتحقق من الفشل.',
        },
        originalDoc: {
          id: 99,
          status: 'in_review',
          message: 'م',
          encountered: 'و',
          section: 'fees',
          consentAccepted: true,
          transaction: 1,
        },
        operation: 'update',
        req,
        context: {},
      } as never),
    ).rejects.toBeTruthy()

    expect(writeAuditEvent).toHaveBeenCalled()
  })

  it('stamps resolvedAt only when entering resolved', async () => {
    writeAuditEvent.mockResolvedValue(undefined)
    const req = {
      user: { id: 7, role: 'reviewer', isActive: true },
      context: {},
      payload: {},
    }
    const originalAt = '2026-01-01T00:00:00.000Z'
    const data = await enforceUserReportTriage({
      data: {
        status: 'resolved',
        reviewNotes: 'edit only',
        resolutionSummary: 'محاولة إعادة كتابة السبب',
      },
      originalDoc: {
        id: 99,
        status: 'resolved',
        resolutionSummary: 'السبب الأصلي للإغلاق يبقى.',
        resolvedAt: originalAt,
        resolvedBy: 7,
        message: 'م',
        encountered: 'و',
        section: 'fees',
        consentAccepted: true,
        transaction: 1,
      },
      operation: 'update',
      req,
      context: {},
    } as never)

    expect(data.resolvedAt).toBe(originalAt)
    expect(data.resolutionSummary).toContain('الأصلي')
    expect(writeAuditEvent).not.toHaveBeenCalled()
  })
})

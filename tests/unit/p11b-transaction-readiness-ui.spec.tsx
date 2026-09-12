import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { TransactionReadinessView } from '@/components/admin/TransactionReadinessPanel'
import type { TransactionAdminReadiness } from '@/lib/admin/transaction-readiness-types'

afterEach(() => {
  cleanup()
})

function readiness(partial: Partial<TransactionAdminReadiness> = {}): TransactionAdminReadiness {
  return {
    basedOn: 'last_saved',
    evaluatedAt: '2026-09-12T00:00:00.000Z',
    workflow: { status: 'READY', labelAr: 'جاهز', issues: [] },
    publicEligibility: {
      status: 'READY',
      labelAr: 'جاهز',
      issues: [],
      contentClassNoteAr: 'تصنيف إنتاجي، وليس دليلاً على صحة المعلومات.',
      publicContentMode: 'production',
      storedClaimTrustOk: true,
      liveClaimTrustOk: true,
    },
    claimDetails: [],
    actionItems: [],
    ...partial,
  }
}

describe('P11-B TransactionReadinessView', () => {
  it('READY state', () => {
    render(<TransactionReadinessView readiness={readiness()} />)
    expect(screen.getByText('جاهزية سير العمل / النشر')).toBeInTheDocument()
    expect(screen.getByText('أهلية الظهور للعامة')).toBeInTheDocument()
    expect(screen.getAllByText('جاهز').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/آخر نسخة محفوظة/)).toBeInTheDocument()
  })

  it('WARNING state + DEMO explanation', () => {
    render(
      <TransactionReadinessView
        readiness={readiness({
          publicEligibility: {
            status: 'WARNING',
            labelAr: 'تحذير',
            issues: [
              {
                code: 'CONTENT_CLASS_DEMO_MODE',
                severity: 'warning',
                messageAr: 'بيانات تجريبية — إن ظهرت للعامة تبقى موسومة كعرض تجريبي.',
              },
            ],
            contentClassNoteAr: 'بيانات تجريبية وتظهر للعامة فقط ضمن وضع العرض المسموح.',
            publicContentMode: 'demo',
            storedClaimTrustOk: true,
            liveClaimTrustOk: true,
          },
          actionItems: [
            {
              code: 'CONTENT_CLASS_DEMO_MODE',
              severity: 'warning',
              messageAr: 'بيانات تجريبية — إن ظهرت للعامة تبقى موسومة كعرض تجريبي.',
            },
          ],
        })}
      />,
    )
    expect(screen.getByText('تحذير')).toBeInTheDocument()
    expect(screen.getByText(/بيانات تجريبية وتظهر للعامة فقط/)).toBeInTheDocument()
  })

  it('BLOCKED state + Arabic claim key + QA_TEST', () => {
    render(
      <TransactionReadinessView
        readiness={readiness({
          workflow: {
            status: 'BLOCKED',
            labelAr: 'محظور',
            issues: [
              {
                code: 'CLAIM_NOT_AUTHORITATIVE',
                severity: 'blocker',
                messageAr: 'المطالبة: passport_fee — الحالة NEEDS_REVIEW غير صالحة',
                claimKey: 'passport_fee',
                claimStatus: 'NEEDS_REVIEW',
                publicationPermission: 'INTERNAL_ONLY',
              },
            ],
          },
          publicEligibility: {
            status: 'BLOCKED',
            labelAr: 'محظور',
            issues: [
              {
                code: 'CONTENT_CLASS_QA_TEST',
                severity: 'blocker',
                messageAr: 'QA_TEST مخصص للاختبار ولا يظهر للعامة أبداً.',
              },
            ],
            contentClassNoteAr: 'مخصص للاختبار ولا يظهر للعامة.',
            publicContentMode: 'production',
            storedClaimTrustOk: false,
            liveClaimTrustOk: false,
          },
          actionItems: [
            {
              code: 'CLAIM_NOT_AUTHORITATIVE',
              severity: 'blocker',
              messageAr: 'المطالبة: passport_fee — الحالة NEEDS_REVIEW غير صالحة',
              claimKey: 'passport_fee',
              claimStatus: 'NEEDS_REVIEW',
              publicationPermission: 'INTERNAL_ONLY',
            },
            {
              code: 'CONTENT_CLASS_QA_TEST',
              severity: 'blocker',
              messageAr: 'QA_TEST مخصص للاختبار ولا يظهر للعامة أبداً.',
            },
          ],
          claimDetails: [
            {
              claimKey: 'passport_fee',
              status: 'NEEDS_REVIEW',
              publicationPermission: 'INTERNAL_ONLY',
              level: 'BLOCKED',
              reasons: ['الحالة NEEDS_REVIEW غير صالحة للاعتماد العام'],
              outcomeAr: 'غير مؤهلة للاستخدام العام',
            },
          ],
        })}
      />,
    )
    expect(screen.getAllByText('محظور').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/passport_fee/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/QA_TEST مخصص للاختبار/)).toBeInTheDocument()
    expect(screen.queryByText(/\bid\b:\s*\d+/i)).not.toBeInTheDocument()
  })

  it('UNKNOWN state', () => {
    render(
      <TransactionReadinessView
        readiness={readiness({
          workflow: {
            status: 'UNKNOWN',
            labelAr: 'غير مؤكد',
            issues: [
              {
                code: 'EVALUATION_FAILED',
                severity: 'blocker',
                messageAr: 'تعذّر إكمال فحص الجاهزية بثقة — راجع الروابط والادعاءات يدوياً.',
              },
            ],
          },
          publicEligibility: {
            status: 'UNKNOWN',
            labelAr: 'غير مؤكد',
            issues: [
              {
                code: 'EVALUATION_FAILED',
                severity: 'blocker',
                messageAr: 'تعذّر إكمال فحص الجاهزية بثقة — راجع الروابط والادعاءات يدوياً.',
              },
            ],
            contentClassNoteAr: 'تصنيف محتوى غير معروف أو مفقود — لا يُفترض الظهور للعامة.',
            publicContentMode: 'production',
            storedClaimTrustOk: null,
            liveClaimTrustOk: null,
          },
          actionItems: [
            {
              code: 'EVALUATION_FAILED',
              severity: 'blocker',
              messageAr: 'تعذّر إكمال فحص الجاهزية بثقة — راجع الروابط والادعاءات يدوياً.',
            },
          ],
        })}
      />,
    )
    expect(screen.getAllByText('غير مؤكد').length).toBeGreaterThanOrEqual(1)
  })

  it('stale claimTrustOk discrepancy banner', () => {
    render(
      <TransactionReadinessView
        readiness={readiness({
          publicEligibility: {
            status: 'BLOCKED',
            labelAr: 'محظور',
            issues: [],
            contentClassNoteAr: 'تصنيف إنتاجي، وليس دليلاً على صحة المعلومات.',
            publicContentMode: 'production',
            storedClaimTrustOk: true,
            liveClaimTrustOk: false,
          },
        })}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/claimTrustOk المخزَّن/)
  })

  it('refresh + claim details expand are accessible', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    render(
      <TransactionReadinessView
        readiness={readiness({
          claimDetails: [
            {
              claimKey: 'passport_fee',
              status: 'VERIFIED',
              publicationPermission: 'PUBLIC',
              level: 'AUTHORITATIVE',
              reasons: [],
              outcomeAr: 'مؤهلة للاستخدام العام الموثوق',
            },
          ],
        })}
        onRefresh={onRefresh}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'تحديث فحص الجاهزية' }))
    expect(onRefresh).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'تفاصيل الادعاءات المرتبطة' }))
    expect(screen.getByText(/مؤهلة للاستخدام العام الموثوق/)).toBeInTheDocument()
  })
})

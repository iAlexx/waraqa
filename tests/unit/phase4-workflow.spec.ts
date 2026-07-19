import { describe, expect, it } from 'vitest'

import { hashCriticalContent } from '@/lib/workflow/content-fingerprint'
import {
  calculateReviewDueAt,
  computeVerificationHealth,
} from '@/lib/workflow/review-schedule'
import { validateSourceEvidence } from '@/lib/workflow/source-evidence'
import { signPreviewToken, verifyPreviewToken } from '@/lib/workflow/preview-token'
import { sanitizeAuditSummary, sanitizeAuditMetadata } from '@/lib/workflow/audit'
import { assertTransition, TRANSITION_MATRIX, WorkflowError } from '@/lib/workflow/types'
import { maybeInvalidateApproval } from '@/lib/workflow/transaction-workflow'

const baseDoc = (): Record<string, unknown> => ({
  title: { ar: 'عنوان', en: 'Title' },
  slug: 'test-tx',
  summary: { ar: 'ملخص', en: 'Summary' },
  category: 1,
  agency: 2,
  serviceCenters: [3],
  audiences: ['citizen'],
  eligibility: { ar: 'أهلية' },
  aliases: [{ value: { ar: 'بديل' } }],
  requiredDocuments: [
    {
      document: 10,
      requirementType: 'required',
      quantity: 1,
      originalRequired: false,
      copiesRequired: 0,
      certificationRequired: false,
    },
  ],
  steps: [{ title: { ar: 'خطوة' }, description: { ar: 'وصف' } }],
  fees: [{ label: { ar: 'رسم' }, amount: 100, currency: 'SYP' }],
  estimatedDuration: { minimum: 1, maximum: 2, unit: 'days' },
  outcome: { ar: 'نتيجة' },
  prerequisiteProcedures: [],
  sources: [
    {
      source: 5,
      primary: true,
      coveredSections: [
        'summary',
        'eligibility',
        'required_documents',
        'steps',
        'fees',
        'duration',
        'service_centers',
        'outcome',
      ],
    },
  ],
  active: true,
  markedOutdated: false,
  internalNotes: 'سري',
})

describe('workflow transition matrix', () => {
  it('allows draft → submitForReview → in_review', () => {
    expect(assertTransition('draft', 'submitForReview')).toBe('in_review')
  })

  it('rejects draft → publish', () => {
    expect(() => assertTransition('draft', 'publish')).toThrow(WorkflowError)
  })

  it('rejects in_review → publish', () => {
    expect(() => assertTransition('in_review', 'publish')).toThrow(WorkflowError)
  })

  it('allows approved → publish', () => {
    expect(assertTransition('approved', 'publish')).toBe('published')
  })

  it('allows published → unpublish → approved', () => {
    expect(assertTransition('published', 'unpublish')).toBe('approved')
  })

  it('archive from draft and restore', () => {
    expect(assertTransition('draft', 'archive')).toBe('archived')
    expect(assertTransition('archived', 'restoreArchived')).toBe('draft')
  })

  it('matrix covers all states', () => {
    expect(Object.keys(TRANSITION_MATRIX).sort()).toEqual(
      ['approved', 'archived', 'changes_requested', 'draft', 'in_review', 'published'].sort(),
    )
  })
})

describe('content fingerprint', () => {
  it('is deterministic', () => {
    const a = hashCriticalContent(baseDoc())
    const b = hashCriticalContent(baseDoc())
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('changes on critical edit', () => {
    const a = hashCriticalContent(baseDoc())
    const edited = baseDoc()
    edited.title = { ar: 'عنوان جديد', en: 'Title' }
    expect(hashCriticalContent(edited)).not.toBe(a)
  })

  it('does not change on internalNotes', () => {
    const a = hashCriticalContent(baseDoc())
    const edited = baseDoc()
    edited.internalNotes = 'ملاحظة أخرى'
    expect(hashCriticalContent(edited)).toBe(a)
  })
})

describe('approval invalidation helper', () => {
  it('invalidates when approved and critical changes', () => {
    const original = { ...baseDoc(), workflowState: 'approved', approvedContentHash: 'x' }
    const next = { title: { ar: 'تغيير', en: 'x' } }
    const result = maybeInvalidateApproval({ originalDoc: original, nextData: next })
    expect(result.invalidate).toBe(true)
    expect(result.patch.workflowState).toBe('draft')
  })

  it('does not invalidate on internalNotes only', () => {
    const original = {
      ...baseDoc(),
      workflowState: 'approved',
      approvedContentHash: hashCriticalContent(baseDoc()),
    }
    const result = maybeInvalidateApproval({
      originalDoc: original,
      nextData: { internalNotes: 'x' },
    })
    expect(result.invalidate).toBe(false)
  })
})

describe('source evidence', () => {
  it('requires primary and verified sources with coverage', () => {
    const map = new Map([
      [
        '5',
        {
          id: 5,
          active: true,
          verificationStatus: 'verified',
          officialUrl: 'https://example.test/official',
        },
      ],
    ])
    const errors = validateSourceEvidence(baseDoc() as never, map)
    expect(errors).toEqual([])
  })

  it('rejects unverified source', () => {
    const map = new Map([
      [
        '5',
        {
          id: 5,
          active: true,
          verificationStatus: 'needs_review',
          officialUrl: 'https://example.test/official',
        },
      ],
    ])
    const errors = validateSourceEvidence(baseDoc() as never, map)
    expect(errors.some((e) => e.includes('غير موثّق'))).toBe(true)
  })

  it('rejects duplicate sources', () => {
    const doc = baseDoc()
    doc.sources = [
      { source: 5, primary: true, coveredSections: ['steps'] },
      { source: 5, primary: false, coveredSections: ['fees'] },
    ]
    const map = new Map([
      ['5', { id: 5, active: true, verificationStatus: 'verified', officialUrl: 'https://x.test' }],
    ])
    const errors = validateSourceEvidence(doc as never, map)
    expect(errors.some((e) => e.includes('تكرار'))).toBe(true)
  })
})

describe('review schedule', () => {
  it('calculates reviewDueAt from policy days', () => {
    const due = calculateReviewDueAt({
      lastReviewedAt: '2026-01-01T00:00:00.000Z',
      verificationPolicyDays: 90,
    })
    expect(due?.toISOString().startsWith('2026-04-01')).toBe(true)
  })

  it('computes verification health', () => {
    expect(computeVerificationHealth({ markedOutdated: true })).toBe('outdated')
    expect(computeVerificationHealth({})).toBe('unverified')
    expect(
      computeVerificationHealth({
        lastReviewedAt: '2026-01-01T00:00:00.000Z',
        reviewDueAt: '2099-01-01T00:00:00.000Z',
      }),
    ).toBe('current')
    expect(
      computeVerificationHealth({
        lastReviewedAt: '2020-01-01T00:00:00.000Z',
        reviewDueAt: '2020-02-01T00:00:00.000Z',
        now: new Date('2026-01-01'),
      }),
    ).toBe('review_due')
  })
})

describe('preview token', () => {
  const secret = 'x'.repeat(32)

  it('signs and verifies', () => {
    const token = signPreviewToken(secret, { id: '1', uid: '9', ttlSeconds: 60 })
    const parsed = verifyPreviewToken(secret, token)
    expect(parsed?.id).toBe('1')
    expect(parsed?.uid).toBe('9')
  })

  it('rejects expired', () => {
    const token = signPreviewToken(secret, { id: '1', uid: '9', ttlSeconds: 1 })
    const parsed = verifyPreviewToken(secret, token, {
      nowSeconds: Math.floor(Date.now() / 1000) + 120,
    })
    expect(parsed).toBeNull()
  })
})

describe('audit sanitization', () => {
  it('caps summary and filters metadata', () => {
    expect(sanitizeAuditSummary('  a  b  ').length).toBeLessThanOrEqual(500)
    expect(sanitizeAuditMetadata({ password: 'x', fromState: 'draft' })).toEqual({
      fromState: 'draft',
    })
  })
})

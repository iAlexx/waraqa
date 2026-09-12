import { describe, expect, it } from 'vitest'

import { evaluateClaimTrust } from '@/lib/claims/claim-trust'
import { validateClaimBindingsForPublication } from '@/lib/claims/validate-claim-publication'
import { setPublicContentModeForTests } from '@/lib/content-class/public-content-policy'
import { buildTransactionAdminReadiness } from '@/lib/admin/transaction-readiness'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'
import { afterEach } from 'vitest'

function source(partial: Partial<SourceDocLike> & { id: number }): SourceDocLike {
  return {
    active: true,
    verificationStatus: 'verified',
    officialUrl: 'https://example.test/official',
    contentClass: 'PRODUCTION',
    ...partial,
  }
}

function authoritativeClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: 'passport_fee',
    active: true,
    _status: 'published' as const,
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    contentClass: 'PRODUCTION',
    reviewedBy: 9,
    verifiedAt: '2026-07-01T00:00:00.000Z',
    evidence: [{ source: 10, relationType: 'SUPPORTS' as const }],
    ...overrides,
  }
}

function baseDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: { ar: 'معاملة تجريبية' },
    summary: { ar: 'ملخص' },
    category: 1,
    agency: 1,
    steps: [{ title: { ar: 'خطوة' }, description: { ar: 'وصف' } }],
    sources: [{ source: 10, primary: true, coveredSections: ['summary', 'steps'] }],
    claimBindings: [{ claim: 1, required: true }],
    lastReviewedAt: '2026-07-01',
    _status: 'published',
    active: true,
    markedOutdated: false,
    workflowState: 'published',
    contentClass: 'PRODUCTION',
    claimTrustOk: true,
    ...overrides,
  }
}

afterEach(() => {
  setPublicContentModeForTests(null)
})

describe('P11-B transaction admin readiness', () => {
  const sources = new Map<string, SourceDocLike>([['10', source({ id: 10 })]])
  const claims = new Map([['1', authoritativeClaim()]])

  function gateFor(
    claimOverrides: Record<string, unknown> = {},
    sourceMap = sources,
    bindings = [{ claim: 1, required: true }],
    txClass: unknown = 'PRODUCTION',
  ) {
    const claim = authoritativeClaim(claimOverrides)
    const map = new Map([['1', claim]])
    return validateClaimBindingsForPublication(bindings, map, sourceMap, {
      transactionContentClass: txClass,
    })
  }

  it('A: authoritative PRODUCTION → workflow READY + public READY', () => {
    setPublicContentModeForTests('production')
    const claimGate = gateFor()
    expect(claimGate.ok).toBe(true)
    const r = buildTransactionAdminReadiness({
      doc: baseDoc(),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.status).toBe('READY')
    expect(r.publicEligibility.status).toBe('READY')
    expect(r.publicEligibility.contentClassNoteAr).toMatch(/تصنيف إنتاجي/)
    expect(r.basedOn).toBe('last_saved')
  })

  it('B: QA_TEST → public BLOCKED regardless of trust', () => {
    const claimGate = validateClaimBindingsForPublication(
      [{ claim: 1, required: true }],
      new Map([['1', authoritativeClaim({ contentClass: 'QA_TEST' })]]),
      new Map([['10', source({ id: 10, contentClass: 'QA_TEST' })]]),
      { transactionContentClass: 'QA_TEST' },
    )
    expect(claimGate.ok).toBe(true)
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ contentClass: 'QA_TEST', claimTrustOk: true }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.status).toBe('READY')
    expect(r.publicEligibility.status).toBe('BLOCKED')
    expect(r.publicEligibility.issues.some((i) => i.code === 'CONTENT_CLASS_QA_TEST')).toBe(true)
    expect(r.publicEligibility.contentClassNoteAr).toMatch(/لا يظهر للعامة/)
  })

  it('C: DEMO in production mode → public BLOCKED; demo mode → WARNING when otherwise ok', () => {
    const claimGate = validateClaimBindingsForPublication(
      [{ claim: 1, required: true }],
      new Map([['1', authoritativeClaim({ contentClass: 'DEMO' })]]),
      new Map([['10', source({ id: 10, contentClass: 'DEMO' })]]),
      { transactionContentClass: 'DEMO' },
    )
    const blocked = buildTransactionAdminReadiness({
      doc: baseDoc({ contentClass: 'DEMO' }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(blocked.publicEligibility.status).toBe('BLOCKED')
    expect(blocked.publicEligibility.issues.some((i) => i.code === 'CONTENT_CLASS_DEMO_MODE')).toBe(
      true,
    )

    const warned = buildTransactionAdminReadiness({
      doc: baseDoc({ contentClass: 'DEMO' }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'demo',
    })
    expect(warned.publicEligibility.status).toBe('WARNING')
    expect(warned.publicEligibility.contentClassNoteAr).toMatch(/تجريبي/)
  })

  it('D: claimTrustOk false → public BLOCKED', () => {
    const claimGate = gateFor()
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ claimTrustOk: false }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.publicEligibility.status).toBe('BLOCKED')
    expect(r.publicEligibility.issues.some((i) => i.code === 'STORED_TRUST_FALSE')).toBe(true)
  })

  it('E: claimTrustOk true + live Claim invalid → STORED_TRUST_STALE BLOCKED', () => {
    const claimGate = gateFor({ status: 'NEEDS_REVIEW' })
    expect(claimGate.ok).toBe(false)
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ claimTrustOk: true }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.status).toBe('BLOCKED')
    expect(r.publicEligibility.status).toBe('BLOCKED')
    expect(r.publicEligibility.issues.some((i) => i.code === 'STORED_TRUST_STALE')).toBe(true)
    expect(r.publicEligibility.storedClaimTrustOk).toBe(true)
    expect(r.publicEligibility.liveClaimTrustOk).toBe(false)
  })

  it('F: missing required Claim → BLOCKED', () => {
    const claimGate = validateClaimBindingsForPublication([], claims, sources, {
      transactionContentClass: 'PRODUCTION',
    })
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ claimBindings: [], claimTrustOk: false }),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.status).toBe('BLOCKED')
    expect(r.workflow.issues.some((i) => i.code === 'CLAIM_MISSING')).toBe(true)
  })

  it('G: required Claim DRAFT / NEEDS_REVIEW → BLOCKED', () => {
    for (const status of ['DRAFT', 'NEEDS_REVIEW'] as const) {
      const claimGate = gateFor({ status })
      const r = buildTransactionAdminReadiness({
        doc: baseDoc({ claimTrustOk: false }),
        procedureErrors: [],
        evidenceErrors: [],
        claimGate,
        publicContentMode: 'production',
      })
      expect(r.workflow.status).toBe('BLOCKED')
      expect(r.claimDetails[0]?.claimKey).toBe('passport_fee')
      expect(r.actionItems.some((i) => i.messageAr.includes('passport_fee'))).toBe(true)
    }
  })

  it('H: UNKNOWN / CONFLICTED / NEEDS_OFFICIAL_CONFIRMATION → CLAIM_WARNING_ONLY blocker', () => {
    for (const status of ['UNKNOWN', 'CONFLICTED', 'NEEDS_OFFICIAL_CONFIRMATION'] as const) {
      const claimGate = gateFor({
        status,
        publicationPermission: 'PUBLIC_WITH_WARNING',
        reviewedBy: null,
        verifiedAt: null,
        evidence: [],
      })
      expect(claimGate.evaluations[0]?.level).toBe('WARNING_ONLY')
      const r = buildTransactionAdminReadiness({
        doc: baseDoc({ claimTrustOk: false }),
        procedureErrors: [],
        evidenceErrors: [],
        claimGate,
        publicContentMode: 'production',
      })
      expect(r.workflow.issues.some((i) => i.code === 'CLAIM_WARNING_ONLY')).toBe(true)
      expect(r.claimDetails[0]?.outcomeAr).toMatch(/تحذير/)
    }
  })

  it('I: VERIFIED + PUBLIC + trusted evidence → AUTHORITATIVE detail', () => {
    const claimGate = gateFor()
    expect(claimGate.evaluations[0]?.level).toBe('AUTHORITATIVE')
    const r = buildTransactionAdminReadiness({
      doc: baseDoc(),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.claimDetails[0]?.outcomeAr).toMatch(/مؤهلة/)
  })

  it('J/K: untrusted / inactive source → SOURCE_NOT_TRUSTED', () => {
    const bad = new Map([['10', source({ id: 10, verificationStatus: 'needs_review' })]])
    const claimGate = gateFor({}, bad)
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ claimTrustOk: false }),
      procedureErrors: [],
      evidenceErrors: ['المصدر 10 غير موثّق (الحالة: needs_review).'],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.issues.some((i) => i.code === 'SOURCE_NOT_TRUSTED')).toBe(true)

    const inactive = new Map([['10', source({ id: 10, active: false })]])
    expect(evaluateClaimTrust(authoritativeClaim(), inactive).level).toBe('BLOCKED')
  })

  it('L: malformed / evaluation failed → UNKNOWN never ready', () => {
    const r = buildTransactionAdminReadiness({
      doc: baseDoc(),
      procedureErrors: [],
      evidenceErrors: [],
      claimGate: { ok: false, errors: [], evaluations: [] },
      evaluationFailed: true,
      publicContentMode: 'production',
    })
    expect(r.workflow.status).toBe('UNKNOWN')
    expect(r.publicEligibility.status).toBe('UNKNOWN')
    expect(r.workflow.issues.some((i) => i.code === 'EVALUATION_FAILED')).toBe(true)
  })

  it('surfaces procedure + coverage + transition notes', () => {
    const claimGate = gateFor()
    const r = buildTransactionAdminReadiness({
      doc: baseDoc({ workflowState: 'draft', _status: 'draft', claimTrustOk: false }),
      procedureErrors: ['لنشر المعاملة يجب تحديد تاريخ آخر مراجعة.'],
      evidenceErrors: ['القسم «الملخص» يحتاج تغطية مصدرية (summary).'],
      claimGate,
      publicContentMode: 'production',
    })
    expect(r.workflow.issues.some((i) => i.code === 'PROCEDURE_INCOMPLETE')).toBe(true)
    expect(r.workflow.issues.some((i) => i.code === 'SOURCE_COVERAGE')).toBe(true)
    expect(r.publicEligibility.issues.some((i) => i.code === 'NOT_CMS_PUBLISHED')).toBe(true)
  })
})

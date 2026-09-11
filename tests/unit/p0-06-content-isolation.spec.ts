import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyContentClassGovernance } from '@/lib/content-class/content-class-governance'
import {
  claimClassSupportsTransaction,
  getPubliclyAllowedContentClasses,
  isContentClassPubliclyAllowed,
  resolvePublicContentMode,
  setPublicContentModeForTests,
  sourceClassSupportsClaim,
} from '@/lib/content-class/public-content-policy'
import { DEMO_PUBLIC_LABEL_AR, isContentClass } from '@/lib/content-class/types'
import { evaluateClaimTrust } from '@/lib/claims/claim-trust'
import { isPubliclyEligibleTransaction } from '@/lib/public/featured-transactions'
import type { SourceDocLike } from '@/lib/workflow/source-evidence'

afterEach(() => {
  setPublicContentModeForTests(null)
  vi.unstubAllEnvs()
})

describe('P0-06 public content mode policy', () => {
  it('defaults to production; invalid fails closed to production', () => {
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', '')
    expect(resolvePublicContentMode(undefined)).toBe('production')
    expect(resolvePublicContentMode('')).toBe('production')
    expect(resolvePublicContentMode('nope')).toBe('production')
    expect(resolvePublicContentMode('demo')).toBe('demo')
  })

  it('setPublicContentModeForTests is honored only under Vitest/test runtime', () => {
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', 'production')
    setPublicContentModeForTests('demo')
    expect(resolvePublicContentMode('production')).toBe('demo')
    setPublicContentModeForTests(null)
    expect(resolvePublicContentMode('production')).toBe('production')
  })

  it('setPublicContentModeForTests cannot override outside test runtime', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VITEST', '')
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', '')
    setPublicContentModeForTests('demo')
    expect(resolvePublicContentMode(undefined)).toBe('production')
  })

  it('B/C/E: production blocks DEMO and QA_TEST; demo allows DEMO not QA_TEST', () => {
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', 'production')
    setPublicContentModeForTests('production')
    expect(getPubliclyAllowedContentClasses()).toEqual(['PRODUCTION'])
    expect(isContentClassPubliclyAllowed('PRODUCTION')).toBe(true)
    expect(isContentClassPubliclyAllowed('DEMO')).toBe(false)
    expect(isContentClassPubliclyAllowed('QA_TEST')).toBe(false)

    setPublicContentModeForTests('demo')
    expect(isContentClassPubliclyAllowed('PRODUCTION')).toBe(true)
    expect(isContentClassPubliclyAllowed('DEMO')).toBe(true)
    expect(isContentClassPubliclyAllowed('QA_TEST')).toBe(false)
  })

  it('N: invalid content class fails closed', () => {
    expect(isContentClass('nope')).toBe(false)
    expect(isContentClassPubliclyAllowed('nope')).toBe(false)
    expect(isPubliclyEligibleTransaction({
      _status: 'published',
      active: true,
      markedOutdated: false,
      workflowState: 'published',
      claimTrustOk: true,
      contentClass: 'nope',
    })).toBe(false)
  })
})

describe('P0-06 dependency class rules', () => {
  const prodSource = (id = 10): SourceDocLike => ({
    id,
    active: true,
    verificationStatus: 'verified',
    officialUrl: 'https://example.test/x',
    contentClass: 'PRODUCTION',
  })

  it('F/H: PRODUCTION tx cannot rely on QA_TEST or DEMO claims', () => {
    const sources = new Map([['10', prodSource()]])
    expect(
      evaluateClaimTrust(
        {
          id: 1,
          key: 'c1',
          active: true,
          _status: 'published',
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          contentClass: 'QA_TEST',
          reviewedBy: 1,
          verifiedAt: '2026-01-01T00:00:00.000Z',
          evidence: [{ source: 10, relationType: 'SUPPORTS' }],
        },
        sources,
        { transactionContentClass: 'PRODUCTION' },
      ).level,
    ).toBe('BLOCKED')

    expect(
      evaluateClaimTrust(
        {
          id: 1,
          key: 'c2',
          active: true,
          _status: 'published',
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          contentClass: 'DEMO',
          reviewedBy: 1,
          verifiedAt: '2026-01-01T00:00:00.000Z',
          evidence: [{ source: 10, relationType: 'SUPPORTS' }],
        },
        new Map([['10', { ...prodSource(), contentClass: 'DEMO' }]]),
        { transactionContentClass: 'PRODUCTION' },
      ).level,
    ).toBe('BLOCKED')
  })

  it('G: PRODUCTION claim cannot rely on QA_TEST source', () => {
    expect(
      evaluateClaimTrust(
        {
          id: 1,
          key: 'c3',
          active: true,
          _status: 'published',
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          contentClass: 'PRODUCTION',
          reviewedBy: 1,
          verifiedAt: '2026-01-01T00:00:00.000Z',
          evidence: [{ source: 10, relationType: 'SUPPORTS' }],
        },
        new Map([['10', { ...prodSource(), contentClass: 'QA_TEST' }]]),
        { transactionContentClass: 'PRODUCTION' },
      ).level,
    ).toBe('BLOCKED')
  })

  it('A: PRODUCTION→PRODUCTION→PRODUCTION can be AUTHORITATIVE', () => {
    expect(
      evaluateClaimTrust(
        {
          id: 1,
          key: 'c4',
          active: true,
          _status: 'published',
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          contentClass: 'PRODUCTION',
          reviewedBy: 1,
          verifiedAt: '2026-01-01T00:00:00.000Z',
          evidence: [{ source: 10, relationType: 'SUPPORTS' }],
        },
        new Map([['10', prodSource()]]),
        { transactionContentClass: 'PRODUCTION' },
      ).level,
    ).toBe('AUTHORITATIVE')
  })

  it('claim/source support helpers', () => {
    expect(claimClassSupportsTransaction('PRODUCTION', 'PRODUCTION')).toBe(true)
    expect(claimClassSupportsTransaction('PRODUCTION', 'DEMO')).toBe(false)
    expect(claimClassSupportsTransaction('DEMO', 'DEMO')).toBe(true)
    expect(sourceClassSupportsClaim('PRODUCTION', 'QA_TEST')).toBe(false)
    expect(sourceClassSupportsClaim('DEMO', 'PRODUCTION')).toBe(true)
  })
})

describe('P0-06 governance', () => {
  it('K: researcher cannot promote to PRODUCTION', () => {
    const r = applyContentClassGovernance({
      data: { contentClass: 'PRODUCTION' },
      originalDoc: { contentClass: 'QA_TEST' },
      user: { id: 1, role: 'researcher', isActive: true },
      operation: 'update',
    })
    expect(r.ok).toBe(false)
  })

  it('researcher may update non-class fields on PRODUCTION content', () => {
    const r = applyContentClassGovernance({
      data: { title: 'تحديث مسودة' },
      originalDoc: { contentClass: 'PRODUCTION' },
      user: { id: 1, role: 'researcher', isActive: true },
      operation: 'update',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.contentClass).toBe('PRODUCTION')
  })

  it('researcher cannot demote PRODUCTION classification', () => {
    const r = applyContentClassGovernance({
      data: { contentClass: 'QA_TEST' },
      originalDoc: { contentClass: 'PRODUCTION' },
      user: { id: 1, role: 'researcher', isActive: true },
      operation: 'update',
    })
    expect(r.ok).toBe(false)
  })

  it('L: active reviewer can promote to PRODUCTION', () => {
    const r = applyContentClassGovernance({
      data: { contentClass: 'PRODUCTION' },
      originalDoc: { contentClass: 'QA_TEST' },
      user: { id: 2, role: 'reviewer', isActive: true },
      operation: 'update',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.contentClass).toBe('PRODUCTION')
  })

  it('M: inactive reviewer cannot promote', () => {
    const r = applyContentClassGovernance({
      data: { contentClass: 'PRODUCTION' },
      originalDoc: { contentClass: 'QA_TEST' },
      user: { id: 3, role: 'reviewer', isActive: false },
      operation: 'update',
    })
    expect(r.ok).toBe(false)
  })

  it('P: create defaults to QA_TEST', () => {
    const r = applyContentClassGovernance({
      data: {},
      user: { id: 1, role: 'researcher', isActive: true },
      operation: 'create',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.contentClass).toBe('QA_TEST')
  })
})

describe('P0-06 demo label constant', () => {
  it('Q/R: demo label wording is fixed Arabic string', () => {
    expect(DEMO_PUBLIC_LABEL_AR).toContain('ليست معلومات رسمية')
  })

  it('eligibility uses contentClass not slug heuristics', () => {
    setPublicContentModeForTests('production')
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'published',
        claimTrustOk: true,
        contentClass: 'PRODUCTION',
        title: 'qa-test-demo-fixture',
        slug: 'qa-p6-r1-x',
      }),
    ).toBe(true)
    expect(
      isPubliclyEligibleTransaction({
        _status: 'published',
        active: true,
        markedOutdated: false,
        workflowState: 'published',
        claimTrustOk: true,
        contentClass: 'QA_TEST',
        title: 'Official looking',
        slug: 'civil-extract',
      }),
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { normalizeSlug, isValidSlug } from '@/lib/slug'
import { isHttpUrl } from '@/lib/urls'
import { validateProcedureData } from '@/lib/procedure-validation'
import { getUserRole, type UserLike } from '@/access/roles'
import {
  canPublishContent,
  publicPublishedRead,
  publicTransactionRead,
  publicTransactionWhere,
} from '@/access'

describe('normalizeSlug', () => {
  it('lowercases, hyphenates, and collapses repeats', () => {
    expect(normalizeSlug('  Hello__World  ')).toBe('hello-world')
    expect(normalizeSlug('معاملة---تجريبية')).toBe('معاملة-تجريبية')
  })

  it('does not append random suffixes', () => {
    expect(normalizeSlug('test-slug')).toBe('test-slug')
  })

  it('rejects invalid shapes via isValidSlug', () => {
    expect(isValidSlug('ok-slug')).toBe(true)
    expect(isValidSlug('-bad')).toBe(false)
    expect(isValidSlug('Bad')).toBe(false)
  })
})

describe('isHttpUrl', () => {
  it('allows only http/https', () => {
    expect(isHttpUrl('https://example.com/path')).toBe(true)
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('ftp://example.com')).toBe(false)
    expect(isHttpUrl('not-a-url')).toBe(false)
  })
})

describe('validateProcedureData', () => {
  it('rejects duplicate documents and sources', () => {
    const errors = validateProcedureData({
      requiredDocuments: [
        { document: 1, requirementType: 'required' },
        { document: 1, requirementType: 'required' },
      ],
      sources: [{ source: 2 }, { source: 2 }],
      fees: [],
    })
    expect(errors.some((e) => e.includes('الوثيقة'))).toBe(true)
    expect(errors.some((e) => e.includes('المصدر'))).toBe(true)
  })

  it('requires condition for conditional documents', () => {
    const errors = validateProcedureData({
      requiredDocuments: [{ document: 1, requirementType: 'conditional', condition: '' }],
    })
    expect(errors.some((e) => e.includes('الشرط'))).toBe(true)
  })

  it('requires amount or amountText on fees', () => {
    const errors = validateProcedureData({
      fees: [{ label: 'رسم' }],
    })
    expect(errors.some((e) => e.includes('رسم'))).toBe(true)
  })

  it('validates duration max >= min', () => {
    const errors = validateProcedureData({
      estimatedDuration: { minimum: 5, maximum: 2 },
    })
    expect(errors.some((e) => e.includes('الأقصى'))).toBe(true)
  })

  it('enforces publishing requirements', () => {
    const errors = validateProcedureData(
      {
        title: { ar: '' },
        summary: { ar: '' },
        steps: [],
        sources: [],
      },
      { publishing: true },
    )
    expect(errors.length).toBeGreaterThan(3)
  })
})

describe('roles', () => {
  it('reads known roles', () => {
    expect(getUserRole({ role: 'admin' })).toBe('admin')
    expect(getUserRole({ role: 'researcher' })).toBe('researcher')
    expect(getUserRole({ role: 'nope' as never })).toBe(null)
  })
})

describe('access helpers', () => {
  it('canPublishContent allows admin and reviewer only', () => {
    expect(
      canPublishContent({
        req: { user: { role: 'admin', isActive: true } as UserLike },
      } as never),
    ).toBe(true)
    expect(
      canPublishContent({
        req: { user: { role: 'researcher', isActive: true } as UserLike },
      } as never),
    ).toBe(false)
  })

  it('publicPublishedRead constrains anonymous users', () => {
    const result = publicPublishedRead({
      req: { user: null },
    } as never)
    expect(result).toEqual({
      and: [{ _status: { equals: 'published' } }, { active: { equals: true } }],
    })
  })

  it('publicTransactionRead excludes archived and outdated at the Where layer', () => {
    const result = publicTransactionRead({
      req: { user: null },
    } as never)
    expect(result).toEqual(publicTransactionWhere)
    expect(publicTransactionWhere).toEqual({
      and: [
        { _status: { equals: 'published' } },
        { active: { equals: true } },
        { markedOutdated: { not_equals: true } },
        { workflowState: { not_equals: 'archived' } },
      ],
    })
  })

  it('publicTransactionRead allows full read for editorial roles', () => {
    expect(
      publicTransactionRead({
        req: { user: { role: 'researcher', isActive: true } as never },
      } as never),
    ).toBe(true)
  })
})

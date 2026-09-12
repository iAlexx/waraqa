import { describe, expect, it } from 'vitest'

import { hashReportIdentity } from '@/lib/reports/identity-hash'
import {
  looksLikeUnsafeMarkup,
  sanitizeMessage,
  sanitizeOptionalSourceUrl,
} from '@/lib/reports/sanitize'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
import { REPORT_STATUS_TRANSITIONS } from '@/lib/reports/types'

describe('Phase 10 report validation', () => {
  const base = {
    transactionSlug: 'ikhraj-qayd-demo',
    section: 'fees' as const,
    message: 'الرسوم المذكورة لم تعد مطابقة لما طلبه المركز اليوم.',
    consent: true as const,
  }

  it('accepts a minimal valid payload', () => {
    const result = validatePublicReportSubmit(base)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.honeypotTriggered).toBe(false)
    expect(result.data.message.length).toBeGreaterThan(10)
  })

  it('rejects missing consent', () => {
    const result = validatePublicReportSubmit({ ...base, consent: false })
    expect(result.ok).toBe(false)
  })

  it('rejects HTML-like message content', () => {
    const result = validatePublicReportSubmit({
      ...base,
      message: '<script>alert(1)</script> الرسوم تغيّرت بشكل واضح جداً',
    })
    expect(result.ok).toBe(false)
  })

  it('treats filled honeypot as discard path', () => {
    const result = validatePublicReportSubmit({ ...base, website: 'http://spam.test' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.honeypotTriggered).toBe(true)
  })

  it('rejects unsafe source protocols', () => {
    const result = validatePublicReportSubmit({
      ...base,
      sourceUrl: 'javascript:alert(1)',
    })
    expect(result.ok).toBe(false)
  })

  it('accepts optional contact email', () => {
    const result = validatePublicReportSubmit({
      ...base,
      contactEmail: 'citizen@example.test',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.contactEmail).toBe('citizen@example.test')
  })
})

describe('Phase 10 sanitize helpers', () => {
  it('strips tags from plain text sanitizer', () => {
    expect(sanitizeMessage('قبل <b>بعد</b> نهاية النص الطويل كفاية')).not.toMatch(/</)
  })

  it('detects markup', () => {
    expect(looksLikeUnsafeMarkup('<img src=x onerror=alert(1)>')).toBe(true)
  })

  it('allows https URLs only', () => {
    expect(sanitizeOptionalSourceUrl('https://example.test/page')).toContain('https://')
    expect(sanitizeOptionalSourceUrl('ftp://example.test')).toBeNull()
  })
})

describe('Phase 10 identity hash', () => {
  it('does not embed raw IP in the hash output', () => {
    const hash = hashReportIdentity({
      secret: 'x'.repeat(32),
      ip: '203.0.113.50',
      userAgent: 'TestAgent/1.0',
    })
    expect(hash).not.toContain('203.0.113')
    expect(hash).toMatch(/^[a-f0-9]{48}$/)
  })

  it('differs across identities', () => {
    const a = hashReportIdentity({
      secret: 'x'.repeat(32),
      ip: '203.0.113.50',
      userAgent: 'A',
    })
    const b = hashReportIdentity({
      secret: 'x'.repeat(32),
      ip: '203.0.113.51',
      userAgent: 'A',
    })
    expect(a).not.toBe(b)
  })
})

describe('Phase 10 triage transitions', () => {
  it('allows open → in_review → resolved', () => {
    expect(REPORT_STATUS_TRANSITIONS.open).toContain('in_review')
    expect(REPORT_STATUS_TRANSITIONS.in_review).toContain('resolved')
  })

  it('does not allow resolved → rejected directly', () => {
    expect(REPORT_STATUS_TRANSITIONS.resolved).not.toContain('rejected')
  })
})

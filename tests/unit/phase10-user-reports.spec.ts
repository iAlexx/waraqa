import { describe, expect, it } from 'vitest'

import {
  hashReportIdentity,
  trustedClientIpFromHeaders,
} from '@/lib/reports/identity-hash'
import {
  contentLengthExceedsLimit,
  isJsonContentType,
  isMultipartContentType,
} from '@/lib/reports/request-guards'
import { sanitizeAuditMetadata } from '@/lib/workflow/audit'
import { isClosed } from '@/lib/reports/triage'
import {
  looksLikeUnsafeMarkup,
  sanitizeMessage,
  sanitizeOptionalSourceUrl,
} from '@/lib/reports/sanitize'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'
import { REPORT_LIMITS, REPORT_STATUS_TRANSITIONS } from '@/lib/reports/types'

const SECRET = 'x'.repeat(32)

describe('Phase 10 rate-limit identity (IP-only)', () => {
  it('A: same IP + different User-Agent => SAME primary hash', () => {
    const a = hashReportIdentity({ secret: SECRET, ip: '203.0.113.50' })
    const b = hashReportIdentity({ secret: SECRET, ip: '203.0.113.50' })
    expect(a).toBe(b)
    // UA is not an input — rotating UA cannot change the bucket.
    expect(a).toMatch(/^[a-f0-9]{48}$/)
  })

  it('B/C: different IPs remain independent; raw IP never in hash', () => {
    const a = hashReportIdentity({ secret: SECRET, ip: '203.0.113.50' })
    const b = hashReportIdentity({ secret: SECRET, ip: '203.0.113.51' })
    expect(a).not.toBe(b)
    expect(a).not.toContain('203.0.113')
    expect(b).not.toContain('203')
  })

  it('E: malformed/missing proxy identity fails safely', () => {
    expect(trustedClientIpFromHeaders(new Headers()).ok).toBe(false)
    expect(
      trustedClientIpFromHeaders(new Headers({ 'x-forwarded-for': 'not-an-ip' })).ok,
    ).toBe(false)
    const ok = trustedClientIpFromHeaders(
      new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }),
    )
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.ip).toBe('203.0.113.9')
  })

  it('throws when hashing empty IP', () => {
    expect(() => hashReportIdentity({ secret: SECRET, ip: '' })).toThrow()
  })
})

describe('Phase 10 request guards', () => {
  it('rejects multipart and non-JSON', () => {
    expect(isMultipartContentType('multipart/form-data; boundary=x')).toBe(true)
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
    expect(isJsonContentType('text/plain')).toBe(false)
  })

  it('detects oversized Content-Length before parse', () => {
    expect(contentLengthExceedsLimit(String(REPORT_LIMITS.maxRequestBytes + 1))).toBe(
      'too_large',
    )
    expect(contentLengthExceedsLimit('100')).toBe('ok')
    expect(contentLengthExceedsLimit(null)).toBe('missing')
  })
})

describe('Phase 10 report validation', () => {
  const base = {
    transactionSlug: 'ikhraj-qayd-demo',
    section: 'fees' as const,
    message: 'الرسوم المذكورة لم تعد مطابقة لما طلبه المركز اليوم.',
    encountered: 'طلبوا مبلغاً مختلفاً عند الشباك.',
    consent: true as const,
  }

  it('accepts a minimal valid payload with encountered', () => {
    const result = validatePublicReportSubmit(base)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.encountered.length).toBeGreaterThan(5)
    expect(result.data.serviceCenterId).toBeNull()
  })

  it('rejects missing encountered', () => {
    const result = validatePublicReportSubmit({ ...base, encountered: '' })
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
})

describe('Phase 10 sanitize + audit metadata', () => {
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

  it('keeps recoverable resolutionReason in audit metadata', () => {
    const meta = sanitizeAuditMetadata({
      fromState: 'in_review',
      toState: 'resolved',
      resolutionReason: 'تم التحقق من الرسوم مع المصدر الرسمي التجريبي.',
      contactEmail: 'leak@example.test',
    })
    expect(meta?.resolutionReason).toContain('الرسوم')
    expect(meta).not.toHaveProperty('contactEmail')
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

  it('identifies closed states', () => {
    expect(isClosed('resolved')).toBe(true)
    expect(isClosed('open')).toBe(false)
  })
})

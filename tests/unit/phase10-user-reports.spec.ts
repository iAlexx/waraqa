import { describe, expect, it } from 'vitest'

import {
  hashReportIdentity,
  trustedClientIpFromHeaders,
} from '@/lib/reports/identity-hash'
import {
  contentLengthExceedsLimit,
  isJsonContentType,
  isMultipartContentType,
  readRequestBodyLimited,
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

  it('byte-limits streamed bodies (missing Content-Length / chunked)', async () => {
    const max = 64
    const oversized = new Uint8Array(max + 8).fill(0x61)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversized.slice(0, 40))
        controller.enqueue(oversized.slice(40))
        controller.close()
      },
    })
    const req = new Request('http://localhost/api/public/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      // @ts-expect-error duplex required for streaming request body in undici
      duplex: 'half',
    })
    const result = await readRequestBodyLimited(req, max)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('too_large')

    const small = new Request('http://localhost/api/public/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
    })
    const ok = await readRequestBodyLimited(small, max)
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.text).toBe('{"ok":true}')
      expect(ok.byteLength).toBe(Buffer.byteLength('{"ok":true}', 'utf8'))
    }
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

  it('rejects overlong source URLs with a field error (no silent truncate)', () => {
    const long = `https://example.test/${'q'.repeat(REPORT_LIMITS.sourceUrlMax)}`
    const result = validatePublicReportSubmit({
      ...base,
      sourceUrl: long,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fields?.sourceUrl).toBeTruthy()
    expect(result.message).toMatch(/طويل/)
  })
})

describe('Phase 10 sanitize + audit metadata', () => {
  it('strips tags from plain text sanitizer', () => {
    expect(sanitizeMessage('قبل <b>بعد</b> نهاية النص الطويل كفاية')).not.toMatch(/</)
  })

  it('detects markup', () => {
    expect(looksLikeUnsafeMarkup('<img src=x onerror=alert(1)>')).toBe(true)
  })

  it('allows https URLs only; rejects overlong without truncating', () => {
    const ok = sanitizeOptionalSourceUrl('https://example.test/page')
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.url).toContain('https://')

    const ftp = sanitizeOptionalSourceUrl('ftp://example.test')
    expect(ftp.ok).toBe(false)
    if (!ftp.ok) expect(ftp.reason).toBe('invalid')

    const longPath = 'a'.repeat(REPORT_LIMITS.sourceUrlMax)
    const tooLong = sanitizeOptionalSourceUrl(`https://example.test/${longPath}`)
    expect(tooLong.ok).toBe(false)
    if (!tooLong.ok) expect(tooLong.reason).toBe('too_long')
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

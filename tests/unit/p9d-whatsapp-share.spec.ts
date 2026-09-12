import { describe, expect, it } from 'vitest'

import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import {
  WHATSAPP_SHARE_DISCLAIMER_AR,
  WHATSAPP_SHARE_MAX_RAW_CHARS,
  WHATSAPP_SHARE_MORE_ON_WARAQA_AR,
  buildWhatsAppShare,
  decodeWhatsAppShareText,
  resolvePublicTransactionAbsoluteUrl,
} from '@/lib/guide/whatsapp-share'

const ORIGIN = 'https://waraqa.example'

function baseInput(overrides: Partial<Parameters<typeof buildWhatsAppShare>[0]> = {}) {
  return {
    title: 'إصدار جواز سفر',
    detailHref: '/transactions/passport-issue',
    siteOrigin: ORIGIN,
    documents: [{ title: 'هوية شخصية' }, { title: 'صور شخصية' }],
    steps: [{ title: 'حجز موعد' }, { title: 'تقديم الطلب' }],
    notices: [{ title: 'راجع الدوام', body: 'قبل الحضور', severity: 'warning' }],
    lastReviewedLabel: '١ كانون الثاني ٢٠٢٦',
    demoLabeled: false,
    ...overrides,
  }
}

describe('P9-D whatsapp-share helper', () => {
  it('C–G: builds Arabic message with title, docs, steps, disclaimer, public URL', () => {
    const result = buildWhatsAppShare(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.message).toContain('إصدار جواز سفر')
    expect(result.message).toContain('هوية شخصية')
    expect(result.message).toContain('حجز موعد')
    expect(result.message).toContain(WHATSAPP_SHARE_DISCLAIMER_AR)
    expect(result.publicUrl).toBe('https://waraqa.example/transactions/passport-issue')
    expect(result.message).toContain(result.publicUrl)
    expect(result.message).toContain('آخر تحقق: ١ كانون الثاني ٢٠٢٦')
    expect(result.message).toContain('ملاحظة مهمة:')
  })

  it('H + V: Arabic newlines survive encoding/decoding; wa.me encoding is valid', () => {
    const result = buildWhatsAppShare(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true)
    const decoded = decodeWhatsAppShareText(result.whatsappUrl)
    expect(decoded).toBe(result.message)
    expect(decoded).toContain('\n')
    expect(decoded).toContain('الأوراق المطلوبة:')
  })

  it('I–K: does not leak raw answer/rule/claim/source keys', () => {
    const result = buildWhatsAppShare(
      baseInput({
        documents: [{ title: 'هوية شخصية' }],
        steps: [{ title: 'خطوة' }],
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blob = `${result.message}\n${result.whatsappUrl}`
    expect(blob).not.toMatch(/needs_guardian|doc_id|include-guardian|rule_|claim_|variant_/)
    expect(blob).not.toMatch(/country=|minor=false|contentClass|QA_TEST/)
  })

  it('L: ignores checklist / answer state (not accepted as inputs)', () => {
    const result = buildWhatsAppShare(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.message).not.toContain('محدّد')
    expect(result.message).not.toContain('[✓]')
    expect(result.message).not.toContain('checked')
  })

  it('M/N: DEMO warning only when demoLabeled', () => {
    const demo = buildWhatsAppShare(baseInput({ demoLabeled: true }))
    expect(demo.ok).toBe(true)
    if (demo.ok) expect(demo.message).toContain(DEMO_PUBLIC_LABEL_AR)

    const prod = buildWhatsAppShare(baseInput({ demoLabeled: false }))
    expect(prod.ok).toBe(true)
    if (prod.ok) expect(prod.message).not.toContain(DEMO_PUBLIC_LABEL_AR)
  })

  it('P–R: oversized message truncates by item boundary under raw limit', () => {
    const longDocs = Array.from({ length: 40 }, (_, i) => ({
      title: `وثيقة تحضير طويلة الاسم رقم ${i + 1} للتأكد من القص على الحدود`,
    }))
    const longSteps = Array.from({ length: 30 }, (_, i) => ({
      title: `خطوة مطوّلة للتحضير رقم ${i + 1} مع نص إضافي`,
    }))
    const result = buildWhatsAppShare(
      baseInput({
        documents: longDocs,
        steps: longSteps,
        maxRawChars: 700,
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.message.length).toBeLessThanOrEqual(700)
    expect(result.message.length).toBeLessThanOrEqual(WHATSAPP_SHARE_MAX_RAW_CHARS)
    expect(result.message).toContain(WHATSAPP_SHARE_MORE_ON_WARAQA_AR)
    expect(result.message).toContain(result.publicUrl)
    expect(result.message).toContain(WHATSAPP_SHARE_DISCLAIMER_AR)
    expect(result.message).toContain('إصدار جواز سفر')
  })

  it('S: shared WhatsApp URL has no answer query params', () => {
    const result = buildWhatsAppShare(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const u = new URL(result.whatsappUrl)
    expect([...u.searchParams.keys()]).toEqual(['text'])
    expect(result.publicUrl).not.toMatch(/[?&]/)
    expect(decodeWhatsAppShareText(result.whatsappUrl) ?? '').not.toMatch(/needs_guardian=/)
  })

  it('W: missing/unsafe public URL fails closed', () => {
    expect(buildWhatsAppShare(baseInput({ siteOrigin: null })).ok).toBe(false)
    const emptyOrigin = buildWhatsAppShare(baseInput({ siteOrigin: '' }))
    expect(emptyOrigin.ok).toBe(false)
    if (!emptyOrigin.ok) expect(emptyOrigin.reason).toBe('unsafe_url')
    expect(buildWhatsAppShare(baseInput({ siteOrigin: 'javascript:alert(1)' })).ok).toBe(false)
    expect(
      buildWhatsAppShare(baseInput({ detailHref: '/transactions/x?answers=1' })).ok,
    ).toBe(false)
    expect(buildWhatsAppShare(baseInput({ detailHref: '/admin/secret' })).ok).toBe(false)
    const blankTitle = buildWhatsAppShare(baseInput({ title: '   ' }))
    expect(blankTitle.ok).toBe(false)
    if (!blankTitle.ok) expect(blankTitle.reason).toBe('missing_title')
  })

  it('O: share path has no contentClass / QA_TEST channel', () => {
    const result = buildWhatsAppShare(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.message).not.toContain('QA_TEST')
    expect(result.message).not.toContain('contentClass')
    expect(Object.keys(baseInput())).not.toContain('contentClass')
  })

  it('resolvePublicTransactionAbsoluteUrl joins origin + path safely', () => {
    expect(resolvePublicTransactionAbsoluteUrl(ORIGIN, '/transactions/ab')).toBe(
      'https://waraqa.example/transactions/ab',
    )
    expect(resolvePublicTransactionAbsoluteUrl(ORIGIN, '/transactions/ab#x')).toBeNull()
    expect(resolvePublicTransactionAbsoluteUrl('ftp://x', '/transactions/ab')).toBeNull()
  })
})

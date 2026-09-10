import type { SourceDocLike } from '@/lib/workflow/source-evidence'

export type SourceTrustResult = {
  ok: boolean
  reason?: string
}

/**
 * Centralized Source trust for Claim evidence (P0-05B1).
 * Aligns with existing approve/publish source gates — does not invent freshness windows.
 */
export function evaluateSourceTrust(source: SourceDocLike | null | undefined): SourceTrustResult {
  if (!source) {
    return { ok: false, reason: 'المصدر غير موجود' }
  }
  if (source.active === false) {
    return { ok: false, reason: 'المصدر غير نشط' }
  }
  const status = source.verificationStatus ?? 'needs_review'
  if (status === 'outdated' || status === 'unavailable') {
    return { ok: false, reason: `المصدر غير صالح (${status})` }
  }
  if (status !== 'verified') {
    return { ok: false, reason: `المصدر غير موثّق (${status})` }
  }
  const url = typeof source.officialUrl === 'string' ? source.officialUrl : ''
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, reason: 'المصدر بلا رابط رسمي HTTP/HTTPS صالح' }
  }
  return { ok: true }
}

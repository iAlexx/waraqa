import { REPORT_LIMITS } from './types'

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const TAG_LIKE = /<\/?[a-zA-Z][^>]*>/g
const SCRIPTISH = /javascript:|data:text\/html|vbscript:/gi

/** Strip control chars and collapse whitespace; plain text only. */
export function sanitizePlainText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(CONTROL_CHARS, '')
    .replace(TAG_LIKE, ' ')
    .replace(SCRIPTISH, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

export function containsHtmlLike(input: string): boolean {
  return TAG_LIKE.test(input) || /<script/i.test(input)
}

/** Reset lastIndex on global regex after containsHtmlLike. */
export function looksLikeUnsafeMarkup(input: string): boolean {
  TAG_LIKE.lastIndex = 0
  SCRIPTISH.lastIndex = 0
  if (/<script/i.test(input)) return true
  if (TAG_LIKE.test(input)) return true
  if (SCRIPTISH.test(input)) return true
  return false
}

export function sanitizeMessage(input: unknown): string {
  return sanitizePlainText(input, REPORT_LIMITS.messageMax)
}

export function sanitizeOptionalContactEmail(input: unknown): string | null {
  const v = sanitizePlainText(input, REPORT_LIMITS.contactEmailMax)
  return v.length ? v : null
}

export function sanitizeOptionalContactPhone(input: unknown): string | null {
  const v = sanitizePlainText(input, REPORT_LIMITS.contactPhoneMax)
  return v.length ? v : null
}

export type SourceUrlSanitizeResult =
  | { ok: true; url: string | null }
  | { ok: false; reason: 'invalid' | 'too_long' }

/**
 * Normalize an optional source URL.
 * Never truncates a valid URL into a different URL — over-limit → too_long.
 */
export function sanitizeOptionalSourceUrl(input: unknown): SourceUrlSanitizeResult {
  if (input == null || input === '') return { ok: true, url: null }
  if (typeof input !== 'string') return { ok: false, reason: 'invalid' }

  // Clean without length truncation (length checked on the normalized URL).
  const cleaned = input
    .replace(CONTROL_CHARS, '')
    .replace(TAG_LIKE, ' ')
    .replace(SCRIPTISH, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return { ok: true, url: null }

  try {
    const u = new URL(cleaned)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, reason: 'invalid' }
    }
    const normalized = u.toString()
    if (normalized.length > REPORT_LIMITS.sourceUrlMax) {
      return { ok: false, reason: 'too_long' }
    }
    return { ok: true, url: normalized }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

export function sanitizeResolutionNote(input: unknown): string {
  return sanitizePlainText(input, REPORT_LIMITS.resolutionNoteMax)
}

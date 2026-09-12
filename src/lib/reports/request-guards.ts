/** Early request-gate helpers for POST /api/public/reports (unit-tested). */

import { REPORT_LIMITS } from './types'

export function isMultipartContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('multipart/form-data')
}

export function isJsonContentType(contentType: string): boolean {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return base === 'application/json'
}

export function contentLengthExceedsLimit(
  contentLengthHeader: string | null,
  maxBytes: number = REPORT_LIMITS.maxRequestBytes,
): 'ok' | 'missing' | 'invalid' | 'too_large' {
  if (contentLengthHeader == null || contentLengthHeader === '') return 'missing'
  const len = Number(contentLengthHeader)
  if (!Number.isFinite(len) || len < 0) return 'invalid'
  if (len > maxBytes) return 'too_large'
  return 'ok'
}

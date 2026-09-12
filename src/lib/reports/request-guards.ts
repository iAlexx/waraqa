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

export type ReadBodyLimitedResult =
  | { ok: true; text: string; byteLength: number }
  | { ok: false; reason: 'too_large' | 'invalid' }

/**
 * Read a request body with a hard byte cap (UTF-8 bytes, not JS string length).
 * Stops reading once maxBytes is exceeded — safe for missing Content-Length / chunked.
 */
export async function readRequestBodyLimited(
  request: Request,
  maxBytes: number = REPORT_LIMITS.maxRequestBytes,
): Promise<ReadBodyLimitedResult> {
  const body = request.body
  if (body == null) {
    return { ok: true, text: '', byteLength: 0 }
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value || value.byteLength === 0) continue
      total += value.byteLength
      if (total > maxBytes) {
        try {
          await reader.cancel()
        } catch {
          /* ignore */
        }
        return { ok: false, reason: 'too_large' }
      }
      chunks.push(value)
    }
  } catch {
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
    return { ok: false, reason: 'invalid' }
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(merged)
    return { ok: true, text, byteLength: total }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

import { createHmac, createHash } from 'node:crypto'

/**
 * Privacy-preserving request identity for rate limiting.
 * Never stores raw IP. HMAC with server secret, then truncated SHA-256 hex.
 */
export function hashReportIdentity(opts: {
  secret: string
  ip: string | null
  userAgent: string | null
}): string {
  const ip = (opts.ip || 'unknown').trim().slice(0, 128)
  const ua = (opts.userAgent || '').trim().slice(0, 256)
  const mac = createHmac('sha256', opts.secret)
    .update(`report-rl:v1|${ip}|${ua}`)
    .digest('hex')
  return createHash('sha256').update(mac).digest('hex').slice(0, 48)
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 128)
  }
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 128)
  return null
}

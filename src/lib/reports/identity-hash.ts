import { createHmac, createHash } from 'node:crypto'

/**
 * Privacy-preserving rate-limit identity (Phase 10).
 *
 * Primary bucket key = HMAC of the **server-trusted client IP only**.
 * User-Agent is intentionally excluded so clients cannot rotate UA to bypass limits.
 *
 * Trusted proxy assumption (Vercel):
 * - On Vercel, `x-forwarded-for` is set by the platform edge.
 * - We take the left-most (original client) address from that list.
 * - `x-real-ip` is accepted as a secondary platform header when present.
 * - We never trust a client-supplied identity token or arbitrary header that
 *   is not part of the deployment proxy contract.
 *
 * Fail-closed: if no trustworthy IP can be derived, rate limiting refuses
 * the request (caller maps this to a safe 503) rather than falling back to
 * a shared "unknown" bucket that would throttle everyone together or allow
 * anonymous unlimited abuse via missing IP.
 *
 * Raw IP is never persisted — only the truncated HMAC/SHA-256 hex is stored.
 */
export type TrustedClientIp =
  | { ok: true; ip: string; source: 'x-forwarded-for' | 'x-real-ip' }
  | { ok: false; reason: 'missing' | 'malformed' }

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/
const IPV6_RE = /^[0-9a-fA-F:]+$/

function normalizeIpCandidate(raw: string): string | null {
  let v = raw.trim()
  if (!v || v.length > 128) return null
  // Strip surrounding brackets for IPv6 literals like [::1]
  if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1)
  // Strip :port for IPv4 host:port
  if (v.includes('.') && v.includes(':') && !v.includes('::')) {
    const host = v.split(':')[0]
    if (host) v = host
  }
  if (IPV4_RE.test(v)) return v
  if (v.includes(':') && IPV6_RE.test(v) && v.length >= 2) return v.toLowerCase()
  return null
}

/**
 * Derive a trustworthy client IP from proxy headers.
 * Does not accept client-controlled identity tokens.
 */
export function trustedClientIpFromHeaders(headers: Headers): TrustedClientIp {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded != null && forwarded.trim() !== '') {
    const first = forwarded.split(',')[0]?.trim() ?? ''
    const ip = normalizeIpCandidate(first)
    if (!ip) return { ok: false, reason: 'malformed' }
    return { ok: true, ip, source: 'x-forwarded-for' }
  }

  const realIp = headers.get('x-real-ip')
  if (realIp != null && realIp.trim() !== '') {
    const ip = normalizeIpCandidate(realIp)
    if (!ip) return { ok: false, reason: 'malformed' }
    return { ok: true, ip, source: 'x-real-ip' }
  }

  return { ok: false, reason: 'missing' }
}

/** @deprecated Use trustedClientIpFromHeaders — kept for call-site migration. */
export function clientIpFromHeaders(headers: Headers): string | null {
  const t = trustedClientIpFromHeaders(headers)
  return t.ok ? t.ip : null
}

/**
 * Hash a trusted IP into a rate-limit bucket key.
 * Throws if IP is empty (callers must fail closed before hashing unknowns).
 */
export function hashReportIdentity(opts: { secret: string; ip: string }): string {
  const ip = opts.ip.trim()
  if (!ip) {
    throw new Error('trusted_ip_required')
  }
  const mac = createHmac('sha256', opts.secret)
    .update(`report-rl:v2|ip|${ip}`)
    .digest('hex')
  return createHash('sha256').update(mac).digest('hex').slice(0, 48)
}

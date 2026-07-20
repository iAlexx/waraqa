/**
 * Safe public URL handling for official source links.
 * Only http(s) absolute URLs are allowed.
 */

export type SafePublicUrl = {
  href: string
  label: string
}

export function sanitizePublicHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Prefer a human label; fall back to hostname or truncated URL. */
export function publicLinkLabel(preferred: string | null | undefined, href: string): string {
  const p = preferred?.trim()
  if (p) return p
  try {
    return new URL(href).hostname
  } catch {
    return href.length > 48 ? `${href.slice(0, 45)}…` : href
  }
}

export function toSafePublicLink(
  rawUrl: unknown,
  preferredLabel?: string | null,
): SafePublicUrl | null {
  const href = sanitizePublicHttpUrl(rawUrl)
  if (!href) return null
  return { href, label: publicLinkLabel(preferredLabel, href) }
}

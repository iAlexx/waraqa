/**
 * Robots.txt / HTML robots metadata parsers for deploy smoke (Phase 14-A).
 * Pure helpers — no network I/O.
 */

export type RobotsRuleGroup = {
  userAgents: string[]
  allows: string[]
  disallows: string[]
}

/**
 * Parse robots.txt into rule groups (User-agent blocks).
 * Ignores Sitemap / comments. Paths are trimmed; matching is case-insensitive for directives.
 */
export function parseRobotsTxt(raw: string): RobotsRuleGroup[] {
  const groups: RobotsRuleGroup[] = []
  let current: RobotsRuleGroup | null = null

  const flush = () => {
    if (current && current.userAgents.length) {
      groups.push(current)
    }
    current = null
  }

  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.replace(/#.*$/, '').trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()

    if (key === 'user-agent') {
      if (!current || current.allows.length > 0 || current.disallows.length > 0) {
        flush()
        current = { userAgents: [value], allows: [], disallows: [] }
      } else {
        current.userAgents.push(value)
      }
      continue
    }

    if (!current) {
      current = { userAgents: ['*'], allows: [], disallows: [] }
    }

    if (key === 'allow') current.allows.push(value)
    else if (key === 'disallow') current.disallows.push(value)
  }
  flush()
  return groups
}

/** True when a Disallow path is exactly `/` (full-site), not `/admin` or `/preview`. */
export function isFullSiteDisallowPath(path: string): boolean {
  const normalized = path.trim()
  return normalized === '/'
}

/**
 * Wildcard (`*`) user-agent group contains an exact full-site `Disallow: /`.
 * Partial paths like `/admin` do not qualify.
 */
export function hasWildcardFullSiteDisallow(groups: RobotsRuleGroup[]): boolean {
  for (const group of groups) {
    const isWildcard = group.userAgents.some((ua) => ua.trim() === '*')
    if (!isWildcard) continue
    if (group.disallows.some(isFullSiteDisallowPath)) return true
  }
  return false
}

/**
 * Detect HTML robots noindex from common Next.js / meta patterns.
 * Requires an explicit noindex token in a robots meta/http-equiv or equivalent.
 */
export function htmlSignalsNoindex(html: string): boolean {
  if (!html) return false
  const lower = html.toLowerCase()

  // <meta name="robots" content="noindex, nofollow">
  const metaRobots =
    /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = metaRobots.exec(lower)) !== null) {
    const tag = match[0]
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)
    if (content && /\bnoindex\b/i.test(content[1])) return true
  }

  // content before name (attribute order variants)
  const metaRobotsAlt =
    /<meta\b[^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*\bname\s*=\s*["']robots["'][^>]*>/gi
  while ((match = metaRobotsAlt.exec(lower)) !== null) {
    if (/\bnoindex\b/i.test(match[1])) return true
  }

  return false
}

/** Production indexing robots should not full-site disallow under wildcard. */
export function assertProductionRobotsAllowsCrawl(groups: RobotsRuleGroup[]): boolean {
  return !hasWildcardFullSiteDisallow(groups)
}

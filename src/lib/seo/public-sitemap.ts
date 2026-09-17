/**
 * Public sitemap eligibility helpers (Phase 14-A).
 * Sitemap entries must use the same public Where gates as citizen surfaces.
 * When indexing is disabled, return an empty URL list (robots already disallow).
 */
import { getPayload } from 'payload'

import config from '@payload-config'
import { getPublicTransactionWhere } from '@/access'
import { shouldAllowPublicIndexing } from '@/lib/seo/indexing-policy'

export type SitemapUrlEntry = {
  path: string
  lastModified?: Date
}

const STATIC_PUBLIC_PATHS = ['/', '/search', '/categories', '/about', '/methodology', '/privacy', '/terms', '/contact'] as const

export function staticPublicSitemapPaths(): readonly string[] {
  return STATIC_PUBLIC_PATHS
}

/**
 * Build sitemap URL paths for the active public content mode.
 * Never includes admin, preview, API, draft, QA_TEST, or blocked procedures.
 */
export async function listPublicSitemapEntries(): Promise<SitemapUrlEntry[]> {
  if (!shouldAllowPublicIndexing()) {
    return []
  }

  const entries: SitemapUrlEntry[] = STATIC_PUBLIC_PATHS.map((path) => ({ path }))

  try {
    const payload = await getPayload({ config })
    const found = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: false,
      where: getPublicTransactionWhere(),
    })

    for (const doc of found.docs) {
      const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''
      if (!slug) continue
      const updatedAt = 'updatedAt' in doc && doc.updatedAt ? new Date(String(doc.updatedAt)) : undefined
      entries.push({
        path: `/transactions/${slug}`,
        lastModified: updatedAt,
      })
      // Guide is a public surface for eligible procedures; DEMO pages still set page-level noindex when labeled.
      entries.push({
        path: `/transactions/${slug}/guide`,
        lastModified: updatedAt,
      })
    }
  } catch {
    // Fail closed: static public shells only (already added).
  }

  return entries
}

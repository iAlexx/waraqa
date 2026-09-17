import type { MetadataRoute } from 'next'

import { listPublicSitemapEntries } from '@/lib/seo/public-sitemap'

/** Revalidate against live CMS eligibility (trust / publish / archive changes). */
export const dynamic = 'force-dynamic'

function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').trim()
  return raw.replace(/\/$/, '')
}

/**
 * Public sitemap. Empty when indexing is disabled (non-production env / DEMO mode).
 * Procedure URLs require live claim trust; guide URLs only when a public guide exists.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin()
  const entries = await listPublicSitemapEntries()

  return entries.map((entry) => ({
    url: `${origin}${entry.path}`,
    lastModified: entry.lastModified,
    changeFrequency: entry.path === '/' ? 'daily' : 'weekly',
    priority: entry.path === '/' ? 1 : entry.path.startsWith('/transactions/') ? 0.8 : 0.5,
  }))
}

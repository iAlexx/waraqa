import type { MetadataRoute } from 'next'

import { listPublicSitemapEntries } from '@/lib/seo/public-sitemap'

function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').trim()
  return raw.replace(/\/$/, '')
}

/**
 * Public sitemap. Empty when indexing is disabled (Preview / DEMO mode).
 * Entries use getPublicTransactionWhere() — never drafts, QA_TEST, or blocked rows.
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

import type { MetadataRoute } from 'next'

import { shouldAllowPublicIndexing } from '@/lib/seo/indexing-policy'

function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').trim()
  return raw.replace(/\/$/, '')
}

/**
 * Crawler hints only — not authentication.
 * Preview / DEMO mode: disallow all.
 * Production indexing: allow public shells; disallow admin/API/preview/dev.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin()
  const allowIndexing = shouldAllowPublicIndexing()

  if (!allowIndexing) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/api/', '/preview/', '/dev/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}

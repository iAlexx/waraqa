import { cache } from 'react'
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  fallbackPublicSiteSettings,
  mapPublicSiteSettings,
  type PublicSiteSettings,
} from '@/lib/public/site-settings-map'

export * from '@/lib/public/site-settings-map'

/** Server-only loader — do not import from Client Components. */
export const loadPublicSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.findGlobal({
      slug: 'site-settings',
      locale: 'ar',
      depth: 0,
      overrideAccess: false,
    })
    return mapPublicSiteSettings(doc)
  } catch {
    return fallbackPublicSiteSettings()
  }
})

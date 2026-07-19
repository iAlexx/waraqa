import type { CollectionBeforeChangeHook } from 'payload'

import { buildNormalizedSearchBlob } from '@/lib/search/normalize'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'

function aliasValues(data: Record<string, unknown>): string[] {
  const aliases = data.aliases
  if (!Array.isArray(aliases)) return []
  return aliases
    .map((row) => {
      if (!row || typeof row !== 'object') return ''
      return localizedString((row as { value?: LocalizedLike }).value)
    })
    .filter(Boolean)
}

function idOf(value: unknown): string | number | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * Maintains a normalized `searchText` blob for candidate prefiltering.
 * Does not alter display title/summary/aliases.
 */
export const populateSearchText: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  const next = { ...(data ?? {}) } as Record<string, unknown>
  const parts: string[] = []

  parts.push(localizedString(next.title as LocalizedLike))
  parts.push(localizedString(next.summary as LocalizedLike))
  parts.push(typeof next.slug === 'string' ? next.slug.replace(/-/g, ' ') : '')
  parts.push(...aliasValues(next))

  // Resolve related public labels when possible (best-effort; never blocks save)
  try {
    const payload = req.payload
    const categoryId = idOf(next.category ?? originalDoc?.category)
    if (categoryId != null) {
      try {
        const cat = await payload.findByID({
          collection: 'categories',
          id: categoryId,
          locale: 'ar',
          depth: 0,
          overrideAccess: true,
        })
        parts.push(localizedString((cat as { name?: LocalizedLike }).name))
      } catch {
        /* ignore */
      }
    }

    const agencyId = idOf(next.agency ?? originalDoc?.agency)
    if (agencyId != null) {
      try {
        const agency = await payload.findByID({
          collection: 'agencies',
          id: agencyId,
          locale: 'ar',
          depth: 0,
          overrideAccess: true,
        })
        parts.push(localizedString((agency as { name?: LocalizedLike }).name))
        const short = localizedString((agency as { shortName?: LocalizedLike }).shortName)
        if (short) parts.push(short)
      } catch {
        /* ignore */
      }
    }

    const centers = next.serviceCenters ?? originalDoc?.serviceCenters
    const centerIds: Array<string | number> = []
    if (Array.isArray(centers)) {
      for (const c of centers) {
        const id = idOf(c)
        if (id != null) centerIds.push(id)
      }
    }
    for (const id of centerIds.slice(0, 12)) {
      try {
        const center = await payload.findByID({
          collection: 'service-centers',
          id,
          locale: 'ar',
          depth: 0,
          overrideAccess: true,
        })
        parts.push(localizedString((center as { name?: LocalizedLike }).name))
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore resolution failures */
  }

  next.searchText = buildNormalizedSearchBlob(parts)
  return next
}

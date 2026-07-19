import { getPayload } from 'payload'

import config from '@payload-config'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'

export type PublicCategoryCard = {
  id: number | string
  name: string
  slug: string
  description: string
  procedureCount: number | null
  /** True when category name/slug looks like QA/demo fixture content. */
  demoLabeled: boolean
}

function isDemoLabel(text: string): boolean {
  return /تجريب|demo|test|qa-|r2|r3|r4|fixture/i.test(text)
}

/**
 * Public categories: published + active only (collection access + explicit filter).
 */
export async function loadPublicCategories(): Promise<{
  categories: PublicCategoryCard[]
  unavailable: boolean
}> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'categories',
      locale: 'ar',
      depth: 0,
      limit: 48,
      sort: 'sortOrder',
      overrideAccess: false,
      where: {
        and: [{ _status: { equals: 'published' } }, { active: { equals: true } }],
      },
    })

    const categories: PublicCategoryCard[] = []
    for (const doc of result.docs) {
      const name = localizedString(doc.name as LocalizedLike)
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      if (!name || !slug) continue

      let procedureCount: number | null = null
      try {
        const count = await payload.count({
          collection: 'transactions',
          overrideAccess: false,
          where: {
            and: [
              { category: { equals: doc.id } },
              { _status: { equals: 'published' } },
              { active: { equals: true } },
              { markedOutdated: { not_equals: true } },
              { workflowState: { not_equals: 'archived' } },
            ],
          },
        })
        procedureCount = count.totalDocs
      } catch {
        procedureCount = null
      }

      categories.push({
        id: doc.id,
        name,
        slug,
        description: localizedString(doc.description as LocalizedLike),
        procedureCount,
        demoLabeled: isDemoLabel(name) || isDemoLabel(slug),
      })
    }

    return { categories, unavailable: false }
  } catch {
    return { categories: [], unavailable: true }
  }
}

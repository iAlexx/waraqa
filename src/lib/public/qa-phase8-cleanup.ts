import type { Payload } from 'payload'

import { isPhase8QaFixtureSlug, PHASE8_QA_SLUG_PREFIX } from '@/lib/public/qa-phase8-markers'

type TrackedCollection =
  | 'transactions'
  | 'documents'
  | 'sources'
  | 'agencies'
  | 'categories'

const DELETE_ORDER: TrackedCollection[] = [
  'transactions',
  'documents',
  'sources',
  'agencies',
  'categories',
]

/** Deletes only Phase 8 QA rows (`qa-p8-r1-*`). */
export async function cleanupPhase8QaFixture(payload: Payload): Promise<{ deleted: number }> {
  let deleted = 0
  for (const collection of DELETE_ORDER) {
    const found = await payload.find({
      collection,
      locale: 'ar',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      where: { slug: { contains: PHASE8_QA_SLUG_PREFIX } },
    })
    for (const doc of found.docs) {
      const slug = (doc as { slug?: string }).slug
      if (!isPhase8QaFixtureSlug(slug)) continue
      await payload.delete({ collection, id: doc.id, overrideAccess: true })
      deleted += 1
    }
  }
  return { deleted }
}

export async function countPhase8QaPublishedEligible(payload: Payload): Promise<number> {
  const found = await payload.find({
    collection: 'transactions',
    locale: 'ar',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: {
      and: [
        { slug: { contains: PHASE8_QA_SLUG_PREFIX } },
        { _status: { equals: 'published' } },
        { active: { equals: true } },
        { markedOutdated: { not_equals: true } },
        { workflowState: { not_equals: 'archived' } },
      ],
    },
  })
  return found.docs.filter((d) => isPhase8QaFixtureSlug((d as { slug?: string }).slug)).length
}

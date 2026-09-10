import type { Payload } from 'payload'

import { isPhase6QaFixtureSlug, PHASE6_QA_SLUG_PREFIX } from '@/lib/search/qa-fixture-markers'

type TrackedCollection =
  | 'transactions'
  | 'service-centers'
  | 'sources'
  | 'agencies'
  | 'categories'

const DELETE_ORDER: TrackedCollection[] = [
  'transactions',
  'service-centers',
  'sources',
  'agencies',
  'categories',
]

/**
 * Deletes only Phase 6 Round-01-style QA fixture rows (slug prefix `qa-p6-r1-`).
 * Never deletes unrelated local or production-like records.
 */
export async function cleanupPhase6QaFixture(payload: Payload): Promise<{ deleted: number }> {
  let deleted = 0

  for (const collection of DELETE_ORDER) {
    const found = await payload.find({
      collection,
      locale: 'ar',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      where: {
        slug: { contains: PHASE6_QA_SLUG_PREFIX },
      },
    })

    for (const doc of found.docs) {
      const slug = (doc as { slug?: string }).slug
      if (!isPhase6QaFixtureSlug(slug)) continue
      await payload.delete({
        collection,
        id: doc.id,
        overrideAccess: true,
      })
      deleted += 1
    }
  }

  return { deleted }
}

/** Count published eligible Phase 6 QA transactions currently in the DB. */
export async function countPhase6QaPublishedEligible(payload: Payload): Promise<number> {
  const found = await payload.find({
    collection: 'transactions',
    locale: 'ar',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    where: {
      and: [
        { slug: { contains: PHASE6_QA_SLUG_PREFIX } },
        { _status: { equals: 'published' } },
        { active: { equals: true } },
        { markedOutdated: { not_equals: true } },
        { workflowState: { not_equals: 'archived' } },
        { claimTrustOk: { equals: true } },
      ],
    },
  })
  return found.docs.filter((d) => isPhase6QaFixtureSlug((d as { slug?: string }).slug)).length
}

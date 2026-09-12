import type { Payload } from 'payload'

import { isPhase8QaFixtureSlug, PHASE8_QA_SLUG_PREFIX } from '@/lib/public/qa-phase8-markers'

type TrackedCollection =
  | 'transactions'
  | 'service-centers'
  | 'documents'
  | 'sources'
  | 'agencies'
  | 'categories'

const DELETE_ORDER: TrackedCollection[] = [
  'transactions',
  'service-centers',
  'documents',
  'sources',
  'agencies',
  'categories',
]

const CLAIM_KEY_PREFIX = 'claim_qa_p8_r1_'
const REVIEWER_EMAIL_PREFIX = 'qa-p8-r1-reviewer@'

/** Deletes only Phase 8 QA rows (`qa-p8-r1-*`). */
export async function cleanupPhase8QaFixture(payload: Payload): Promise<{ deleted: number }> {
  let deleted = 0

  // Reports may RESTRICT deletion of referenced transactions — clear them first.
  const txCandidates = await payload.find({
    collection: 'transactions',
    locale: 'ar',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    where: { slug: { contains: PHASE8_QA_SLUG_PREFIX } },
  })
  for (const tx of txCandidates.docs) {
    const slug = (tx as { slug?: string }).slug
    if (!isPhase8QaFixtureSlug(slug)) continue
    const reports = await payload.find({
      collection: 'user-reports',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      where: { transaction: { equals: tx.id } },
    })
    for (const report of reports.docs) {
      await payload.delete({
        collection: 'user-reports',
        id: report.id,
        overrideAccess: true,
        context: { seed: true },
      })
      deleted += 1
    }
  }

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
      await payload.delete({
        collection,
        id: doc.id,
        overrideAccess: true,
        context: { seed: true },
      })
      deleted += 1
    }
  }

  const claims = await payload.find({
    collection: 'claims',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { key: { contains: CLAIM_KEY_PREFIX } },
  })
  for (const doc of claims.docs) {
    await payload.delete({
      collection: 'claims',
      id: doc.id,
      overrideAccess: true,
      context: { seed: true },
    })
    deleted += 1
  }

  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    where: { email: { contains: REVIEWER_EMAIL_PREFIX } },
  })
  for (const doc of users.docs) {
    await payload.delete({
      collection: 'users',
      id: doc.id,
      overrideAccess: true,
      context: { seed: true },
    })
    deleted += 1
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

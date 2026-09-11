import type { Payload } from 'payload'

import type { ContentClass } from '@/lib/content-class/types'

const seedCtx = { seed: true as const }

/**
 * Create a published AUTHORITATIVE claim bound to a verified source (fictional fixtures only).
 *
 * Default contentClass is QA_TEST (fail-safe isolation).
 * Callers that need public visibility must:
 * - pass contentClass: 'PRODUCTION' (or 'DEMO' under WARAQA_PUBLIC_CONTENT_MODE=demo)
 * - create the related Source with the same compatible contentClass
 * - create the Transaction with a compatible contentClass
 */
export async function createAuthoritativeClaimFixture(
  payload: Payload,
  opts: {
    key: string
    sourceId: number | string
    reviewerId: number | string
    statement?: string
    contentClass?: ContentClass
  },
) {
  return payload.create({
    collection: 'claims',
    locale: 'ar',
    draft: false,
    data: {
      key: opts.key,
      statement: opts.statement ?? 'ادعاء موثوق تجريبي للاختبار فقط.',
      status: 'VERIFIED',
      publicationPermission: 'PUBLIC',
      contentClass: opts.contentClass ?? 'QA_TEST',
      reviewedBy: Number(opts.reviewerId),
      verifiedAt: '2026-07-01T12:00:00.000Z',
      evidence: [{ source: Number(opts.sourceId), relationType: 'SUPPORTS' }],
      active: true,
      _status: 'published',
    },
    overrideAccess: true,
    context: seedCtx,
  })
}

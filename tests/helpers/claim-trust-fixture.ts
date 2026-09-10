import type { Payload } from 'payload'

const seedCtx = { seed: true as const }

/**
 * Create a published AUTHORITATIVE claim bound to a verified source (fictional fixtures only).
 */
export async function createAuthoritativeClaimFixture(
  payload: Payload,
  opts: {
    key: string
    sourceId: number | string
    reviewerId: number | string
    statement?: string
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

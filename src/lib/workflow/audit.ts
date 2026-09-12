import type { Payload, PayloadRequest } from 'payload'

const MAX_SUMMARY = 500

export type AuditAction =
  | 'draft_created'
  | 'submitted_for_review'
  | 'changes_requested'
  | 'resubmitted_for_review'
  | 'approved'
  | 'approval_invalidated'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'archive_restored'
  | 'revision_restored'
  | 'review_date_overridden'
  | 'marked_outdated'
  | 'report_received'
  | 'report_in_review'
  | 'report_resolved'
  | 'report_rejected'
  | 'report_marked_spam'
  | 'report_status_changed'

const SAFE_META_KEYS = new Set([
  'fromState',
  'toState',
  'commentLength',
  'reasonLength',
  'versionId',
  'hashPrefix',
  'reviewDueAt',
  'actorLabel',
])

export function sanitizeAuditSummary(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_SUMMARY)
}

export function sanitizeAuditMetadata(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (!SAFE_META_KEYS.has(k)) continue
    if (typeof v === 'string') out[k] = v.slice(0, 200)
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

export async function writeAuditEvent(
  payload: Payload,
  opts: {
    req?: PayloadRequest
    actorId?: number | string | null
    actorLabel?: string | null
    action: AuditAction
    entityType: string
    entityId: string | number
    transactionId?: number | string | null
    entityVersionId?: string | number | null
    summary: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const actorId =
    opts.actorId != null && opts.actorId !== '' && !Number.isNaN(Number(opts.actorId))
      ? opts.actorId
      : null

  let actorLabel = (opts.actorLabel ?? '').trim()
  if (!actorLabel && actorId != null) {
    try {
      const u = await payload.findByID({
        collection: 'users',
        id: actorId,
        depth: 0,
        overrideAccess: true,
        req: opts.req,
      })
      actorLabel =
        String((u as { displayName?: string }).displayName || (u as { name?: string }).name || '').trim() ||
        String((u as { email?: string }).email || '').trim()
    } catch {
      actorLabel = ''
    }
  }

  await payload.create({
    collection: 'audit-events',
    data: {
      actor: actorId != null ? Number(actorId) : undefined,
      action: opts.action,
      entityType: opts.entityType,
      entityId: String(opts.entityId),
      transaction: opts.transactionId != null ? Number(opts.transactionId) : undefined,
      entityVersionId: opts.entityVersionId != null ? String(opts.entityVersionId) : undefined,
      summary: sanitizeAuditSummary(opts.summary),
      metadata: sanitizeAuditMetadata({
        ...opts.metadata,
        ...(actorLabel ? { actorLabel } : actorId == null ? { actorLabel: 'النظام' } : {}),
      }),
    },
    req: opts.req,
    overrideAccess: true,
    context: { auditWrite: true },
    ...(actorId != null
      ? { user: { id: actorId, collection: 'users' } as never }
      : {}),
  })
}

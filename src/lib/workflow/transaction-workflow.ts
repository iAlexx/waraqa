import type { Payload, PayloadRequest } from 'payload'

import { getUserRole, isUserActive, type UserLike, type WaraqaRole } from '@/access/roles'
import { validateProcedureData } from '@/lib/procedure-validation'
import { writeAuditEvent, type AuditAction } from './audit'
import { hashCriticalContent } from './content-fingerprint'
import { calculateReviewDueAt } from './review-schedule'
import { validateSourceEvidence, type SourceDocLike } from './source-evidence'
import {
  assertTransition,
  WorkflowError,
  type WorkflowAction,
  type WorkflowState,
} from './types'

export type WorkflowRunInput = {
  payload: Payload
  req?: PayloadRequest
  id: number | string
  action: WorkflowAction
  user: UserLike
  comment?: string
  reason?: string
  expectedUpdatedAt?: string
  versionId?: number | string
  reviewDueAt?: string
}

function roleOf(user: UserLike): WaraqaRole | null {
  if (!isUserActive(user)) return null
  return getUserRole(user)
}

function requireAuth(user: UserLike): WaraqaRole {
  if (!user) throw new WorkflowError('يجب تسجيل الدخول.', 401)
  const role = roleOf(user)
  if (!role) throw new WorkflowError('الحساب غير نشط أو غير مصرّح.', 403)
  return role
}

function userId(user: UserLike): number | string | undefined {
  if (!user || typeof user !== 'object') return undefined
  return user.id
}

function assertRole(role: WaraqaRole, allowed: WaraqaRole[]) {
  if (!allowed.includes(role)) {
    throw new WorkflowError('غير مصرّح لهذا الدور بتنفيذ هذا الإجراء.', 403)
  }
}

function trimRequired(text: string | undefined, label: string): string {
  const t = (text ?? '').trim()
  if (!t) throw new WorkflowError(`${label} مطلوب ولا يمكن أن يكون فارغاً.`, 422)
  return t
}

async function resolveSources(
  payload: Payload,
  rows: Array<{ source?: unknown }> | null | undefined,
  req?: PayloadRequest,
): Promise<Map<string, SourceDocLike>> {
  const map = new Map<string, SourceDocLike>()
  for (const row of rows ?? []) {
    const raw = row.source
    if (raw && typeof raw === 'object' && 'id' in (raw as object)) {
      const doc = raw as SourceDocLike
      if (doc.id != null) map.set(String(doc.id), doc)
      continue
    }
    const id = raw != null ? String(raw) : null
    if (!id || map.has(id)) continue
    try {
      const doc = await payload.findByID({
        collection: 'sources',
        id,
        depth: 0,
        overrideAccess: true,
        req,
      })
      map.set(id, doc as SourceDocLike)
    } catch {
      // missing — evidence validator reports
    }
  }
  return map
}

async function policyDays(payload: Payload, req?: PayloadRequest): Promise<number> {
  try {
    const settings = await payload.findGlobal({
      slug: 'site-settings',
      overrideAccess: true,
      req,
    })
    const days = (settings as { verificationPolicyDays?: number }).verificationPolicyDays
    return typeof days === 'number' && days > 0 ? days : 90
  } catch {
    return 90
  }
}

function asState(doc: Record<string, unknown>): WorkflowState {
  const s = doc.workflowState
  if (
    s === 'draft' ||
    s === 'in_review' ||
    s === 'changes_requested' ||
    s === 'approved' ||
    s === 'published' ||
    s === 'archived'
  ) {
    return s
  }
  return 'draft'
}

export async function runTransactionWorkflowAction(input: WorkflowRunInput) {
  const { payload, action } = input
  const role = requireAuth(input.user)
  const uid = userId(input.user)

  const doc = (await payload.findByID({
    collection: 'transactions',
    id: input.id,
    depth: 0,
    draft: true,
    overrideAccess: true,
    user: input.user as never,
    req: input.req,
  })) as unknown as Record<string, unknown>

  if (input.expectedUpdatedAt && doc.updatedAt && String(doc.updatedAt) !== input.expectedUpdatedAt) {
    throw new WorkflowError('النسخة قديمة — أعد التحميل ثم حاول مجدداً.', 409)
  }

  const from = asState(doc)
  let patch: Record<string, unknown> = {}
  let auditAction: AuditAction
  let auditSummary: string
  let nextState: WorkflowState = from

  switch (action) {
    case 'submitForReview':
    case 'resubmitForReview': {
      assertRole(role, ['admin', 'reviewer', 'researcher'])
      nextState = assertTransition(from, action)
      const basic = validateProcedureData(doc as never, { publishing: false })
      if (basic.length) throw new WorkflowError(basic.join(' '), 422)
      if (!doc.title || !doc.summary || !doc.category || !doc.agency) {
        throw new WorkflowError('حقول أساسية ناقصة قبل الإرسال للمراجعة.', 422)
      }
      patch = {
        workflowState: nextState,
        submittedForReviewAt: new Date().toISOString(),
        submittedForReviewBy: uid,
      }
      auditAction = action === 'submitForReview' ? 'submitted_for_review' : 'resubmitted_for_review'
      auditSummary =
        action === 'submitForReview' ? 'إرسال المعاملة للمراجعة' : 'إعادة إرسال المعاملة للمراجعة'
      break
    }
    case 'requestChanges': {
      assertRole(role, ['admin', 'reviewer'])
      nextState = assertTransition(from, action)
      const comment = trimRequired(input.comment, 'تعليق طلب التعديل')
      patch = {
        workflowState: nextState,
        changeRequestedAt: new Date().toISOString(),
        changeRequestedBy: uid,
        changeRequestComment: comment,
      }
      auditAction = 'changes_requested'
      auditSummary = 'طلب تعديلات من المراجع'
      break
    }
    case 'approve': {
      assertRole(role, ['admin', 'reviewer'])
      nextState = assertTransition(from, action)
      const pubErrors = validateProcedureData(doc as never, { publishing: true })
      if (pubErrors.length) throw new WorkflowError(pubErrors.join(' '), 422)
      const resolved = await resolveSources(payload, doc.sources as never, input.req)
      const evidenceErrors = validateSourceEvidence(doc as never, resolved)
      if (evidenceErrors.length) throw new WorkflowError(evidenceErrors.join(' '), 422)
      const hash = hashCriticalContent(doc)
      const policy = await policyDays(payload, input.req)
      const due = calculateReviewDueAt({
        lastReviewedAt: doc.lastReviewedAt as string,
        reviewIntervalDays: doc.reviewIntervalDays as number | null,
        verificationPolicyDays: policy,
      })
      patch = {
        workflowState: nextState,
        approvedAt: new Date().toISOString(),
        approvedBy: uid,
        approvedContentHash: hash,
        approvedVersionId: doc._version ?? doc.id,
        reviewDueAt: due?.toISOString() ?? doc.reviewDueAt,
        _status: 'draft',
      }
      auditAction = 'approved'
      auditSummary = 'اعتماد المعاملة'
      break
    }
    case 'publish': {
      assertRole(role, ['admin', 'reviewer'])
      nextState = assertTransition(from, action)
      const pubErrors = validateProcedureData(doc as never, { publishing: true })
      if (pubErrors.length) throw new WorkflowError(pubErrors.join(' '), 422)
      const resolved = await resolveSources(payload, doc.sources as never, input.req)
      const evidenceErrors = validateSourceEvidence(doc as never, resolved)
      if (evidenceErrors.length) throw new WorkflowError(evidenceErrors.join(' '), 422)
      const hash = hashCriticalContent(doc)
      if (!doc.approvedContentHash || hash !== doc.approvedContentHash) {
        throw new WorkflowError(
          'بصمة الاعتماد غير مطابقة — أعد الاعتماد قبل النشر.',
          409,
        )
      }
      const policy = await policyDays(payload, input.req)
      const due = calculateReviewDueAt({
        lastReviewedAt: doc.lastReviewedAt as string,
        reviewIntervalDays: doc.reviewIntervalDays as number | null,
        verificationPolicyDays: policy,
      })
      patch = {
        workflowState: nextState,
        _status: 'published',
        publishedAt: new Date().toISOString(),
        publishedBy: uid,
        reviewDueAt: due?.toISOString() ?? doc.reviewDueAt,
        markedOutdated: false,
      }
      auditAction = 'published'
      auditSummary = 'نشر المعاملة'
      break
    }
    case 'unpublish': {
      assertRole(role, ['admin', 'reviewer'])
      nextState = assertTransition(from, action)
      patch = {
        workflowState: nextState,
        _status: 'draft',
      }
      auditAction = 'unpublished'
      auditSummary = 'إلغاء نشر المعاملة'
      break
    }
    case 'archive': {
      assertRole(role, ['admin'])
      nextState = assertTransition(from, action)
      const reason = trimRequired(input.reason, 'سبب الأرشفة')
      patch = {
        workflowState: nextState,
        _status: 'draft',
        archivedAt: new Date().toISOString(),
        archivedBy: uid,
        archiveReason: reason,
        active: false,
      }
      auditAction = 'archived'
      auditSummary = 'أرشفة المعاملة'
      break
    }
    case 'restoreArchived': {
      assertRole(role, ['admin'])
      nextState = assertTransition(from, action)
      patch = {
        workflowState: nextState,
        _status: 'draft',
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        approvedAt: null,
        approvedBy: null,
        approvedContentHash: null,
        approvedVersionId: null,
        active: true,
      }
      auditAction = 'archive_restored'
      auditSummary = 'استعادة معاملة من الأرشيف'
      break
    }
    case 'restoreRevision': {
      assertRole(role, ['admin'])
      if (input.versionId == null) {
        throw new WorkflowError('معرّف النسخة مطلوب للاستعادة.', 422)
      }
      // Payload restore via findVersionByID + update
      const version = await payload.findVersionByID({
        collection: 'transactions',
        id: String(input.versionId),
        overrideAccess: true,
        req: input.req,
      })
      const versionDoc =
        ((version as unknown as { version?: Record<string, unknown> }).version ??
          (version as unknown as Record<string, unknown>)) as Record<string, unknown>
      const restored = { ...versionDoc }
      delete restored.id
      delete restored.createdAt
      delete restored.updatedAt
      patch = {
        ...restored,
        workflowState: 'draft',
        _status: 'draft',
        approvedAt: null,
        approvedBy: null,
        approvedContentHash: null,
        approvedVersionId: null,
      }
      nextState = 'draft'
      auditAction = 'revision_restored'
      auditSummary = 'استعادة نسخة سابقة كمسودة'
      break
    }
    case 'overrideReviewDue': {
      assertRole(role, ['admin'])
      const reason = trimRequired(input.reason, 'سبب تجاوز موعد المراجعة')
      if (!input.reviewDueAt) {
        throw new WorkflowError('تاريخ موعد المراجعة مطلوب.', 422)
      }
      patch = {
        reviewDueAt: input.reviewDueAt,
        reviewDueOverrideReason: reason,
      }
      auditAction = 'review_date_overridden'
      auditSummary = 'تجاوز موعد المراجعة من المدير'
      break
    }
    case 'markOutdated': {
      assertRole(role, ['admin', 'reviewer'])
      if (from !== 'published') {
        throw new WorkflowError('وسم «قديم» متاح للمعاملات المنشورة فقط.', 409)
      }
      patch = { markedOutdated: true }
      auditAction = 'marked_outdated'
      auditSummary = 'وسم المعاملة كقديمة'
      break
    }
    default:
      throw new WorkflowError('إجراء غير معروف.', 422)
  }

  // Live-row mutations: publish/unpublish, and any action that must hide/show the
  // public document (markOutdated, archive). Draft-only updates leave the published
  // version visible to anonymous queries — that is a public-access bug.
  const mutatesLivePublication =
    action === 'publish' ||
    action === 'unpublish' ||
    action === 'markOutdated' ||
    action === 'archive'

  const updated = await payload.update({
    collection: 'transactions',
    id: input.id,
    data: patch,
    draft: !mutatesLivePublication,
    overrideAccess: true,
    req: input.req,
    context: { workflowAction: action },
    user: input.user as never,
  })

  try {
    await writeAuditEvent(payload, {
      req: input.req,
      actorId: uid,
      action: auditAction,
      entityType: 'transactions',
      entityId: input.id,
      transactionId: input.id,
      summary: auditSummary,
      metadata: {
        fromState: from,
        toState: nextState,
        commentLength: input.comment?.trim().length,
        reasonLength: input.reason?.trim().length,
        hashPrefix:
          typeof patch.approvedContentHash === 'string'
            ? patch.approvedContentHash.slice(0, 12)
            : undefined,
        reviewDueAt: typeof patch.reviewDueAt === 'string' ? patch.reviewDueAt : undefined,
      },
    })
  } catch (err) {
    if (action === 'publish' || action === 'unpublish') {
      throw new WorkflowError(
        'فشل تسجيل حدث التدقيق — لم يُكمل النشر/الإلغاء دون أثر تدقيقي موثوق.',
        422,
      )
    }
    throw err
  }

  return updated
}

/** Invalidate approval when critical content changes while approved (or published draft edits). */
export function maybeInvalidateApproval(opts: {
  originalDoc: Record<string, unknown>
  nextData: Record<string, unknown>
}): { invalidate: boolean; patch: Record<string, unknown> } {
  const state = asState(opts.originalDoc)
  if (state !== 'approved' && state !== 'published') {
    return { invalidate: false, patch: {} }
  }
  // Only when still holding an approval hash
  if (!opts.originalDoc.approvedContentHash) {
    return { invalidate: false, patch: {} }
  }
  const merged = { ...opts.originalDoc, ...opts.nextData }
  const prevHash = hashCriticalContent(opts.originalDoc)
  const nextHash = hashCriticalContent(merged)
  if (prevHash === nextHash) {
    return { invalidate: false, patch: {} }
  }
  return {
    invalidate: true,
    patch: {
      workflowState: 'draft',
      approvedAt: null,
      approvedBy: null,
      approvedContentHash: null,
      approvedVersionId: null,
      // Keep _status as-is for published live version management — caller must not force publish
    },
  }
}

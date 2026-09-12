/**
 * P11-B — Transaction Admin readiness read model.
 * Reuses existing validators; informational only (never authorizes publish).
 */
import type { Payload, PayloadRequest } from 'payload'

import type { ClaimTrustEvaluation } from '@/lib/claims/claim-trust'
import { resolveClaimGraph } from '@/lib/claims/recompute-claim-trust'
import {
  validateClaimBindingsForPublication,
  type ClaimBindingRow,
  type ClaimPublicationGateResult,
} from '@/lib/claims/validate-claim-publication'
import {
  getPublicContentMode,
  isContentClassPubliclyAllowed,
  type PublicContentMode,
} from '@/lib/content-class/public-content-policy'
import { isContentClass } from '@/lib/content-class/types'
import { validateProcedureData } from '@/lib/procedure-validation'
import { hashCriticalContent } from '@/lib/workflow/content-fingerprint'
import {
  validateSourceEvidence,
  type SourceDocLike,
} from '@/lib/workflow/source-evidence'
import { TRANSITION_MATRIX, type WorkflowState } from '@/lib/workflow/types'

import {
  aggregateReadinessStatus,
  claimTrustOutcomeAr,
  contentClassReadinessNoteAr,
  readinessStatusLabelAr,
  type ClaimReadinessDetail,
  type ReadinessIssue,
  type TransactionAdminReadiness,
} from './transaction-readiness-types'

function asWorkflowState(value: unknown): WorkflowState {
  if (
    value === 'draft' ||
    value === 'in_review' ||
    value === 'changes_requested' ||
    value === 'approved' ||
    value === 'published' ||
    value === 'archived'
  ) {
    return value
  }
  return 'draft'
}

/** Same fetch strategy as workflow approve/publish (overrideAccess for editorial graph). */
export async function resolvePublicationSources(
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
      /* missing — evidence validator reports */
    }
  }
  return map
}

function mapEvidenceError(message: string): ReadinessIssue {
  const coverage = /تغطية|covered|summary|steps|fees|required_documents|eligibility|duration|service_centers|outcome/i.test(
    message,
  )
  return {
    code: coverage ? 'SOURCE_COVERAGE' : 'SOURCE_NOT_TRUSTED',
    severity: 'blocker',
    messageAr: message,
  }
}

function mapProcedureError(message: string): ReadinessIssue {
  return {
    code: 'PROCEDURE_INCOMPLETE',
    severity: 'blocker',
    messageAr: message,
  }
}

function mapClaimEvaluation(evaluation: ClaimTrustEvaluation): ReadinessIssue {
  if (evaluation.status === 'missing' || evaluation.reasons.some((r) => r.includes('غير موجود'))) {
    return {
      code: 'CLAIM_MISSING',
      severity: 'blocker',
      messageAr: `المطالبة: ${evaluation.claimKey} — الادعاء غير موجود أو تعذّر تحميله.`,
      claimKey: evaluation.claimKey,
      claimStatus: evaluation.status,
      publicationPermission: evaluation.publicationPermission,
      trustLevel: evaluation.level,
    }
  }
  if (evaluation.level === 'WARNING_ONLY') {
    return {
      code: 'CLAIM_WARNING_ONLY',
      severity: 'blocker',
      messageAr: `المطالبة: ${evaluation.claimKey} — مسموح مع تحذير فقط (${evaluation.status}/${evaluation.publicationPermission})؛ لا تكفي لربط مطلوب.`,
      claimKey: evaluation.claimKey,
      claimStatus: evaluation.status,
      publicationPermission: evaluation.publicationPermission,
      trustLevel: evaluation.level,
    }
  }
  const sourceish = evaluation.reasons.some((r) => /مصدر|دليل/.test(r))
  const reason = evaluation.reasons[0] ?? 'غير مؤهلة للاستخدام العام'
  return {
    code: sourceish ? 'SOURCE_NOT_TRUSTED' : 'CLAIM_NOT_AUTHORITATIVE',
    severity: 'blocker',
    messageAr: `المطالبة: ${evaluation.claimKey} — ${reason}`,
    claimKey: evaluation.claimKey,
    claimStatus: evaluation.status,
    publicationPermission: evaluation.publicationPermission,
    trustLevel: evaluation.level,
  }
}

function buildClaimDetails(evaluations: ClaimTrustEvaluation[]): ClaimReadinessDetail[] {
  return evaluations.map((e) => ({
    claimKey: e.claimKey,
    status: e.status,
    publicationPermission: e.publicationPermission,
    level: e.level,
    reasons: e.reasons,
    outcomeAr: claimTrustOutcomeAr(e.level),
  }))
}

export type BuildReadinessInput = {
  doc: Record<string, unknown>
  /** Document used for public-eligibility axis (prefer published row). Defaults to `doc`. */
  publicDoc?: Record<string, unknown>
  procedureErrors: string[]
  evidenceErrors: string[]
  claimGate: ClaimPublicationGateResult
  /** Live claim-trust for the public row; defaults to claimGate.ok. */
  publicLiveClaimTrustOk?: boolean | null
  publicContentMode?: PublicContentMode
  evaluationFailed?: boolean
  evaluatedAt?: string
}

/**
 * Pure composition of existing gate outputs into Admin readiness DTO.
 */
export function buildTransactionAdminReadiness(
  input: BuildReadinessInput,
): TransactionAdminReadiness {
  const doc = input.doc
  const publicDoc = input.publicDoc ?? doc
  const mode = input.publicContentMode ?? getPublicContentMode()
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString()
  const workflowIssues: ReadinessIssue[] = []
  const publicIssues: ReadinessIssue[] = []

  if (input.evaluationFailed) {
    const unknown: ReadinessIssue = {
      code: 'EVALUATION_FAILED',
      severity: 'blocker',
      messageAr: 'تعذّر إكمال فحص الجاهزية بثقة — راجع الروابط والادعاءات يدوياً.',
    }
    workflowIssues.push(unknown)
    publicIssues.push(unknown)
  }

  for (const msg of input.procedureErrors) {
    workflowIssues.push(mapProcedureError(msg))
  }
  for (const msg of input.evidenceErrors) {
    workflowIssues.push(mapEvidenceError(msg))
  }

  const gate = input.claimGate
  if (!gate.ok && gate.errors.length && gate.evaluations.length === 0) {
    // Fail-closed missing required bindings / empty gate
    const malformed = gate.errors.some((e) => /مكرر|مرجع ادعاء مفقود/.test(e))
    workflowIssues.push({
      code: malformed ? 'CLAIM_MALFORMED' : 'CLAIM_MISSING',
      severity: 'blocker',
      messageAr: gate.errors[0] ?? 'ربط الادعاءات غير مكتمل.',
    })
  }
  for (const evaluation of gate.evaluations) {
    if (evaluation.level !== 'AUTHORITATIVE') {
      workflowIssues.push(mapClaimEvaluation(evaluation))
    }
  }

  const state = asWorkflowState(doc.workflowState)
  const canApprove = Boolean(TRANSITION_MATRIX[state]?.approve)
  const canPublish = Boolean(TRANSITION_MATRIX[state]?.publish)
  const contentWorkflowOk =
    !input.evaluationFailed &&
    input.procedureErrors.length === 0 &&
    input.evidenceErrors.length === 0 &&
    gate.ok

  if (contentWorkflowOk) {
    if (state === 'approved') {
      try {
        const hash = hashCriticalContent(doc)
        if (!doc.approvedContentHash || hash !== doc.approvedContentHash) {
          workflowIssues.push({
            code: 'APPROVAL_HASH_MISMATCH',
            severity: 'blocker',
            messageAr: 'بصمة الاعتماد غير مطابقة — أعد الاعتماد قبل النشر.',
          })
        }
      } catch {
        workflowIssues.push({
          code: 'EVALUATION_FAILED',
          severity: 'blocker',
          messageAr: 'تعذّر التحقق من بصمة الاعتماد.',
        })
      }
    }
    if (!canApprove && !canPublish && state !== 'published') {
      workflowIssues.push({
        code: 'WORKFLOW_TRANSITION_BLOCKED',
        severity: 'warning',
        messageAr: `المحتوى يجتاز فحوصات الاعتماد/النشر، لكن الانتقال غير متاح من الحالة «${state}».`,
      })
    }
  }

  // --- Public eligibility (orthogonal to CMS workflow publish) ---
  const contentClass = publicDoc.contentClass
  const contentClassNoteAr = contentClassReadinessNoteAr(contentClass)
  const publicState = asWorkflowState(publicDoc.workflowState)

  if (contentClass === 'QA_TEST') {
    publicIssues.push({
      code: 'CONTENT_CLASS_QA_TEST',
      severity: 'blocker',
      messageAr: 'QA_TEST مخصص للاختبار ولا يظهر للعامة أبداً.',
    })
  } else if (contentClass === 'DEMO') {
    if (!isContentClassPubliclyAllowed('DEMO', mode)) {
      publicIssues.push({
        code: 'CONTENT_CLASS_DEMO_MODE',
        severity: 'blocker',
        messageAr:
          'تصنيف DEMO لا يظهر للعامة في وضع الإنتاج الحالي — يظهر فقط ضمن وضع العرض التجريبي المسموح.',
      })
    } else {
      publicIssues.push({
        code: 'CONTENT_CLASS_DEMO_MODE',
        severity: 'warning',
        messageAr: 'بيانات تجريبية — إن ظهرت للعامة تبقى موسومة كعرض تجريبي.',
      })
    }
  } else if (!isContentClass(contentClass) || !isContentClassPubliclyAllowed(contentClass, mode)) {
    publicIssues.push({
      code: 'CONTENT_CLASS_NOT_PUBLIC',
      severity: 'blocker',
      messageAr: 'تصنيف المحتوى غير مسموح على الواجهة العامة في الوضع الحالي.',
    })
  }

  if (publicDoc._status !== 'published') {
    publicIssues.push({
      code: 'NOT_CMS_PUBLISHED',
      severity: 'blocker',
      messageAr: 'المعاملة غير منشورة في نظام المحتوى (مسودة) — لا تظهر للعامة.',
    })
  }
  if (publicDoc.active !== true) {
    publicIssues.push({
      code: 'TRANSACTION_INACTIVE',
      severity: 'blocker',
      messageAr: 'المعاملة غير نشطة — لا تظهر للعامة حتى لو كانت منشورة.',
    })
  }
  if (publicDoc.markedOutdated === true) {
    publicIssues.push({
      code: 'MARKED_OUTDATED',
      severity: 'blocker',
      messageAr: 'المعاملة موسومة كقديمة — مخفية عن العامة.',
    })
  }
  if (publicState === 'archived') {
    publicIssues.push({
      code: 'WORKFLOW_ARCHIVED',
      severity: 'blocker',
      messageAr: 'المعاملة مؤرشفة — لا تظهر للعامة.',
    })
  }

  const storedOk = publicDoc.claimTrustOk === true
  const liveOk = input.evaluationFailed
    ? null
    : (input.publicLiveClaimTrustOk ?? gate.ok)

  if (!storedOk) {
    publicIssues.push({
      code: 'STORED_TRUST_FALSE',
      severity: 'blocker',
      messageAr:
        'مؤشر claimTrustOk المخزَّن غير مفعّل — الظهور العام محظور (المؤشر ليس سلطة الثقة النهائية).',
    })
  } else if (liveOk === false) {
    publicIssues.push({
      code: 'STORED_TRUST_STALE',
      severity: 'blocker',
      messageAr:
        'claimTrustOk=true قديم أو متعارض مع التقييم الحيّ — لا يُعتمد. أصلح الادعاءات/المصادر ثم أعد الاعتماد.',
    })
  }

  // Surface claim-level public blockers when live trust fails (even if stored false already listed)
  if (liveOk === false) {
    for (const evaluation of gate.evaluations) {
      if (evaluation.level !== 'AUTHORITATIVE') {
        publicIssues.push(mapClaimEvaluation(evaluation))
      }
    }
    if (!gate.ok && gate.evaluations.length === 0 && gate.errors[0]) {
      publicIssues.push({
        code: 'CLAIM_MISSING',
        severity: 'blocker',
        messageAr: gate.errors[0],
      })
    }
  }

  const workflowStatus = aggregateReadinessStatus(workflowIssues)
  const publicStatus = aggregateReadinessStatus(publicIssues)

  const actionItems = [...workflowIssues, ...publicIssues].filter(
    (i) => i.severity === 'blocker' || i.severity === 'warning',
  )
  // Dedupe by code+message+claimKey
  const seen = new Set<string>()
  const dedupedActionItems: ReadinessIssue[] = []
  for (const item of actionItems) {
    const key = `${item.code}|${item.claimKey ?? ''}|${item.messageAr}`
    if (seen.has(key)) continue
    seen.add(key)
    dedupedActionItems.push(item)
  }

  return {
    basedOn: 'last_saved',
    evaluatedAt,
    workflow: {
      status: workflowStatus,
      labelAr: readinessStatusLabelAr(workflowStatus),
      issues: workflowIssues,
    },
    publicEligibility: {
      status: publicStatus,
      labelAr: readinessStatusLabelAr(publicStatus),
      issues: publicIssues,
      contentClassNoteAr,
      publicContentMode: mode,
      storedClaimTrustOk: typeof publicDoc.claimTrustOk === 'boolean' ? publicDoc.claimTrustOk : null,
      liveClaimTrustOk: liveOk,
    },
    claimDetails: buildClaimDetails(gate.evaluations),
    actionItems: dedupedActionItems,
  }
}

/**
 * Load saved transaction draft and evaluate readiness with canonical gates.
 */
export async function evaluateTransactionAdminReadiness(
  payload: Payload,
  id: number | string,
  req?: PayloadRequest,
): Promise<TransactionAdminReadiness> {
  let doc: Record<string, unknown>
  try {
    doc = (await payload.findByID({
      collection: 'transactions',
      id,
      draft: true,
      depth: 0,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>
  } catch {
    return buildTransactionAdminReadiness({
      doc: {},
      procedureErrors: [],
      evidenceErrors: [],
      claimGate: { ok: false, errors: ['تعذّر تحميل المعاملة.'], evaluations: [] },
      evaluationFailed: true,
    })
  }

  try {
    const procedureErrors = validateProcedureData(doc as never, { publishing: true })
    const publicationSources = await resolvePublicationSources(
      payload,
      doc.sources as never,
      req,
    )
    const evidenceErrors = validateSourceEvidence(doc as never, publicationSources)
    const claimGraph = await resolveClaimGraph(payload, doc.claimBindings as ClaimBindingRow[], req)
    for (const [sid, src] of publicationSources) {
      claimGraph.sources.set(sid, src)
    }
    const claimGate = validateClaimBindingsForPublication(
      doc.claimBindings as ClaimBindingRow[],
      claimGraph.claims,
      claimGraph.sources,
      { transactionContentClass: doc.contentClass },
    )

    let publicDoc: Record<string, unknown> = doc
    try {
      publicDoc = (await payload.findByID({
        collection: 'transactions',
        id,
        draft: false,
        depth: 0,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>
    } catch {
      publicDoc = { ...doc, _status: 'draft' }
    }

    let publicLiveClaimTrustOk: boolean | null = claimGate.ok
    if (publicDoc !== doc && publicDoc._status === 'published') {
      const pubGraph = await resolveClaimGraph(
        payload,
        publicDoc.claimBindings as ClaimBindingRow[],
        req,
      )
      const pubSources = await resolvePublicationSources(
        payload,
        publicDoc.sources as never,
        req,
      )
      for (const [sid, src] of pubSources) pubGraph.sources.set(sid, src)
      publicLiveClaimTrustOk = validateClaimBindingsForPublication(
        publicDoc.claimBindings as ClaimBindingRow[],
        pubGraph.claims,
        pubGraph.sources,
        { transactionContentClass: publicDoc.contentClass },
      ).ok
    } else if (publicDoc._status !== 'published') {
      // Still compute live trust from draft bindings for stale messaging when stored true.
      publicLiveClaimTrustOk = claimGate.ok
    }

    return buildTransactionAdminReadiness({
      doc,
      publicDoc,
      procedureErrors,
      evidenceErrors,
      claimGate,
      publicLiveClaimTrustOk,
      publicContentMode: getPublicContentMode(),
    })
  } catch {
    return buildTransactionAdminReadiness({
      doc,
      procedureErrors: [],
      evidenceErrors: [],
      claimGate: { ok: false, errors: [], evaluations: [] },
      evaluationFailed: true,
    })
  }
}

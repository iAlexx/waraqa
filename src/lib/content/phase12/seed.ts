/**
 * Idempotent Phase 12 DEMO content seed via Payload APIs (no raw SQL).
 *
 * Governance model — the seed never forges trust:
 * - `context.seed` bypass is used only for taxonomy/document/source rows and for
 *   draft scaffolding of claims and transactions. It requires ALLOW_QA_FIXTURE=1
 *   (or a test runtime) in addition to WARAQA_ALLOW_PHASE12_SEED=1.
 * - Claims are written as DRAFT / INTERNAL_ONLY with no reviewedBy and no
 *   verifiedAt, then promoted by a real reviewer update without seed context so
 *   claim governance stamps the verification identity and timestamp itself.
 * - Transactions are written as drafts with workflowState=draft and claimTrustOk
 *   left false, then move through submitForReview → approve → publish via the
 *   workflow service as the reviewer. The workflow computes claimTrustOk and the
 *   approval fingerprint; the seed never sets them.
 */
import type { Payload } from 'payload'

import { allowSeedBypass } from '@/lib/qa-seed-guard'
import { runTransactionWorkflowAction } from '@/lib/workflow/transaction-workflow'

import {
  claimEvidenceRows,
  getPhase12Source,
  PHASE12_AGENCIES,
  PHASE12_CATEGORIES,
  PHASE12_CLAIMS,
  PHASE12_DOCUMENTS,
  PHASE12_PROCEDURES,
  PHASE12_SOURCES,
  type Phase12ClaimDef,
  type Phase12ProcedureDef,
} from './catalog'
import {
  PHASE12_CHECKED_AT,
  PHASE12_PROCEDURE_SLUGS,
  PHASE12_REVIEWER_EMAIL,
  PHASE12_SLUG_PREFIX,
} from './markers'

const seedCtx = { seed: true as const }

/** Reviewer identity passed to governance-enforcing writes (no seed context). */
export type Phase12ReviewerUser = {
  id: number
  role: 'reviewer'
  isActive: true
  collection: 'users'
}

/** Build the authenticated reviewer actor used for claim/workflow governance. */
export function asReviewerUser(id: number | string): Phase12ReviewerUser {
  return {
    id: Number(id),
    role: 'reviewer',
    isActive: true,
    collection: 'users',
  }
}

export type Phase12SeedResult = {
  reviewerId: number
  procedureSlugs: string[]
  sourceCount: number
  claimCount: number
  verifiedClaimCount: number
  publishedProcedureCount: number
  created: Record<string, number>
  updated: Record<string, number>
}

type SeedCounters = {
  created: Record<string, number>
  updated: Record<string, number>
}

function bump(bucket: Record<string, number>, key: string) {
  bucket[key] = (bucket[key] ?? 0) + 1
}

function relationId(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (typeof value === 'object' && 'id' in (value as object)) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return Number(id)
  }
  return null
}

async function findOneBySlug(
  payload: Payload,
  collection: string,
  slug: string,
): Promise<{ id: number } | null> {
  const res = await payload.find({
    collection: collection as 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = res.docs[0]
  return doc ? { id: Number(doc.id) } : null
}

async function findClaimByKey(
  payload: Payload,
  key: string,
): Promise<{ id: number } | null> {
  const res = await payload.find({
    collection: 'claims',
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = res.docs[0]
  return doc ? { id: Number(doc.id) } : null
}

/** Published DEMO helper rows (taxonomy, documents, sources) — seed bypass only. */
async function upsertBySlug(
  payload: Payload,
  collection: string,
  slug: string,
  data: Record<string, unknown>,
  counters: SeedCounters,
): Promise<number> {
  const existing = await findOneBySlug(payload, collection, slug)
  if (existing) {
    await payload.update({
      collection: collection as 'categories',
      id: existing.id,
      locale: 'ar',
      draft: false,
      data: data as never,
      overrideAccess: true,
      context: seedCtx,
    })
    bump(counters.updated, collection)
    return existing.id
  }
  const created = await payload.create({
    collection: collection as 'categories',
    locale: 'ar',
    draft: false,
    data: { ...data, slug } as never,
    overrideAccess: true,
    context: seedCtx,
  })
  bump(counters.created, collection)
  return Number(created.id)
}

async function ensureReviewer(
  payload: Payload,
  password: string,
  counters: SeedCounters,
): Promise<number> {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: PHASE12_REVIEWER_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: {
        role: 'reviewer',
        isActive: true,
        name: 'Phase 12 Content Reviewer',
        ...(password ? { password } : {}),
      },
      overrideAccess: true,
      context: seedCtx,
    })
    bump(counters.updated, 'users')
    return Number(existing.docs[0].id)
  }
  const created = await payload.create({
    collection: 'users',
    data: {
      email: PHASE12_REVIEWER_EMAIL,
      password,
      role: 'reviewer',
      isActive: true,
      name: 'Phase 12 Content Reviewer',
    },
    overrideAccess: true,
    context: seedCtx,
  })
  bump(counters.created, 'users')
  return Number(created.id)
}

function coveredSectionForClaim(key: string): string {
  if (key.includes('outcome')) return 'outcome'
  if (key.includes('duration')) return 'duration'
  if (key.includes('fee')) return 'fees'
  if (key.includes('_docs') || key.includes('docs_') || key.includes('attestation')) {
    return 'required_documents'
  }
  if (key.includes('channel')) return 'service_centers'
  if (key.includes('eligibility')) return 'eligibility'
  if (key.includes('attendance') || key.includes('proxy_submitter')) return 'steps'
  if (
    key.includes('validity') ||
    key.includes('instruction') ||
    key.includes('minor') ||
    key.includes('intake') ||
    key.includes('conditional') ||
    key.includes('supp') ||
    key.includes('cancel')
  ) {
    return 'other'
  }
  return 'summary'
}

function buildGuideFields(proc: Phase12ProcedureDef) {
  if (!proc.guide) {
    return { guideEnabled: false }
  }
  return {
    guideEnabled: true,
    questions: proc.guide.questions.map((q) => ({
      key: q.key,
      questionType: q.questionType,
      prompt: q.prompt,
      helpText: q.helpText ?? null,
      required: q.required,
      active: true,
      options: (q.options ?? []).map((o) => ({ key: o.key, label: o.label })),
    })),
    variants: proc.guide.variants.map((v) => ({
      key: v.key,
      title: v.title,
      explanation: v.explanation,
      active: true,
    })),
    notices: proc.notices.map((n) => ({
      key: n.key,
      title: n.title,
      body: n.body,
      severity: n.severity,
      active: true,
    })),
    decisionRules: proc.guide.decisionRules.map((r) => ({
      key: r.key,
      priority: r.priority,
      active: true,
      explanation: r.explanation,
      when: {
        all: (r.when.all ?? []).map((c) => ({
          questionKey: c.questionKey,
          operator: c.operator,
          value: c.value ?? '',
        })),
      },
      effects: r.effects.map((e) => ({ type: e.type, targetKey: e.targetKey })),
    })),
  }
}

/**
 * Draft claim scaffolding. Never carries a trusted status: promotion to
 * VERIFIED / PUBLIC is a separate reviewer action below.
 */
async function upsertClaimDraft(
  payload: Payload,
  claim: Phase12ClaimDef,
  sourceIds: Map<string, number>,
  counters: SeedCounters,
): Promise<number> {
  // Multi-source claims (e.g. CONFLICTED) carry one row per evidence entry;
  // single-source claims fall back to one SUPPORTS row for the primary source.
  const evidence = claimEvidenceRows(claim).map((row) => {
    const sourceId = sourceIds.get(row.sourceSlug)
    if (!sourceId) {
      throw new Error(`Missing evidence source ${row.sourceSlug} for claim ${claim.key}`)
    }
    return {
      source: sourceId,
      relationType: row.relationType,
      checkedAt: PHASE12_CHECKED_AT,
    }
  })

  const data = {
    key: claim.key,
    statement: claim.statement,
    status: 'DRAFT' as const,
    publicationPermission: 'INTERNAL_ONLY' as const,
    contentClass: 'DEMO' as const,
    reviewedBy: null,
    verifiedAt: null,
    evidence,
    active: true,
    _status: 'draft' as const,
  }

  const existing = await findClaimByKey(payload, claim.key)
  if (existing) {
    await payload.update({
      collection: 'claims',
      id: existing.id,
      locale: 'ar',
      draft: true,
      data: data as never,
      overrideAccess: true,
      context: seedCtx,
    })
    bump(counters.updated, 'claims')
    return existing.id
  }

  const created = await payload.create({
    collection: 'claims',
    locale: 'ar',
    draft: true,
    data: data as never,
    overrideAccess: true,
    context: seedCtx,
  })
  bump(counters.created, 'claims')
  return Number(created.id)
}

export type VerifyPhase12ClaimArgs = {
  claimId: number | string
  reviewerId: number | string
  status: Phase12ClaimDef['status']
  publicationPermission: Phase12ClaimDef['publicationPermission']
}

/**
 * Promote a scaffolded claim through real governance as the reviewer.
 *
 * No seed context: claim governance decides reviewedBy/verifiedAt (VERIFIED only)
 * and enforces reviewer-only publication permissions. The full document is resent
 * because claim validation runs against incoming data, not the stored row — so the
 * scaffolded evidence rows (one per source, including CONTRADICTS rows on
 * CONFLICTED claims) are read back and replayed verbatim.
 */
export async function verifyPhase12ClaimAsReviewer(
  payload: Payload,
  args: VerifyPhase12ClaimArgs,
): Promise<Record<string, unknown>> {
  const current = (await payload.findByID({
    collection: 'claims',
    id: args.claimId,
    locale: 'ar',
    depth: 0,
    draft: true,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>

  const evidence = (Array.isArray(current.evidence) ? current.evidence : []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      source: relationId(r.source),
      relationType: r.relationType,
      note: r.note ?? null,
      quoteOrLocator: r.quoteOrLocator ?? null,
      checkedAt: r.checkedAt ?? PHASE12_CHECKED_AT,
    }
  })

  if (evidence.length === 0) {
    throw new Error(`Claim ${String(current.key)} has no scaffolded evidence to promote.`)
  }

  const updated = await payload.update({
    collection: 'claims',
    id: args.claimId,
    locale: 'ar',
    draft: false,
    data: {
      key: current.key,
      statement: current.statement,
      evidence,
      contentClass: current.contentClass ?? 'DEMO',
      active: true,
      status: args.status,
      publicationPermission: args.publicationPermission,
      _status: 'published',
    } as never,
    user: asReviewerUser(args.reviewerId) as never,
    overrideAccess: false,
  })

  return updated as unknown as Record<string, unknown>
}

/** Draft transaction content. claimTrustOk and approval fields stay with the workflow. */
function buildTransactionContent(
  proc: Phase12ProcedureDef,
  deps: {
    categoryId: number
    agencyId: number
    sourceIds: Map<string, number>
    documentIds: Map<string, number>
    claimIds: Map<string, number>
    reviewedAt: string
  },
): Record<string, unknown> {
  const claimBindings = [
    ...proc.requiredClaimKeys.map((key) => ({
      claim: deps.claimIds.get(key),
      required: true,
      coveredSection: coveredSectionForClaim(key),
    })),
    ...proc.optionalClaimKeys.map((key) => ({
      claim: deps.claimIds.get(key),
      required: false,
      coveredSection: coveredSectionForClaim(key),
    })),
  ]

  for (const binding of claimBindings) {
    if (!binding.claim) throw new Error(`Missing claim binding on ${proc.slug}`)
  }

  const requiredDocuments = proc.documents.map((d) => {
    const docId = deps.documentIds.get(d.docSlug)
    if (!docId) throw new Error(`Missing document ${d.docSlug}`)
    return {
      key: d.key,
      document: docId,
      requirementType: d.requirementType,
      condition: d.condition,
      notes: d.notes,
      quantity: 1,
    }
  })

  // Source coverage comes from the catalog source definitions; `duration` is added
  // only when the procedure actually carries a published processing time, because
  // approve/publish refuses any populated section without source coverage.
  const buildSourceRow = (slug: string, primary: boolean) => {
    const sourceId = deps.sourceIds.get(slug)
    if (!sourceId) throw new Error(`Missing source ${slug} on ${proc.slug}`)
    const covered = new Set(getPhase12Source(slug)?.coveredSections ?? [])
    if (proc.estimatedDuration) covered.add('duration')
    return {
      source: sourceId,
      primary,
      coveredSections: [...covered],
      citationNote: primary ? proc.channelNote : null,
    }
  }

  const sources = [
    buildSourceRow(proc.sourceSlug, true),
    ...(proc.supportingSourceSlugs ?? []).map((slug) => buildSourceRow(slug, false)),
  ]

  return {
    title: proc.title,
    summary: proc.summary,
    aliases: proc.aliases.map((value) => ({ value })),
    category: deps.categoryId,
    agency: deps.agencyId,
    audiences: proc.audiences,
    eligibility: proc.eligibility,
    outcome: proc.outcome,
    requiredDocuments,
    steps: proc.steps,
    fees: [],
    // Absent whenever the opened source publishes no processing time.
    // Use `{}` (never `null`) so Payload group beforeValidate does not crash
    // when traversing nested number fields under a null siblingData object.
    estimatedDuration: proc.estimatedDuration
      ? {
          minimum: proc.estimatedDuration.minimum,
          maximum: proc.estimatedDuration.maximum,
          unit: proc.estimatedDuration.unit,
          note: proc.estimatedDuration.note,
        }
      : {},
    sources,
    claimBindings,
    lastReviewedAt: deps.reviewedAt,
    contentClass: 'DEMO',
    active: true,
    markedOutdated: false,
    internalNotes: `Phase 12 DEMO seed (${PHASE12_SLUG_PREFIX}). Reviewer: ${PHASE12_REVIEWER_EMAIL}. Checked ${PHASE12_CHECKED_AT}. Not government-certified.`,
    ...buildGuideFields(proc),
  }
}

/**
 * Return an existing procedure to an editable draft so the workflow can run again.
 * A published row is unpublished through the workflow (audited); anything else is
 * reset via seed bypass, which only ever clears approval — it never grants it.
 */
async function resetTransactionToDraft(
  payload: Payload,
  id: number,
  reviewer: Phase12ReviewerUser,
): Promise<void> {
  const current = (await payload.findByID({
    collection: 'transactions',
    id,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>

  if (current.workflowState === 'published') {
    await runTransactionWorkflowAction({
      payload,
      id,
      action: 'unpublish',
      user: reviewer,
    })
  } else if (current._status === 'published') {
    // Live row published without a matching workflow state — take it off the
    // public row before editing instead of leaving stale content visible.
    await payload.update({
      collection: 'transactions',
      id,
      draft: false,
      data: { _status: 'draft', workflowState: 'draft', claimTrustOk: false } as never,
      overrideAccess: true,
      context: seedCtx,
    })
  }
}

async function publishTransactionAsReviewer(
  payload: Payload,
  id: number,
  reviewer: Phase12ReviewerUser,
): Promise<void> {
  await runTransactionWorkflowAction({ payload, id, action: 'submitForReview', user: reviewer })
  await runTransactionWorkflowAction({ payload, id, action: 'approve', user: reviewer })
  await runTransactionWorkflowAction({ payload, id, action: 'publish', user: reviewer })
}

export type SeedPhase12Options = {
  reviewerPassword: string
  /** Source verification / editorial review timestamp. Not a claim verification stamp. */
  verifiedAt?: string
}

/**
 * Upsert all Phase 12 DEMO content. Safe to re-run; no duplicates by slug/key.
 */
export async function seedPhase12Content(
  payload: Payload,
  opts: SeedPhase12Options,
): Promise<Phase12SeedResult> {
  if (!opts.reviewerPassword || opts.reviewerPassword.length < 12) {
    throw new Error('Phase 12 seed requires reviewerPassword (min 12 chars); do not hardcode in git.')
  }
  assertPhase12SeedBypassActive()

  const counters: SeedCounters = { created: {}, updated: {} }

  const reviewerId = await ensureReviewer(payload, opts.reviewerPassword, counters)
  const reviewer = asReviewerUser(reviewerId)
  const checkedAt = opts.verifiedAt ?? `${PHASE12_CHECKED_AT}T12:00:00.000Z`

  const categoryIds = new Map<string, number>()
  for (const cat of PHASE12_CATEGORIES) {
    const id = await upsertBySlug(
      payload,
      'categories',
      cat.slug,
      {
        name: cat.name,
        description: cat.description,
        active: true,
        _status: 'published',
      },
      counters,
    )
    categoryIds.set(cat.slug, id)
  }

  const agencyIds = new Map<string, number>()
  for (const ag of PHASE12_AGENCIES) {
    const id = await upsertBySlug(
      payload,
      'agencies',
      ag.slug,
      {
        name: ag.name,
        shortName: ag.shortName,
        type: ag.type,
        description: ag.description,
        officialWebsite: 'officialWebsite' in ag ? ag.officialWebsite : undefined,
        active: true,
        _status: 'published',
      },
      counters,
    )
    agencyIds.set(ag.slug, id)
  }

  const sourceIds = new Map<string, number>()
  for (const src of PHASE12_SOURCES) {
    const agencyId = agencyIds.get(src.agencySlug)
    const id = await upsertBySlug(
      payload,
      'sources',
      src.slug,
      {
        title: src.title,
        sourceType: src.sourceType,
        officialUrl: src.officialUrl,
        agency: agencyId,
        verificationStatus: 'verified',
        lastVerifiedAt: checkedAt,
        active: true,
        contentClass: 'DEMO',
        notes: src.notes,
        _status: 'published',
      },
      counters,
    )
    sourceIds.set(src.slug, id)
  }

  const documentIds = new Map<string, number>()
  for (const doc of PHASE12_DOCUMENTS) {
    const id = await upsertBySlug(
      payload,
      'documents',
      doc.slug,
      {
        name: doc.name,
        documentType: doc.documentType,
        description: doc.description,
        active: true,
        _status: 'published',
      },
      counters,
    )
    documentIds.set(doc.slug, id)
  }

  // Claims: draft scaffolding first, then reviewer promotion through governance.
  const claimIds = new Map<string, number>()
  for (const claim of PHASE12_CLAIMS) {
    if (!sourceIds.has(claim.sourceSlug)) {
      throw new Error(`Missing source for claim ${claim.key}`)
    }
    claimIds.set(claim.key, await upsertClaimDraft(payload, claim, sourceIds, counters))
  }

  let verifiedClaimCount = 0
  for (const claim of PHASE12_CLAIMS) {
    const claimId = claimIds.get(claim.key)
    if (!claimId) throw new Error(`Missing claim id for ${claim.key}`)

    const promoted = await verifyPhase12ClaimAsReviewer(payload, {
      claimId,
      reviewerId,
      status: claim.status,
      publicationPermission: claim.publicationPermission,
    })

    if (promoted.status !== claim.status) {
      throw new Error(
        `Claim ${claim.key} did not reach ${claim.status} (got ${String(promoted.status)}).`,
      )
    }
    if (claim.status === 'VERIFIED') {
      if (relationId(promoted.reviewedBy) == null || !promoted.verifiedAt) {
        throw new Error(`Claim ${claim.key} is VERIFIED without a governance verification stamp.`)
      }
      verifiedClaimCount += 1
    }
  }

  // Transactions: draft content via seed, publication via the workflow service.
  let publishedProcedureCount = 0
  for (const proc of PHASE12_PROCEDURES) {
    const categoryId = categoryIds.get(proc.categorySlug)
    const agencyId = agencyIds.get(proc.agencySlug)
    if (!categoryId || !agencyId || !sourceIds.has(proc.sourceSlug)) {
      throw new Error(`Missing relations for procedure ${proc.slug}`)
    }

    const content = buildTransactionContent(proc, {
      categoryId,
      agencyId,
      sourceIds,
      documentIds,
      claimIds,
      reviewedAt: checkedAt,
    })

    const existing = await findOneBySlug(payload, 'transactions', proc.slug)
    let txId: number

    if (existing) {
      txId = existing.id
      await resetTransactionToDraft(payload, txId, reviewer)
      await payload.update({
        collection: 'transactions',
        id: txId,
        locale: 'ar',
        draft: true,
        data: {
          ...content,
          workflowState: 'draft',
          _status: 'draft',
          claimTrustOk: false,
          approvedAt: null,
          approvedBy: null,
          approvedContentHash: null,
          approvedVersionId: null,
          submittedForReviewAt: null,
          submittedForReviewBy: null,
          changeRequestedAt: null,
          changeRequestedBy: null,
          changeRequestComment: null,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        } as never,
        overrideAccess: true,
        context: seedCtx,
      })
      bump(counters.updated, 'transactions')
    } else {
      const created = await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          ...content,
          slug: proc.slug,
          workflowState: 'draft',
          _status: 'draft',
          claimTrustOk: false,
        } as never,
        overrideAccess: true,
        context: seedCtx,
      })
      txId = Number(created.id)
      bump(counters.created, 'transactions')
    }

    await publishTransactionAsReviewer(payload, txId, reviewer)
    publishedProcedureCount += 1
  }

  // Idempotency + governance check: exactly one published row per procedure slug.
  for (const slug of PHASE12_PROCEDURE_SLUGS) {
    const res = await payload.find({
      collection: 'transactions',
      where: { slug: { equals: slug } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    if (res.totalDocs !== 1) {
      throw new Error(`Expected unique transaction slug ${slug}, got ${res.totalDocs}`)
    }
    const tx = res.docs[0] as {
      contentClass?: string
      workflowState?: string
      _status?: string
      claimTrustOk?: boolean
    }
    if (tx.contentClass !== 'DEMO') {
      throw new Error(`Procedure ${slug} must remain contentClass=DEMO`)
    }
    if (tx.workflowState !== 'published' || tx._status !== 'published') {
      throw new Error(`Procedure ${slug} did not reach published state via the workflow.`)
    }
    if (tx.claimTrustOk !== true) {
      throw new Error(`Procedure ${slug} published without claim trust computed by the workflow.`)
    }
  }

  return {
    reviewerId,
    procedureSlugs: [...PHASE12_PROCEDURE_SLUGS],
    sourceCount: PHASE12_SOURCES.length,
    claimCount: PHASE12_CLAIMS.length,
    verifiedClaimCount,
    publishedProcedureCount,
    created: counters.created,
    updated: counters.updated,
  }
}

/** Runtime gate for the Phase 12 seed entry point. */
export function assertPhase12SeedEnvAllowed(): void {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Refusing Phase 12 seed: production runtime')
  }
  if (process.env.WARAQA_ALLOW_PHASE12_SEED !== '1') {
    throw new Error('Refusing Phase 12 seed: set WARAQA_ALLOW_PHASE12_SEED=1')
  }
}

/**
 * Draft scaffolding needs the QA fixture bypass, which WARAQA_ALLOW_PHASE12_SEED
 * no longer grants on its own. Fail loudly instead of silently writing content
 * that collection governance would reject halfway through.
 */
export function assertPhase12SeedBypassActive(): void {
  if (!allowSeedBypass({ context: seedCtx })) {
    throw new Error(
      'Refusing Phase 12 seed: draft scaffolding requires ALLOW_QA_FIXTURE=1 (non-production) alongside WARAQA_ALLOW_PHASE12_SEED=1.',
    )
  }
}

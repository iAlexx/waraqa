/**
 * Idempotent Phase 12 DEMO content seed via Payload APIs (no raw SQL).
 */
import type { Payload } from 'payload'

import {
  PHASE12_AGENCIES,
  PHASE12_CATEGORIES,
  PHASE12_CLAIMS,
  PHASE12_DOCUMENTS,
  PHASE12_PROCEDURES,
  PHASE12_SOURCES,
  type Phase12ProcedureDef,
} from './catalog'
import {
  PHASE12_CHECKED_AT,
  PHASE12_PROCEDURE_SLUGS,
  PHASE12_REVIEWER_EMAIL,
  PHASE12_SLUG_PREFIX,
} from './markers'

const seedCtx = { seed: true as const }

export type Phase12SeedResult = {
  reviewerId: number
  procedureSlugs: string[]
  sourceCount: number
  claimCount: number
  created: Record<string, number>
  updated: Record<string, number>
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

async function upsertBySlug(
  payload: Payload,
  collection: string,
  slug: string,
  data: Record<string, unknown>,
  counters: { created: Record<string, number>; updated: Record<string, number> },
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
    counters.updated[collection] = (counters.updated[collection] ?? 0) + 1
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
  counters.created[collection] = (counters.created[collection] ?? 0) + 1
  return Number(created.id)
}

async function ensureReviewer(
  payload: Payload,
  password: string,
  counters: { created: Record<string, number>; updated: Record<string, number> },
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
        name: 'Phase 12 Content Reviewer',
        ...(password ? { password } : {}),
      },
      overrideAccess: true,
      context: seedCtx,
    })
    counters.updated.users = (counters.updated.users ?? 0) + 1
    return Number(existing.docs[0].id)
  }
  const created = await payload.create({
    collection: 'users',
    data: {
      email: PHASE12_REVIEWER_EMAIL,
      password,
      role: 'reviewer',
      name: 'Phase 12 Content Reviewer',
    },
    overrideAccess: true,
    context: seedCtx,
  })
  counters.created.users = (counters.created.users ?? 0) + 1
  return Number(created.id)
}

function coveredSectionForClaim(key: string): string {
  if (key.includes('_docs') || key.includes('docs_')) return 'required_documents'
  if (key.includes('_channel') || key.includes('channel')) return 'service_centers'
  if (key.includes('eligibility')) return 'eligibility'
  if (key.includes('validity') || key.includes('instruction') || key.includes('minor')) return 'other'
  if (key.includes('fee')) return 'fees'
  if (key.includes('freshness') || key.includes('conditional') || key.includes('supplementary'))
    return 'other'
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

export type SeedPhase12Options = {
  reviewerPassword: string
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

  const counters = {
    created: {} as Record<string, number>,
    updated: {} as Record<string, number>,
  }

  const reviewerId = await ensureReviewer(payload, opts.reviewerPassword, counters)
  const verifiedAt = opts.verifiedAt ?? `${PHASE12_CHECKED_AT}T12:00:00.000Z`
  const reviewedAt = verifiedAt

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
        lastVerifiedAt: verifiedAt,
        active: true,
        contentClass: 'DEMO',
        notes: src.notes,
        _status: 'published',
      },
      counters,
    )
    sourceIds.set(src.slug, id)
  }

  const claimIds = new Map<string, number>()
  for (const claim of PHASE12_CLAIMS) {
    const sourceId = sourceIds.get(claim.sourceSlug)
    if (!sourceId) throw new Error(`Missing source for claim ${claim.key}`)

    const data = {
      key: claim.key,
      statement: claim.statement,
      status: claim.status,
      publicationPermission: claim.publicationPermission,
      contentClass: 'DEMO' as const,
      reviewedBy: claim.authoritativeCandidate ? reviewerId : reviewerId,
      verifiedAt: claim.status === 'VERIFIED' ? verifiedAt : null,
      evidence: [{ source: sourceId, relationType: 'SUPPORTS' as const }],
      active: true,
      _status: 'published' as const,
    }

    const existing = await findClaimByKey(payload, claim.key)
    if (existing) {
      await payload.update({
        collection: 'claims',
        id: existing.id,
        locale: 'ar',
        draft: false,
        data: data as never,
        overrideAccess: true,
        context: seedCtx,
      })
      counters.updated.claims = (counters.updated.claims ?? 0) + 1
      claimIds.set(claim.key, existing.id)
    } else {
      const created = await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: false,
        data: data as never,
        overrideAccess: true,
        context: seedCtx,
      })
      counters.created.claims = (counters.created.claims ?? 0) + 1
      claimIds.set(claim.key, Number(created.id))
    }
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

  for (const proc of PHASE12_PROCEDURES) {
    const categoryId = categoryIds.get(proc.categorySlug)
    const agencyId = agencyIds.get(proc.agencySlug)
    const sourceId = sourceIds.get(proc.sourceSlug)
    if (!categoryId || !agencyId || !sourceId) {
      throw new Error(`Missing relations for procedure ${proc.slug}`)
    }

    const claimBindings = [
      ...proc.requiredClaimKeys.map((key) => ({
        claim: claimIds.get(key),
        required: true,
        coveredSection: coveredSectionForClaim(key),
      })),
      ...proc.optionalClaimKeys.map((key) => ({
        claim: claimIds.get(key),
        required: false,
        coveredSection: coveredSectionForClaim(key),
      })),
    ]

    for (const b of claimBindings) {
      if (!b.claim) throw new Error(`Missing claim binding on ${proc.slug}`)
    }

    const requiredDocuments = proc.documents.map((d) => {
      const docId = documentIds.get(d.docSlug)
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

    const guideFields = buildGuideFields(proc)

    await upsertBySlug(
      payload,
      'transactions',
      proc.slug,
      {
        title: proc.title,
        summary: proc.summary,
        aliases: proc.aliases.map((value) => ({ value })),
        category: categoryId,
        agency: agencyId,
        audiences: proc.audiences,
        eligibility: proc.eligibility,
        outcome: proc.outcome,
        requiredDocuments,
        steps: proc.steps,
        fees: [],
        sources: [
          {
            source: sourceId,
            primary: true,
            coveredSections: [
              'summary',
              'eligibility',
              'required_documents',
              'steps',
              'service_centers',
              'other',
            ],
            citationNote: proc.channelNote,
          },
        ],
        claimBindings,
        claimTrustOk: true,
        lastReviewedAt: reviewedAt,
        contentClass: 'DEMO',
        active: true,
        workflowState: 'published',
        markedOutdated: false,
        _status: 'published',
        internalNotes: `Phase 12 DEMO seed (${PHASE12_SLUG_PREFIX}). Reviewer: ${PHASE12_REVIEWER_EMAIL}. Checked ${PHASE12_CHECKED_AT}. Not government-certified.`,
        ...guideFields,
      },
      counters,
    )
  }

  // Idempotency check: exactly one of each procedure slug
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
    const tx = res.docs[0] as { contentClass?: string }
    if (tx.contentClass !== 'DEMO') {
      throw new Error(`Procedure ${slug} must remain contentClass=DEMO`)
    }
  }

  return {
    reviewerId,
    procedureSlugs: [...PHASE12_PROCEDURE_SLUGS],
    sourceCount: PHASE12_SOURCES.length,
    claimCount: PHASE12_CLAIMS.length,
    created: counters.created,
    updated: counters.updated,
  }
}

export function assertPhase12SeedEnvAllowed(): void {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Refusing Phase 12 seed: production runtime')
  }
  if (process.env.WARAQA_ALLOW_PHASE12_SEED !== '1') {
    throw new Error('Refusing Phase 12 seed: set WARAQA_ALLOW_PHASE12_SEED=1')
  }
}

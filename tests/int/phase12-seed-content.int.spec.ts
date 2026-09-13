import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import {
  claimEvidenceRows,
  PHASE12_CLAIMS,
  PHASE12_PROCEDURES,
  PHASE12_SOURCES,
} from '@/lib/content/phase12/catalog'
import { seedPhase12Content } from '@/lib/content/phase12/seed'
import {
  PHASE12_PROCEDURE_SLUGS,
  PHASE12_REVIEWER_EMAIL,
  PHASE12_STABLE,
} from '@/lib/content/phase12/markers'
import { evaluateClaimTrust } from '@/lib/claims/claim-trust'
import { getPublicTransactionWhere } from '@/access'
import { getPubliclyAllowedContentClasses } from '@/lib/content-class/public-content-policy'

const REVIEWER_PASSWORD = 'Phase12-Int-Test-Reviewer!'

describe('Phase 12 seed content (integration)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
    await seedPhase12Content(payload, { reviewerPassword: REVIEWER_PASSWORD })
  }, 120_000)

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('upserts five unique DEMO procedures and is idempotent on rerun', async () => {
    const first = await seedPhase12Content(payload, { reviewerPassword: REVIEWER_PASSWORD })
    expect(first.procedureSlugs).toEqual([...PHASE12_PROCEDURE_SLUGS])
    expect(first.sourceCount).toBe(PHASE12_SOURCES.length)
    expect(first.claimCount).toBe(PHASE12_CLAIMS.length)

    const second = await seedPhase12Content(payload, { reviewerPassword: REVIEWER_PASSWORD })
    expect(second.procedureSlugs).toEqual(first.procedureSlugs)

    for (const slug of PHASE12_PROCEDURE_SLUGS) {
      const res = await payload.find({
        collection: 'transactions',
        where: { slug: { equals: slug } },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
      expect(res.totalDocs).toBe(1)
      const tx = res.docs[0] as {
        contentClass?: string
        fees?: unknown[]
        estimatedDuration?: { minimum?: number | null; unit?: string | null }
      }
      expect(tx.contentClass).toBe('DEMO')
      expect(tx.fees ?? []).toEqual([])

      const expected = PHASE12_PROCEDURES.find((p) => p.slug === slug)?.estimatedDuration
      if (!expected) {
        expect(tx.estimatedDuration?.unit ?? null).toBeNull()
      } else {
        expect(tx.estimatedDuration?.unit).toBe(expected.unit)
        expect(tx.estimatedDuration?.minimum ?? null).toBe(expected.minimum ?? null)
      }
    }
  }, 120_000)

  it('carries multi-source evidence on conflicted claims', async () => {
    const conflicted = PHASE12_CLAIMS.filter((c) => c.status === 'CONFLICTED')
    expect(conflicted.length).toBeGreaterThan(0)

    for (const claim of conflicted) {
      const res = await payload.find({
        collection: 'claims',
        where: { key: { equals: claim.key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const doc = res.docs[0] as { evidence?: Array<{ relationType?: string }> }
      const rows = doc.evidence ?? []
      expect(rows.length).toBe(claimEvidenceRows(claim).length)
      expect(rows.some((r) => r.relationType === 'SUPPORTS')).toBe(true)
      expect(rows.some((r) => r.relationType === 'CONTRADICTS')).toBe(true)
    }
  }, 120_000)

  it('keeps all Phase 12 sources DEMO with real HTTPS URLs and verification metadata', async () => {
    for (const src of PHASE12_SOURCES) {
      const res = await payload.find({
        collection: 'sources',
        where: { slug: { equals: src.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      expect(res.totalDocs).toBe(1)
      const doc = res.docs[0] as {
        contentClass?: string
        officialUrl?: string
        verificationStatus?: string
        lastVerifiedAt?: string
      }
      expect(doc.contentClass).toBe('DEMO')
      expect(doc.officialUrl?.startsWith('https://')).toBe(true)
      expect(doc.officialUrl?.includes('example.test')).toBe(false)
      expect(doc.verificationStatus).toBe('verified')
      expect(doc.lastVerifiedAt).toBeTruthy()
    }
  })

  it('required claim bindings evaluate AUTHORITATIVE for DEMO transactions', async () => {
    for (const proc of PHASE12_PROCEDURES) {
      const txRes = await payload.find({
        collection: 'transactions',
        where: { slug: { equals: proc.slug } },
        limit: 1,
        depth: 2,
        overrideAccess: true,
      })
      const tx = txRes.docs[0] as {
        contentClass?: string
        claimBindings?: Array<{ claim?: unknown; required?: boolean }>
      }
      expect(tx.contentClass).toBe('DEMO')

      const sourceMap = new Map()
      for (const src of PHASE12_SOURCES) {
        const s = await payload.find({
          collection: 'sources',
          where: { slug: { equals: src.slug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        const doc = s.docs[0]
        sourceMap.set(String(doc.id), doc)
      }

      for (const binding of tx.claimBindings ?? []) {
        if (!binding.required) continue
        const claimRef = binding.claim
        const claimId =
          typeof claimRef === 'object' && claimRef && 'id' in claimRef
            ? Number((claimRef as { id: number }).id)
            : Number(claimRef)
        const claim = await payload.findByID({
          collection: 'claims',
          id: claimId,
          depth: 1,
          overrideAccess: true,
        })
        const trust = evaluateClaimTrust(claim as never, sourceMap as never, {
          transactionContentClass: 'DEMO',
        })
        expect(trust.level, `${proc.slug} claim ${(claim as { key?: string }).key}`).toBe(
          'AUTHORITATIVE',
        )
        expect((claim as { contentClass?: string }).contentClass).toBe('DEMO')
        expect((claim as { contentClass?: string }).contentClass).not.toBe('QA_TEST')
        expect((claim as { contentClass?: string }).contentClass).not.toBe('PRODUCTION')
      }
    }
  }, 120_000)

  it('demo public mode can see Phase 12 procedures; production mode cannot', async () => {
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', 'demo')
    expect(getPubliclyAllowedContentClasses()).toContain('DEMO')
    const demoWhere = getPublicTransactionWhere()
    const demo = await payload.find({
      collection: 'transactions',
      where: {
        and: [demoWhere, { slug: { in: [...PHASE12_PROCEDURE_SLUGS] } }],
      },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    expect(demo.totalDocs).toBe(5)

    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', 'production')
    expect(getPubliclyAllowedContentClasses()).not.toContain('DEMO')
    const prodWhere = getPublicTransactionWhere()
    const prod = await payload.find({
      collection: 'transactions',
      where: {
        and: [prodWhere, { slug: { in: [...PHASE12_PROCEDURE_SLUGS] } }],
      },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    expect(prod.totalDocs).toBe(0)
  })

  it('stamps claim verification through reviewer governance, never on create', async () => {
    const reviewer = await payload.find({
      collection: 'users',
      where: { email: { equals: PHASE12_REVIEWER_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const reviewerId = Number(reviewer.docs[0]?.id)
    expect(reviewerId).toBeGreaterThan(0)

    for (const claim of PHASE12_CLAIMS) {
      const res = await payload.find({
        collection: 'claims',
        where: { key: { equals: claim.key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const doc = res.docs[0] as {
        status?: string
        publicationPermission?: string
        reviewedBy?: unknown
        verifiedAt?: string | null
        _status?: string
      }
      expect(doc.status).toBe(claim.status)
      expect(doc.publicationPermission).toBe(claim.publicationPermission)
      expect(doc._status).toBe('published')

      if (claim.status === 'VERIFIED') {
        expect(Number(doc.reviewedBy)).toBe(reviewerId)
        expect(doc.verifiedAt).toBeTruthy()
      } else {
        // Only VERIFIED earns a verification stamp — warnings must not carry one.
        expect(doc.verifiedAt ?? null).toBeNull()
      }
    }
  }, 120_000)

  it('publishes procedures through the workflow with an approval fingerprint and audit trail', async () => {
    for (const slug of PHASE12_PROCEDURE_SLUGS) {
      const res = await payload.find({
        collection: 'transactions',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      const tx = res.docs[0] as {
        id: number | string
        workflowState?: string
        _status?: string
        claimTrustOk?: boolean
        approvedBy?: unknown
        approvedContentHash?: string | null
        publishedBy?: unknown
      }
      expect(tx.workflowState).toBe('published')
      expect(tx._status).toBe('published')
      expect(tx.claimTrustOk).toBe(true)
      expect(tx.approvedContentHash).toBeTruthy()
      expect(tx.approvedBy).toBeTruthy()
      expect(tx.publishedBy).toBeTruthy()

      const audits = await payload.find({
        collection: 'audit-events',
        where: {
          and: [{ entityId: { equals: String(tx.id) } }, { action: { equals: 'published' } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      expect(audits.totalDocs).toBeGreaterThan(0)
    }
  }, 120_000)

  it('never seeds QA_TEST class for Phase 12 procedures', async () => {
    const qa = await payload.find({
      collection: 'transactions',
      where: {
        and: [{ slug: { contains: 'p12-demo-' } }, { contentClass: { equals: 'QA_TEST' } }],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    expect(qa.totalDocs).toBe(0)

    const prodClass = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { slug: { equals: PHASE12_STABLE.txSecondaryEquivalency } },
          { contentClass: { equals: 'PRODUCTION' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    expect(prodClass.totalDocs).toBe(0)
  })

  it('canonical P11-B readiness has no evidence/claim blockers for all five', async () => {
    vi.stubEnv('WARAQA_PUBLIC_CONTENT_MODE', 'demo')
    const { evaluateTransactionAdminReadiness } = await import(
      '@/lib/admin/transaction-readiness'
    )
    for (const slug of PHASE12_PROCEDURE_SLUGS) {
      const res = await payload.find({
        collection: 'transactions',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const id = res.docs[0]?.id
      expect(id).toBeTruthy()
      const readiness = await evaluateTransactionAdminReadiness(payload, id!)
      const evidenceClaimBlockers = readiness.actionItems.filter(
        (i) =>
          i.severity === 'blocker' &&
          (i.code === 'SOURCE_COVERAGE' ||
            i.code === 'SOURCE_NOT_TRUSTED' ||
            i.code === 'CLAIM_NOT_AUTHORITATIVE' ||
            i.code === 'CLAIM_MISSING' ||
            i.code === 'PROCEDURE_INCOMPLETE'),
      )
      expect(
        evidenceClaimBlockers.map((b) => `${b.code}:${b.messageAr}`),
        `${slug} evidence/claim blockers`,
      ).toEqual([])
      expect(readiness.workflow.status).toBe('READY')
      expect(readiness.publicEligibility.status).not.toBe('BLOCKED')
      expect(readiness.publicEligibility.liveClaimTrustOk).toBe(true)
    }
  }, 120_000)

  it('cannot forge VERIFIED/Public claim without canonical reviewer governance', async () => {
    const key = `claim_p12_forge_probe_${Date.now()}`
    const src = await payload.find({
      collection: 'sources',
      where: { slug: { equals: PHASE12_SOURCES[0]!.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const sourceId = Number(src.docs[0]!.id)

    const created = await payload.create({
      collection: 'claims',
      locale: 'ar',
      draft: true,
      data: {
        key,
        statement: 'ادعاء فحص تزوير — يجب ألا يصبح موثقاً عبر البذرة وحدها.',
        status: 'DRAFT',
        publicationPermission: 'INTERNAL_ONLY',
        contentClass: 'DEMO',
        evidence: [{ source: sourceId, relationType: 'SUPPORTS' }],
        active: true,
        reviewedBy: null,
        verifiedAt: null,
      },
      overrideAccess: true,
      context: { seed: true },
    })

    // Without seed context and without an authenticated reviewer, forging
    // VERIFIED/PUBLIC must be rejected by claim governance.
    await expect(
      payload.update({
        collection: 'claims',
        id: created.id,
        draft: false,
        data: {
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          reviewedBy: 1,
          verifiedAt: '1999-01-01T00:00:00.000Z',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()

    const stillDraft = (await payload.findByID({
      collection: 'claims',
      id: created.id,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })) as { status?: string; publicationPermission?: string; reviewedBy?: unknown; verifiedAt?: unknown }
    expect(stillDraft.status).toBe('DRAFT')
    expect(stillDraft.publicationPermission).toBe('INTERNAL_ONLY')
    expect(stillDraft.reviewedBy).toBeFalsy()
    expect(stillDraft.verifiedAt).toBeFalsy()

    // Phase 12 catalog claims must carry governance stamps from the dedicated
    // reviewer — never a forged fixed timestamp — proving the importer used
    // verifyPhase12ClaimAsReviewer rather than writing trusted fields under seed.
    const reviewer = await payload.find({
      collection: 'users',
      where: { email: { equals: PHASE12_REVIEWER_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const reviewerId = Number(reviewer.docs[0]?.id)
    expect(reviewerId).toBeGreaterThan(0)

    for (const claim of PHASE12_CLAIMS.filter((c) => c.status === 'VERIFIED')) {
      const res = await payload.find({
        collection: 'claims',
        where: { key: { equals: claim.key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const doc = res.docs[0] as { reviewedBy?: unknown; verifiedAt?: string }
      const stampedBy =
        typeof doc.reviewedBy === 'object' && doc.reviewedBy && 'id' in (doc.reviewedBy as object)
          ? Number((doc.reviewedBy as { id: number }).id)
          : Number(doc.reviewedBy)
      expect(stampedBy).toBe(reviewerId)
      expect(doc.verifiedAt).toBeTruthy()
      expect(doc.verifiedAt).not.toBe('1999-01-01T00:00:00.000Z')
    }

    await payload.delete({
      collection: 'claims',
      id: created.id,
      overrideAccess: true,
      context: { seed: true },
    })
  }, 120_000)
})

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { PHASE12_CLAIMS, PHASE12_PROCEDURES, PHASE12_SOURCES } from '@/lib/content/phase12/catalog'
import { seedPhase12Content } from '@/lib/content/phase12/seed'
import { PHASE12_PROCEDURE_SLUGS, PHASE12_STABLE } from '@/lib/content/phase12/markers'
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
        estimatedDuration?: { minimum?: number | null }
      }
      expect(tx.contentClass).toBe('DEMO')
      expect(tx.fees ?? []).toEqual([])
      expect(tx.estimatedDuration?.minimum ?? null).toBeNull()
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
})

/**
 * P0-05A Claim / Evidence foundation — fictional fixture data only.
 * Uses disposable `*_int` database via vitest.int setup.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  CLAIM_EVIDENCE_RELATIONS,
  CLAIM_PUBLICATION_PERMISSIONS,
} from '@/lib/claims/types'
import { migrations } from '../../migrations'

let payload: Payload
const created: Array<{ collection: string; id: number | string }> = []
const seedCtx = { seed: true as const }

async function track<T extends { id: number | string }>(collection: string, doc: T): Promise<T> {
  created.push({ collection, id: doc.id })
  return doc
}

async function cleanup() {
  const order = [
    'claims',
    'transactions',
    'sources',
    'documents',
    'service-centers',
    'agencies',
    'categories',
    'users',
  ]
  for (const collection of order) {
    for (const item of [...created].reverse()) {
      if (item.collection !== collection) continue
      try {
        await payload.delete({ collection: collection as 'users', id: item.id, overrideAccess: true })
      } catch {
        /* ignore */
      }
    }
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await cleanup()
})

describe('P0-05A claims foundation', () => {
  let _adminId: number
  let reviewerId: number
  let researcherId: number
  let inactiveId: number
  let sourceAId: number
  let sourceBId: number
  let categoryId: number
  let agencyId: number
  let txId: number

  it('K: migrations index includes claims foundation after phase 8', () => {
    const names = migrations.map((m) => m.name)
    expect(names).toContain('20260721_051000_p0_05a_claims_foundation')
    expect(names.indexOf('20260721_051000_p0_05a_claims_foundation')).toBeGreaterThan(
      names.indexOf('20260720_041000_phase_8_interactive_guide'),
    )
  })

  it('bootstraps users, sources, and a transaction shell', async () => {
    const stamp = Date.now()
    const admin = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `admin-p05a-${stamp}@example.test`,
          password: 'TestPassphrase-P05A-Admin!',
          role: 'admin',
          name: 'Admin P05A',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    _adminId = Number(admin.id)

    const reviewer = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `reviewer-p05a-${stamp}@example.test`,
          password: 'TestPassphrase-P05A-Reviewer!',
          role: 'reviewer',
          name: 'Reviewer P05A',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    reviewerId = Number(reviewer.id)

    const researcher = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `researcher-p05a-${stamp}@example.test`,
          password: 'TestPassphrase-P05A-Researcher!',
          role: 'researcher',
          name: 'Researcher P05A',
          isActive: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    researcherId = Number(researcher.id)

    const inactive = await track(
      'users',
      await payload.create({
        collection: 'users',
        data: {
          email: `inactive-p05a-${stamp}@example.test`,
          password: 'TestPassphrase-P05A-Inactive!',
          role: 'researcher',
          name: 'Inactive P05A',
          isActive: false,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    inactiveId = Number(inactive.id)

    const category = await track(
      'categories',
      await payload.create({
        collection: 'categories',
        locale: 'ar',
        draft: true,
        data: { name: 'تصنيف ادعاءات', slug: `cat-claims-${stamp}`, active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    categoryId = Number(category.id)

    const agency = await track(
      'agencies',
      await payload.create({
        collection: 'agencies',
        locale: 'ar',
        draft: true,
        data: {
          name: 'جهة ادعاءات تجريبية',
          slug: `agency-claims-${stamp}`,
          type: 'other',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    agencyId = Number(agency.id)

    const sourceA = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        draft: true,
        data: {
          title: 'مصدر داعم تجريبي',
          slug: `src-support-${stamp}`,
          sourceType: 'official_webpage',
          officialUrl: 'https://example.test/support',
          verificationStatus: 'verified',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceAId = Number(sourceA.id)

    const sourceB = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        draft: true,
        data: {
          title: 'مصدر مناقض تجريبي',
          slug: `src-contradict-${stamp}`,
          sourceType: 'circular',
          officialUrl: 'https://example.test/contradict',
          verificationStatus: 'verified',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    sourceBId = Number(sourceB.id)

    const tx = await track(
      'transactions',
      await payload.create({
        collection: 'transactions',
        locale: 'ar',
        draft: true,
        data: {
          title: 'معاملة ادعاءات تجريبية',
          slug: `tx-claims-${stamp}`,
          summary: 'ملخص تجريبي غير حكومي.',
          category: categoryId,
          agency: agencyId,
          active: true,
          sources: [{ source: sourceAId, primary: true, coveredSections: ['summary'] }],
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    txId = Number(tx.id)
    expect(txId).toBeGreaterThan(0)
  })

  it('A: creates a DRAFT claim', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `draft_claim_${stamp}`,
          statement: 'مسودة ادعاء تجريبي.',
          status: 'DRAFT',
          transaction: txId,
          active: true,
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )
    expect(claim.status).toBe('DRAFT')
    expect(claim.publicationPermission).toBe('INTERNAL_ONLY')
  })

  it('B: researcher can edit research content and evidence', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `research_edit_${stamp}`,
          statement: 'نص أولي',
          status: 'DRAFT',
          active: true,
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )
    const updated = await payload.update({
      collection: 'claims',
      id: claim.id,
      locale: 'ar',
      draft: true,
      data: {
        statement: 'نص محدّث مع دليل',
        status: 'NEEDS_REVIEW',
        evidence: [{ source: sourceAId, relationType: 'SUPPORTS', note: 'فحص باحث' }],
      },
      user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
      overrideAccess: false,
    })
    expect(updated.statement).toContain('محدّث')
    expect(updated.status).toBe('NEEDS_REVIEW')
    expect(updated.evidence).toHaveLength(1)
  })

  it('C/D/E/F: researcher cannot verify, forge metadata, or grant PUBLIC', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `gov_block_${stamp}`,
          statement: 'ادعاء للتحقق من الحوكمة',
          status: 'DRAFT',
          evidence: [{ source: sourceAId, relationType: 'SUPPORTS' }],
          active: true,
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )

    await expect(
      payload.update({
        collection: 'claims',
        id: claim.id,
        draft: true,
        data: {
          status: 'VERIFIED',
          reviewedBy: reviewerId,
          verifiedAt: '2020-01-01T00:00:00.000Z',
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.update({
        collection: 'claims',
        id: claim.id,
        draft: true,
        data: {
          status: 'DRAFT',
          reviewedBy: reviewerId,
          verifiedAt: '2020-01-01T00:00:00.000Z',
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    ).resolves.toBeTruthy()

    const afterForge = await payload.findByID({
      collection: 'claims',
      id: claim.id,
      draft: true,
      overrideAccess: true,
    })
    expect(afterForge.reviewedBy).toBeFalsy()
    expect(afterForge.verifiedAt).toBeFalsy()

    const pubAttempt = await payload.update({
      collection: 'claims',
      id: claim.id,
      draft: true,
      data: {
        statement: 'محاولة منح نشر عام',
        publicationPermission: 'PUBLIC',
      },
      user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
      overrideAccess: false,
    })
    // Field access strips PUBLIC for researchers; value must remain INTERNAL_ONLY.
    expect(pubAttempt.publicationPermission).toBe('INTERNAL_ONLY')
  })

  it('G/H: reviewer can verify; server stamps authenticated reviewer', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `to_verify_${stamp}`,
          statement: 'جاهز للتوثيق',
          status: 'NEEDS_REVIEW',
          evidence: [{ source: sourceAId, relationType: 'SUPPORTS' }],
          active: true,
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )

    const verified = await payload.update({
      collection: 'claims',
      id: claim.id,
      draft: true,
      data: {
        status: 'VERIFIED',
        // Client forgeries must be ignored in favor of authenticated reviewer + server time.
        reviewedBy: researcherId,
        verifiedAt: '1999-01-01T00:00:00.000Z',
        publicationPermission: 'PUBLIC',
      },
      user: { id: reviewerId, role: 'reviewer', isActive: true, collection: 'users' },
      overrideAccess: false,
    })
    expect(verified.status).toBe('VERIFIED')
    expect(verified.publicationPermission).toBe('PUBLIC')
    const reviewedById =
      typeof verified.reviewedBy === 'object' && verified.reviewedBy
        ? Number((verified.reviewedBy as { id: number }).id)
        : Number(verified.reviewedBy)
    expect(reviewedById).toBe(reviewerId)
    expect(verified.verifiedAt).toBeTruthy()
    expect(String(verified.verifiedAt)).not.toContain('1999')
  })

  it('I: inactive reviewer cannot verify', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `inactive_verify_${stamp}`,
          statement: 'محاولة توثيق من غير نشط',
          status: 'DRAFT',
          evidence: [{ source: sourceAId, relationType: 'SUPPORTS' }],
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )

    await expect(
      payload.update({
        collection: 'claims',
        id: claim.id,
        draft: true,
        data: { status: 'VERIFIED' },
        user: { id: inactiveId, role: 'reviewer', isActive: false, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('J: admin retains verification authority', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `admin_verify_${stamp}`,
          statement: 'توثيق مدير',
          status: 'DRAFT',
          evidence: [{ source: sourceAId, relationType: 'SUPPORTS' }],
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    const verified = await payload.update({
      collection: 'claims',
      id: claim.id,
      draft: true,
      data: { status: 'VERIFIED', publicationPermission: 'PUBLIC_WITH_WARNING' },
      user: { id: _adminId, role: 'admin', isActive: true, collection: 'users' },
      overrideAccess: false,
    })
    expect(verified.status).toBe('VERIFIED')
    const reviewedById =
      typeof verified.reviewedBy === 'object' && verified.reviewedBy
        ? Number((verified.reviewedBy as { id: number }).id)
        : Number(verified.reviewedBy)
    expect(reviewedById).toBe(_adminId)
  })

  it('duplicate claim keys fail', async () => {
    const stamp = Date.now()
    const key = `dup_key_${stamp}`
    await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: { key, statement: 'أول', status: 'DRAFT', active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    await expect(
      payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: { key, statement: 'ثانٍ', status: 'DRAFT', active: true },
        overrideAccess: true,
        context: seedCtx,
      }),
    ).rejects.toThrow()
  })

  it('seed: creates VERIFIED claim with multi-source evidence', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `verified_claim_${stamp}`,
          statement: 'شهادة الثانوية الأصلية مطلوبة (تجريبي).',
          status: 'VERIFIED',
          publicationPermission: 'PUBLIC',
          kind: 'requirement',
          reviewedBy: reviewerId,
          verifiedAt: '2026-07-01T12:00:00.000Z',
          evidence: [
            { source: sourceAId, relationType: 'SUPPORTS', quoteOrLocator: '§1' },
            { source: sourceBId, relationType: 'CONTEXT_ONLY', note: 'سياق إضافي' },
          ],
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(claim.status).toBe('VERIFIED')
    expect(claim.evidence).toHaveLength(2)
    expect(claim.evidence?.map((e) => e.relationType).sort()).toEqual(['CONTEXT_ONLY', 'SUPPORTS'])
  })

  it('C: represents UNKNOWN without fabricated evidence', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `unknown_fee_${stamp}`,
          statement: 'مبلغ الرسم غير معروف حالياً.',
          status: 'UNKNOWN',
          publicationPermission: 'INTERNAL_ONLY',
          kind: 'fee',
          evidence: [],
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(claim.status).toBe('UNKNOWN')
    expect(claim.evidence ?? []).toHaveLength(0)
  })

  it('D: represents CONFLICTED with SUPPORTS + CONTRADICTS', async () => {
    const stamp = Date.now()
    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `conflicted_${stamp}`,
          statement: 'المصادر تختلف على ترتيب التصديق (تجريبي).',
          status: 'CONFLICTED',
          publicationPermission: 'BLOCKED',
          evidence: [
            { source: sourceAId, relationType: 'SUPPORTS' },
            { source: sourceBId, relationType: 'CONTRADICTS' },
          ],
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(claim.status).toBe('CONFLICTED')
    expect(claim.evidence?.map((e) => e.relationType).sort()).toEqual(['CONTRADICTS', 'SUPPORTS'])
  })

  it('E: all publication permission states persist', async () => {
    const stamp = Date.now()
    for (const publicationPermission of CLAIM_PUBLICATION_PERMISSIONS) {
      const claim = await track(
        'claims',
        await payload.create({
          collection: 'claims',
          locale: 'ar',
          draft: true,
          data: {
            key: `pub_${publicationPermission.toLowerCase()}_${stamp}`,
            statement: `صلاحية ${publicationPermission}`,
            status: 'DRAFT',
            publicationPermission,
            active: true,
          },
          overrideAccess: true,
          context: seedCtx,
        }),
      )
      expect(claim.publicationPermission).toBe(publicationPermission)
    }
  })

  it('F: all evidence relation types persist', async () => {
    const stamp = Date.now()
    // Need distinct sources per relation (no duplicate source ids). Create extras.
    const extraSources: number[] = []
    for (let i = 0; i < CLAIM_EVIDENCE_RELATIONS.length; i++) {
      const src = await track(
        'sources',
        await payload.create({
          collection: 'sources',
          locale: 'ar',
          draft: true,
          data: {
            title: `مصدر علاقة ${i}`,
            slug: `src-rel-${stamp}-${i}`,
            sourceType: 'other',
            officialUrl: `https://example.test/rel-${i}`,
            verificationStatus: 'needs_review',
            active: true,
          },
          overrideAccess: true,
          context: seedCtx,
        }),
      )
      extraSources.push(Number(src.id))
    }

    const claim = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `all_relations_${stamp}`,
          statement: 'كل أنواع علاقات الأدلة.',
          status: 'DRAFT',
          publicationPermission: 'INTERNAL_ONLY',
          evidence: CLAIM_EVIDENCE_RELATIONS.map((relationType, i) => ({
            source: extraSources[i]!,
            relationType,
          })),
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(claim.evidence?.map((e) => e.relationType)).toEqual([...CLAIM_EVIDENCE_RELATIONS])
  })

  it('G/H: inactive users denied; active researcher can create drafts', async () => {
    const stamp = Date.now()
    await expect(
      payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `inactive_denied_${stamp}`,
          statement: 'يجب أن يُرفض.',
          status: 'DRAFT',
          publicationPermission: 'INTERNAL_ONLY',
          active: true,
        },
        user: { id: inactiveId, role: 'researcher', isActive: false, collection: 'users' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const ok = await track(
      'claims',
      await payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `active_researcher_${stamp}`,
          statement: 'باحث نشط يمكنه الإنشاء.',
          status: 'DRAFT',
          active: true,
        },
        user: { id: researcherId, role: 'researcher', isActive: true, collection: 'users' },
        overrideAccess: false,
      }),
    )
    expect(ok.id).toBeTruthy()
  })

  it('I: invalid status cannot be persisted', async () => {
    const stamp = Date.now()
    await expect(
      payload.create({
        collection: 'claims',
        locale: 'ar',
        draft: true,
        data: {
          key: `bad_enum_${stamp}`,
          statement: 'حالة غير صالحة',
          status: 'verified' as 'VERIFIED',
          publicationPermission: 'INTERNAL_ONLY',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    ).rejects.toThrow()
  })

  it('L: existing Sources collection still works', async () => {
    const stamp = Date.now()
    const source = await track(
      'sources',
      await payload.create({
        collection: 'sources',
        locale: 'ar',
        draft: true,
        data: {
          title: 'مصدر بعد الادعاءات',
          slug: `src-after-claims-${stamp}`,
          sourceType: 'law',
          officialUrl: 'https://example.test/after-claims',
          verificationStatus: 'needs_review',
          active: true,
        },
        overrideAccess: true,
        context: seedCtx,
      }),
    )
    expect(source.slug).toContain('src-after-claims')
  })

  it('anonymous cannot read claims (editorial-only foundation)', async () => {
    await expect(
      payload.find({
        collection: 'claims',
        overrideAccess: false,
        user: undefined,
        limit: 1,
      }),
    ).rejects.toThrow(/not allowed/i)
  })
})

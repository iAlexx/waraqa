import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  claimEvidenceRows,
  countClaimsByStatus,
  PHASE12_CLAIMS,
  PHASE12_DEFERRED_CANDIDATES,
  PHASE12_PROCEDURES,
  PHASE12_SOURCES,
} from '@/lib/content/phase12/catalog'
import { buildPhase12GuidePaths, runAllPhase12GuidePathAssertions } from '@/lib/content/phase12/guide-paths'
import {
  PHASE12_ALL_CLAIM_KEYS,
  PHASE12_GOLDEN_DEMO_SLUG,
  PHASE12_PROCEDURE_SLUGS,
  PHASE12_SOURCE_URLS,
} from '@/lib/content/phase12/markers'
import {
  assertPhase12SeedBypassActive,
  assertPhase12SeedEnvAllowed,
} from '@/lib/content/phase12/seed'
import { allowSeedBypass } from '@/lib/qa-seed-guard'
import { normalizeArabicSearchText } from '@/lib/search/normalize'

describe('Phase 12 catalog integrity', () => {
  it('defines exactly five DEMO procedures with unique slugs', () => {
    expect(PHASE12_PROCEDURES).toHaveLength(5)
    expect(PHASE12_PROCEDURE_SLUGS).toHaveLength(5)
    const slugs = PHASE12_PROCEDURES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(5)
    expect(slugs).toEqual([...PHASE12_PROCEDURE_SLUGS])
  })

  it('keeps Golden Demo as secondary equivalency', () => {
    const golden = PHASE12_PROCEDURES.find((p) => p.goldenDemo)
    expect(golden?.slug).toBe(PHASE12_GOLDEN_DEMO_SLUG)
    expect(golden?.title).toContain('معادلة')
  })

  it('never invents numeric fees', () => {
    for (const p of PHASE12_PROCEDURES) {
      expect(p.fees).toEqual([])
    }
  })

  it('only carries a duration when a duration claim backs it', () => {
    const durationClaimByProcedure: Record<string, string> = {
      'p12-demo-tx-poa-mission': 'claim_p12_poa_duration',
      'p12-demo-tx-marriage-mission': 'claim_p12_mar_duration',
      'p12-demo-tx-civil-extract-mission': 'claim_p12_civ_duration',
    }

    for (const p of PHASE12_PROCEDURES) {
      const expectedClaim = durationClaimByProcedure[p.slug]
      if (!expectedClaim) {
        expect(p.estimatedDuration, `${p.slug} must not invent a duration`).toBeUndefined()
        continue
      }
      const duration = p.estimatedDuration
      expect(duration, `${p.slug} duration`).toBeDefined()
      expect(['minutes', 'business_days', 'calendar_days']).toContain(duration!.unit)
      if (typeof duration!.minimum === 'number' && typeof duration!.maximum === 'number') {
        expect(duration!.maximum).toBeGreaterThanOrEqual(duration!.minimum)
      }
      expect(p.requiredClaimKeys).toContain(expectedClaim)
    }
  })

  it('binds an outcome claim on every procedure', () => {
    const outcomeClaims = new Set(
      PHASE12_CLAIMS.filter((c) => c.key.includes('outcome')).map((c) => c.key),
    )
    expect(outcomeClaims.size).toBe(5)
    for (const p of PHASE12_PROCEDURES) {
      expect(p.requiredClaimKeys.some((k) => outcomeClaims.has(k))).toBe(true)
    }
  })

  it('uses real HTTPS sources without placeholders', () => {
    expect(PHASE12_SOURCES).toHaveLength(7)
    for (const s of PHASE12_SOURCES) {
      expect(s.officialUrl.startsWith('https://')).toBe(true)
      expect(s.officialUrl.includes('example.test')).toBe(false)
      expect(s.officialUrl.includes('placeholder')).toBe(false)
    }
    expect(Object.values(PHASE12_SOURCE_URLS)).toHaveLength(7)
    expect(new Set(PHASE12_SOURCES.map((s) => s.officialUrl)).size).toBe(PHASE12_SOURCES.length)
  })

  it('has stable unique claim keys and records uncertainty statuses', () => {
    expect(PHASE12_CLAIMS.map((c) => c.key).sort()).toEqual([...PHASE12_ALL_CLAIM_KEYS].sort())
    expect(new Set(PHASE12_CLAIMS.map((c) => c.key)).size).toBe(PHASE12_CLAIMS.length)
    const byStatus = countClaimsByStatus()
    expect(byStatus.VERIFIED).toBeGreaterThan(0)
    expect(byStatus.NEEDS_OFFICIAL_CONFIRMATION).toBeGreaterThan(0)
    expect(byStatus.CONFLICTED ?? 0).toBeGreaterThan(0)
    expect(byStatus.UNKNOWN ?? 0).toBe(0)
    for (const c of PHASE12_CLAIMS) {
      if (c.authoritativeCandidate) {
        expect(c.status, c.key).toBe('VERIFIED')
        expect(c.publicationPermission, c.key).toBe('PUBLIC')
      } else {
        // Scoped or disputed facts stay publishable only behind a warning.
        expect(['VERIFIED', 'CONFLICTED', 'NEEDS_OFFICIAL_CONFIRMATION']).toContain(c.status)
        expect(c.publicationPermission, c.key).toBe('PUBLIC_WITH_WARNING')
      }
    }
  })

  it('gives every CONFLICTED claim both supporting and contradicting evidence', () => {
    const sourceSlugs = new Set(PHASE12_SOURCES.map((s) => s.slug))
    let conflicted = 0

    for (const c of PHASE12_CLAIMS) {
      const rows = claimEvidenceRows(c)
      expect(rows.length, c.key).toBeGreaterThan(0)
      expect(new Set(rows.map((r) => r.sourceSlug)).size, c.key).toBe(rows.length)
      for (const row of rows) expect(sourceSlugs.has(row.sourceSlug), row.sourceSlug).toBe(true)

      if (c.status !== 'CONFLICTED') continue
      conflicted += 1
      expect(rows.some((r) => r.relationType === 'SUPPORTS'), c.key).toBe(true)
      expect(rows.some((r) => r.relationType === 'CONTRADICTS'), c.key).toBe(true)
      expect(c.authoritativeCandidate, c.key).toBe(false)
    }

    expect(conflicted).toBeGreaterThan(0)
  })

  it('never binds a non-authoritative claim as required', () => {
    const byKey = new Map(PHASE12_CLAIMS.map((c) => [c.key, c]))
    for (const p of PHASE12_PROCEDURES) {
      for (const key of p.requiredClaimKeys) {
        expect(byKey.get(key)?.authoritativeCandidate, `${p.slug}/${key}`).toBe(true)
      }
      for (const key of p.optionalClaimKeys) {
        expect(byKey.get(key)?.authoritativeCandidate, `${p.slug}/${key}`).toBe(false)
      }
    }
  })

  it('drops the retired intake-freshness claim and notice', () => {
    expect(PHASE12_CLAIMS.some((c) => c.key.includes('intake_freshness'))).toBe(false)
    const golden = PHASE12_PROCEDURES.find((p) => p.goldenDemo)
    const noticeKeys = (golden?.notices ?? []).map((n) => n.key)
    expect(noticeKeys).not.toContain('notice_intake_freshness')
    expect(noticeKeys).toContain('notice_intake_year_round')
    expect(noticeKeys).toContain('notice_supplementary_conflict')
  })

  it('documents deferred candidates', () => {
    expect(PHASE12_DEFERRED_CANDIDATES.length).toBeGreaterThanOrEqual(4)
  })

  it('Arabic titles/aliases normalize for search matching', () => {
    for (const p of PHASE12_PROCEDURES) {
      const titleN = normalizeArabicSearchText(p.title)
      expect(titleN.length).toBeGreaterThan(3)
      expect(normalizeArabicSearchText(p.title)).toContain(titleN.slice(0, 4))
      if (p.aliases[0]) {
        expect(normalizeArabicSearchText(p.aliases[0]).length).toBeGreaterThan(2)
      }
    }
  })
})

describe('Phase 12 guide path matrix', () => {
  it('passes every meaningful path', () => {
    const { pathCount } = runAllPhase12GuidePathAssertions()
    expect(pathCount).toBe(buildPhase12GuidePaths().length)
    expect(pathCount).toBeGreaterThanOrEqual(20)
  })
})

describe('Phase 12 seed gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not unlock seed bypass with WARAQA_ALLOW_PHASE12_SEED alone', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_QA_FIXTURE', '')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '1')
    vi.stubEnv('VITEST', '')
    vi.stubEnv('VERCEL_ENV', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(false)
    expect(() => assertPhase12SeedBypassActive()).toThrow(/ALLOW_QA_FIXTURE=1/)
  })

  it('unlocks draft scaffolding only when both flags are set', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_QA_FIXTURE', '1')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '1')
    vi.stubEnv('VITEST', '')
    vi.stubEnv('VERCEL_ENV', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(true)
    expect(() => assertPhase12SeedEnvAllowed()).not.toThrow()
    expect(() => assertPhase12SeedBypassActive()).not.toThrow()
  })

  it('blocks Phase 12 seed flag in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_QA_FIXTURE', '1')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '1')
    vi.stubEnv('VERCEL_ENV', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(false)
    expect(() => assertPhase12SeedEnvAllowed()).toThrow(/production runtime/)
    expect(() => assertPhase12SeedBypassActive()).toThrow()
  })

  it('refuses when the Phase 12 flag is missing', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '')
    vi.stubEnv('VERCEL_ENV', '')
    expect(() => assertPhase12SeedEnvAllowed()).toThrow(/WARAQA_ALLOW_PHASE12_SEED=1/)
  })
})

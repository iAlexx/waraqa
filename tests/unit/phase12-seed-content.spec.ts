import { afterEach, describe, expect, it, vi } from 'vitest'

import {
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

  it('never invents numeric fees or durations', () => {
    for (const p of PHASE12_PROCEDURES) {
      expect(p.fees).toEqual([])
      expect('estimatedDuration' in p).toBe(false)
    }
  })

  it('uses real HTTPS sources without placeholders', () => {
    expect(PHASE12_SOURCES).toHaveLength(5)
    for (const s of PHASE12_SOURCES) {
      expect(s.officialUrl.startsWith('https://')).toBe(true)
      expect(s.officialUrl.includes('example.test')).toBe(false)
      expect(s.officialUrl.includes('placeholder')).toBe(false)
    }
    expect(Object.values(PHASE12_SOURCE_URLS)).toHaveLength(5)
  })

  it('has stable unique claim keys and records uncertainty statuses', () => {
    expect(PHASE12_CLAIMS.map((c) => c.key).sort()).toEqual([...PHASE12_ALL_CLAIM_KEYS].sort())
    expect(new Set(PHASE12_CLAIMS.map((c) => c.key)).size).toBe(PHASE12_CLAIMS.length)
    const byStatus = countClaimsByStatus()
    expect(byStatus.VERIFIED).toBeGreaterThan(0)
    expect(byStatus.NEEDS_OFFICIAL_CONFIRMATION).toBeGreaterThan(0)
    expect(byStatus.UNKNOWN ?? 0).toBe(0)
    expect(byStatus.CONFLICTED ?? 0).toBe(0)
    for (const c of PHASE12_CLAIMS) {
      if (c.authoritativeCandidate) {
        expect(c.status).toBe('VERIFIED')
        expect(c.publicationPermission).toBe('PUBLIC')
      } else {
        expect(c.status).toBe('NEEDS_OFFICIAL_CONFIRMATION')
        expect(c.publicationPermission).toBe('PUBLIC_WITH_WARNING')
      }
    }
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

  it('allows WARAQA_ALLOW_PHASE12_SEED=1 in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_QA_FIXTURE', '')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '1')
    vi.stubEnv('VERCEL_ENV', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(true)
  })

  it('blocks Phase 12 seed flag in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('WARAQA_ALLOW_PHASE12_SEED', '1')
    vi.stubEnv('VERCEL_ENV', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(false)
  })
})

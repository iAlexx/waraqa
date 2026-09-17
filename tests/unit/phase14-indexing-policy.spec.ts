import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPublicContentMode, setPublicContentModeForTests } from '@/lib/content-class/public-content-policy'
import * as validateGuide from '@/lib/guide/validate-guide'
import {
  publicRobotsMetadata,
  resolveIndexingDecision,
  shouldAllowPublicIndexing,
} from '@/lib/seo/indexing-policy'
import {
  buildSitemapEntriesFromTrustedDocs,
  SITEMAP_MAX_PAGES,
  SITEMAP_PAGE_SIZE,
  staticPublicSitemapPaths,
} from '@/lib/seo/public-sitemap'

afterEach(() => {
  setPublicContentModeForTests(null)
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Phase 14-A indexing policy (fail closed)', () => {
  it('allows indexing only when VERCEL_ENV=production and content mode=production', () => {
    setPublicContentModeForTests('production')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('WARAQA_FORCE_NOINDEX', '')
    expect(shouldAllowPublicIndexing()).toBe(true)
    expect(publicRobotsMetadata()).toEqual({ index: true, follow: true })
  })

  it('disallows indexing when VERCEL_ENV is missing', () => {
    const decision = resolveIndexingDecision({
      vercelEnv: '',
      contentMode: 'production',
      forceNoIndex: '',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('VERCEL_ENV=missing')
  })

  it('disallows indexing when VERCEL_ENV=development', () => {
    const decision = resolveIndexingDecision({
      vercelEnv: 'development',
      contentMode: 'production',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('VERCEL_ENV=development')
  })

  it('disallows indexing when VERCEL_ENV is unexpected', () => {
    const decision = resolveIndexingDecision({
      vercelEnv: 'staging',
      contentMode: 'production',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons.some((r) => r.startsWith('VERCEL_ENV=unexpected:'))).toBe(true)
  })

  it('disallows indexing on Vercel Preview', () => {
    setPublicContentModeForTests('production')
    const decision = resolveIndexingDecision({
      vercelEnv: 'preview',
      contentMode: getPublicContentMode(),
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('VERCEL_ENV=preview')
  })

  it('disallows indexing when content mode is demo even on production env', () => {
    const decision = resolveIndexingDecision({
      vercelEnv: 'production',
      contentMode: 'demo',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('WARAQA_PUBLIC_CONTENT_MODE=demo')
  })

  it('honors WARAQA_FORCE_NOINDEX kill-switch', () => {
    const decision = resolveIndexingDecision({
      vercelEnv: 'production',
      contentMode: 'production',
      forceNoIndex: '1',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('WARAQA_FORCE_NOINDEX=1')
  })
})

describe('Phase 14-A sitemap static shells', () => {
  it('exposes only public shells (no admin/preview/api)', () => {
    const paths = staticPublicSitemapPaths()
    expect(paths).toContain('/')
    expect(paths).toContain('/search')
    expect(paths.every((p) => !p.startsWith('/admin'))).toBe(true)
    expect(paths.every((p) => !p.startsWith('/preview'))).toBe(true)
    expect(paths.every((p) => !p.startsWith('/api'))).toBe(true)
  })

  it('defines bounded paging constants (no silent single-page truncation)', () => {
    expect(SITEMAP_PAGE_SIZE).toBeGreaterThan(0)
    expect(SITEMAP_MAX_PAGES).toBeGreaterThan(1)
    expect(SITEMAP_PAGE_SIZE * SITEMAP_MAX_PAGES).toBeGreaterThan(500)
  })
})

describe('Phase 14-A sitemap eligibility builder', () => {
  it('omits trust-revoked docs even when slug is present', () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(true)
    const entries = buildSitemapEntriesFromTrustedDocs(
      [{ slug: 'revoked-tx', updatedAt: '2026-01-01T00:00:00.000Z' }],
      [false],
    )
    expect(entries).toEqual([])
  })

  it('adds detail but not guide when guide is unavailable', () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(false)
    const entries = buildSitemapEntriesFromTrustedDocs(
      [{ slug: 'no-guide-tx', updatedAt: '2026-01-02T00:00:00.000Z' }],
      [true],
    )
    expect(entries.map((e) => e.path)).toEqual(['/transactions/no-guide-tx'])
  })

  it('adds detail and guide when trusted and guide available', () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(true)
    const entries = buildSitemapEntriesFromTrustedDocs([{ slug: 'with-guide-tx' }], [true])
    expect(entries.map((e) => e.path)).toEqual([
      '/transactions/with-guide-tx',
      '/transactions/with-guide-tx/guide',
    ])
  })

  it('skips empty slugs', () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(true)
    const entries = buildSitemapEntriesFromTrustedDocs([{ slug: '   ' }, { slug: '' }], [true, true])
    expect(entries).toEqual([])
  })
})

describe('Phase 14-A sitemap list when indexing disabled', () => {
  it('returns no URLs when content mode is demo', async () => {
    setPublicContentModeForTests('demo')
    vi.stubEnv('VERCEL_ENV', 'production')
    const { listPublicSitemapEntries } = await import('@/lib/seo/public-sitemap')
    await expect(listPublicSitemapEntries()).resolves.toEqual([])
  })

  it('returns no URLs when VERCEL_ENV is missing', async () => {
    setPublicContentModeForTests('production')
    vi.stubEnv('VERCEL_ENV', '')
    const { listPublicSitemapEntries } = await import('@/lib/seo/public-sitemap')
    await expect(listPublicSitemapEntries()).resolves.toEqual([])
  })
})

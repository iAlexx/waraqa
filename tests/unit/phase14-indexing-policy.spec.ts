import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPublicContentMode, setPublicContentModeForTests } from '@/lib/content-class/public-content-policy'
import {
  publicRobotsMetadata,
  resolveIndexingDecision,
  shouldAllowPublicIndexing,
} from '@/lib/seo/indexing-policy'
import { staticPublicSitemapPaths } from '@/lib/seo/public-sitemap'

afterEach(() => {
  setPublicContentModeForTests(null)
  vi.unstubAllEnvs()
})

describe('Phase 14-A indexing policy', () => {
  it('allows indexing only for production content mode outside Preview', () => {
    setPublicContentModeForTests('production')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('WARAQA_FORCE_NOINDEX', '')
    expect(shouldAllowPublicIndexing()).toBe(true)
    expect(publicRobotsMetadata()).toEqual({ index: true, follow: true })
  })

  it('disallows indexing when content mode is demo', () => {
    setPublicContentModeForTests('demo')
    vi.stubEnv('VERCEL_ENV', 'production')
    const decision = resolveIndexingDecision({
      vercelEnv: 'production',
      contentMode: 'demo',
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('WARAQA_PUBLIC_CONTENT_MODE=demo')
  })

  it('disallows indexing on Vercel Preview regardless of content mode', () => {
    setPublicContentModeForTests('production')
    const decision = resolveIndexingDecision({
      vercelEnv: 'preview',
      contentMode: getPublicContentMode(),
    })
    expect(decision.allowIndexing).toBe(false)
    expect(decision.reasons).toContain('VERCEL_ENV=preview')
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
})

describe('Phase 14-A sitemap eligibility', () => {
  it('returns no URLs when indexing is disabled (demo mode)', async () => {
    setPublicContentModeForTests('demo')
    vi.stubEnv('VERCEL_ENV', 'production')
    const { listPublicSitemapEntries } = await import('@/lib/seo/public-sitemap')
    await expect(listPublicSitemapEntries()).resolves.toEqual([])
  })
})

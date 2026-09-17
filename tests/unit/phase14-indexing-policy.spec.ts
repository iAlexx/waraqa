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
  SitemapPaginationCeilingError,
  SITEMAP_MAX_PAGES,
  SITEMAP_PAGE_SIZE,
  staticPublicSitemapPaths,
  walkTrustedTransactionPages,
} from '@/lib/seo/public-sitemap'
import {
  assertProductionRobotsAllowsCrawl,
  hasWildcardFullSiteDisallow,
  htmlSignalsNoindex,
  isFullSiteDisallowPath,
  parseRobotsTxt,
} from '@/lib/seo/robots-parse'

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

  it('defines bounded paging constants (capacity > 500)', () => {
    expect(SITEMAP_PAGE_SIZE).toBe(100)
    expect(SITEMAP_MAX_PAGES).toBe(50)
    expect(SITEMAP_PAGE_SIZE * SITEMAP_MAX_PAGES).toBe(5000)
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

describe('Phase 14-A sitemap pagination walk (mocked pages)', () => {
  it('walks multiple pages and aggregates trusted entries', async () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(false)
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 1) {
        return {
          docs: [{ slug: 'p1-a' }, { slug: 'p1-b' }],
          hasNextPage: true,
        }
      }
      if (page === 2) {
        return {
          docs: [{ slug: 'p2-a' }],
          hasNextPage: false,
        }
      }
      throw new Error(`unexpected page ${page}`)
    })
    const evaluateTrust = vi.fn(async (docs: Array<Record<string, unknown>>) =>
      docs.map(() => true),
    )

    const entries = await walkTrustedTransactionPages({
      pageSize: 2,
      maxPages: 50,
      fetchPage,
      evaluateTrust,
    })

    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(evaluateTrust).toHaveBeenCalledTimes(2)
    expect(entries.map((e) => e.path)).toEqual([
      '/transactions/p1-a',
      '/transactions/p1-b',
      '/transactions/p2-a',
    ])
  })

  it('throws SitemapPaginationCeilingError when page max still hasNextPage', async () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(false)
    const maxPages = 3
    const pageSize = 2
    const fetchPage = vi.fn(async (page: number) => ({
      docs: [{ slug: `page-${page}-item` }],
      hasNextPage: true, // still more after every page including the last allowed
    }))
    const evaluateTrust = vi.fn(async (docs: Array<Record<string, unknown>>) =>
      docs.map(() => true),
    )

    await expect(
      walkTrustedTransactionPages({
        pageSize,
        maxPages,
        fetchPage,
        evaluateTrust,
      }),
    ).rejects.toBeInstanceOf(SitemapPaginationCeilingError)

    expect(fetchPage).toHaveBeenCalledTimes(maxPages)
    expect(fetchPage).toHaveBeenLastCalledWith(maxPages)
  })

  it('ceiling error exposes aggregate diagnostics without slugs', async () => {
    const fetchPage = vi.fn(async () => ({
      docs: [{ slug: 'secret-should-not-appear-in-error' }],
      hasNextPage: true,
    }))
    await expect(
      walkTrustedTransactionPages({
        pageSize: SITEMAP_PAGE_SIZE,
        maxPages: 1,
        fetchPage,
        evaluateTrust: async (docs) => docs.map(() => true),
      }),
    ).rejects.toMatchObject({
      name: 'SitemapPaginationCeilingError',
      pagesFetched: 1,
      pageSize: SITEMAP_PAGE_SIZE,
      hasMore: true,
    })
  })

  it('production-scale ceiling: page 50 with hasNextPage still true fails closed', async () => {
    vi.spyOn(validateGuide, 'isPublicGuideAvailable').mockReturnValue(false)
    let calls = 0
    const fetchPage = vi.fn(async (page: number) => {
      calls += 1
      expect(page).toBe(calls)
      return {
        docs: Array.from({ length: SITEMAP_PAGE_SIZE }, (_, i) => ({
          slug: `overflow-p${page}-${i}`,
        })),
        hasNextPage: true,
      }
    })

    await expect(
      walkTrustedTransactionPages({
        pageSize: SITEMAP_PAGE_SIZE,
        maxPages: SITEMAP_MAX_PAGES,
        fetchPage,
        evaluateTrust: async (docs) => docs.map(() => true),
      }),
    ).rejects.toBeInstanceOf(SitemapPaginationCeilingError)

    expect(fetchPage).toHaveBeenCalledTimes(SITEMAP_MAX_PAGES)
    expect(fetchPage).toHaveBeenCalledWith(50)
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

describe('Phase 14-A robots.txt / HTML noindex parsers', () => {
  it('parses exact Disallow: / under wildcard and rejects /admin partial', () => {
    const full = parseRobotsTxt(`User-agent: *\nDisallow: /\n`)
    expect(hasWildcardFullSiteDisallow(full)).toBe(true)

    const partial = parseRobotsTxt(`User-agent: *\nDisallow: /admin\nDisallow: /preview/\n`)
    expect(hasWildcardFullSiteDisallow(partial)).toBe(false)
    expect(isFullSiteDisallowPath('/admin')).toBe(false)
    expect(isFullSiteDisallowPath('/')).toBe(true)
  })

  it('does not treat Allow-only or empty disallow as full-site block', () => {
    const allow = parseRobotsTxt(`User-agent: *\nAllow: /\nDisallow:\n`)
    expect(hasWildcardFullSiteDisallow(allow)).toBe(false)
  })

  it('PRODUCTION robots expectation rejects full-site disallow', () => {
    expect(
      assertProductionRobotsAllowsCrawl(parseRobotsTxt(`User-agent: *\nDisallow: /\n`)),
    ).toBe(false)
    expect(
      assertProductionRobotsAllowsCrawl(
        parseRobotsTxt(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n`),
      ),
    ).toBe(true)
  })

  it('detects HTML noindex meta and rejects missing noindex', () => {
    expect(
      htmlSignalsNoindex(
        '<html><head><meta name="robots" content="noindex, nofollow"/></head></html>',
      ),
    ).toBe(true)
    expect(
      htmlSignalsNoindex(
        '<html><head><meta content="noindex" name="robots" /></head></html>',
      ),
    ).toBe(true)
    expect(
      htmlSignalsNoindex(
        '<html><head><meta name="robots" content="index, follow"/></head></html>',
      ),
    ).toBe(false)
    expect(htmlSignalsNoindex('<html><head><title>ورقة</title></head></html>')).toBe(false)
  })
})

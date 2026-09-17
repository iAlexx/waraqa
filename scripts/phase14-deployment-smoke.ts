/**
 * Non-destructive deployment smoke checks (Phase 14-A).
 *
 * Usage:
 *   WARAQA_SMOKE_BASE_URL=https://waraqa-eta.vercel.app pnpm smoke:deploy
 *   WARAQA_SMOKE_EXPECT_DEMO=1   # when the target intentionally serves DEMO public content
 *
 * Never writes to the database. Never embeds credentials.
 * Does not assert admin login success (owner tests that manually).
 *
 * Requires explicit WARAQA_SMOKE_BASE_URL (never falls back to .env.local).
 */
import {
  assertProductionRobotsAllowsCrawl,
  hasWildcardFullSiteDisallow,
  htmlSignalsNoindex,
  parseRobotsTxt,
} from '../src/lib/seo/robots-parse.ts'

type Check = { name: string; ok: boolean; detail?: string }

function parseSmokeBaseUrl(raw: string | undefined): string | null {
  const value = (raw || '').trim().replace(/\/$/, '')
  if (!value) return null
  try {
    const u = new URL(value)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname) return null
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

const base = parseSmokeBaseUrl(process.env.WARAQA_SMOKE_BASE_URL)
const expectDemo = (process.env.WARAQA_SMOKE_EXPECT_DEMO || '').trim() === '1'

if (!base) {
  console.error(
    'ABORT: set an explicit valid WARAQA_SMOKE_BASE_URL (https://… origin). Refusing .env.local fallback.',
  )
  process.exit(2)
}

async function get(path: string): Promise<{ status: number; text: string; headers: Headers }> {
  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    redirect: 'follow',
    headers: { Accept: 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8' },
  })
  const text = await res.text()
  return { status: res.status, text, headers: res.headers }
}

const checks: Check[] = []

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`WARAQA deploy smoke (read-only) against ${base}`)
  console.log(`expectDemo=${expectDemo} (No credentials; no DB writes.)`)

  let homeHtml = ''

  {
    const home = await get('/')
    homeHtml = home.text
    record('homepage HTTP 200', home.status === 200, `status=${home.status}`)
    record(
      'homepage Arabic RTL / independence signal',
      home.status === 200 &&
        (home.text.includes('dir="rtl"') || home.text.includes("dir='rtl'")) &&
        (home.text.includes('مستقل') ||
          home.text.includes('ليست موقعاً حكوميا') ||
          home.text.includes('ورقة')),
    )
    record(
      'security header x-content-type-options',
      home.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff',
      home.headers.get('x-content-type-options') || 'missing',
    )
  }

  {
    const search = await get('/search?q=%D9%85%D8%B9%D8%A7%D8%AF%D9%84%D8%A9')
    record('Arabic search HTTP 200', search.status === 200, `status=${search.status}`)
  }

  {
    const golden = await get('/transactions/p12-demo-tx-secondary-equivalency')
    if (expectDemo) {
      record(
        'Golden Demo detail HTTP 200 (DEMO mode expected)',
        golden.status === 200,
        `status=${golden.status}`,
      )
      if (golden.status === 200) {
        record(
          'DEMO label visible on Golden Demo detail',
          golden.text.includes('بيانات تجريبية') || golden.text.includes('تجريب'),
        )
      }
    } else {
      record(
        'Golden Demo detail HTTP 404 (production mode — DEMO not public)',
        golden.status === 404,
        `status=${golden.status}`,
      )
    }
  }

  {
    const health = await get('/api/health')
    if (health.status === 503) {
      record(
        'health endpoint operational (HTTP 200)',
        false,
        'HTTP 503 — database/runtime unhealthy; diagnose separately (not a deploy smoke PASS)',
      )
    } else {
      record('health endpoint operational (HTTP 200)', health.status === 200, `status=${health.status}`)
    }
    if (health.status === 200) {
      const safe =
        !/postgres(ql)?:\/\//i.test(health.text) &&
        !/"password"/i.test(health.text) &&
        !/PAYLOAD_SECRET/i.test(health.text)
      record('health body does not leak secrets', safe)
    }
  }

  {
    const robots = await get('/robots.txt')
    record('robots.txt HTTP 200', robots.status === 200, `status=${robots.status}`)
    if (robots.status === 200) {
      const groups = parseRobotsTxt(robots.text)
      if (expectDemo) {
        record(
          'robots.txt wildcard User-agent has exact Disallow: /',
          hasWildcardFullSiteDisallow(groups),
          'rejects Disallow: /admin-style partials',
        )
        record(
          'homepage HTML robots meta signals noindex (DEMO expectation)',
          htmlSignalsNoindex(homeHtml),
        )
      } else {
        record(
          'robots.txt does not full-site Disallow under wildcard (PRODUCTION expectation)',
          assertProductionRobotsAllowsCrawl(groups),
        )
        record(
          'homepage HTML does not signal noindex (PRODUCTION expectation)',
          !htmlSignalsNoindex(homeHtml),
        )
      }
    }
  }

  {
    const sitemap = await get('/sitemap.xml')
    record('sitemap.xml HTTP 200', sitemap.status === 200, `status=${sitemap.status}`)
    if (sitemap.status === 200) {
      record(
        'sitemap excludes /admin and /preview',
        !sitemap.text.includes('/admin') && !sitemap.text.includes('/preview/'),
      )
      if (expectDemo) {
        record(
          'sitemap has no DEMO procedure URLs under DEMO noindex policy',
          !sitemap.text.includes('/transactions/p12-demo-'),
        )
      }
    }
  }

  {
    const admin = await get('/admin')
    record(
      'admin panel responds (auth UI only; no credential test)',
      admin.status === 200 || admin.status === 302 || admin.status === 307 || admin.status === 308,
      `status=${admin.status}`,
    )
  }

  {
    const missing = await get('/transactions/does-not-exist-phase14-smoke')
    record('unknown transaction HTTP 404', missing.status === 404, `status=${missing.status}`)
  }

  const failed = checks.filter((c) => !c.ok)
  console.log('')
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} passed`)
  if (failed.length) {
    console.error('FAILED checks:')
    for (const f of failed) console.error(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`)
    process.exit(1)
  }
  console.log('SMOKE_OK')
}

main().catch((err) => {
  console.error('SMOKE_ERROR', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})

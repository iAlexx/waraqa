/**
 * Non-destructive deployment smoke checks (Phase 14-A).
 *
 * Usage:
 *   WARAQA_SMOKE_BASE_URL=https://waraqa-eta.vercel.app pnpm smoke:deploy
 *
 * Never writes to the database. Never embeds credentials.
 * Does not assert admin login success (owner tests that manually).
 */
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

type Check = { name: string; ok: boolean; detail?: string }

const base = (process.env.WARAQA_SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || '')
  .trim()
  .replace(/\/$/, '')

if (!base) {
  console.error('ABORT: set WARAQA_SMOKE_BASE_URL (or NEXT_PUBLIC_SERVER_URL) to the site origin.')
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

function includesAll(hay: string, needles: string[]): boolean {
  return needles.every((n) => hay.includes(n))
}

const checks: Check[] = []

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`WARAQA deploy smoke (read-only) against ${base}`)
  console.log('(No credentials; no DB writes.)')

  {
    const home = await get('/')
    record('homepage HTTP 200', home.status === 200, `status=${home.status}`)
    record(
      'homepage Arabic RTL / independence signal',
      home.status === 200 &&
        (home.text.includes('dir="rtl"') || home.text.includes("dir='rtl'")) &&
        (home.text.includes('مستقل') || home.text.includes('ليست موقعاً حكوميا') || home.text.includes('ورقة')),
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
    // In production content mode this may 404 — that is still a valid isolation outcome.
    const okStatus = golden.status === 200 || golden.status === 404
    record('Golden Demo detail reachable or correctly hidden', okStatus, `status=${golden.status}`)
    if (golden.status === 200) {
      record(
        'DEMO label visible when DEMO procedure is public',
        includesAll(golden.text, ['بيانات تجريبية']) || golden.text.includes('تجريب'),
      )
    }
  }

  {
    const health = await get('/api/health')
    record('health endpoint responds', health.status === 200 || health.status === 503, `status=${health.status}`)
    if (health.status === 200 || health.status === 503) {
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
    record('robots.txt is non-empty', robots.status === 200 && robots.text.trim().length > 0)
  }

  {
    const sitemap = await get('/sitemap.xml')
    record('sitemap.xml HTTP 200', sitemap.status === 200, `status=${sitemap.status}`)
    if (sitemap.status === 200) {
      record(
        'sitemap excludes /admin and /preview',
        !sitemap.text.includes('/admin') && !sitemap.text.includes('/preview/'),
      )
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
    record('unknown transaction does not 500', missing.status === 404 || missing.status === 200, `status=${missing.status}`)
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

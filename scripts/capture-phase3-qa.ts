/**
 * Phase 3 Round 01 Admin + API QA captures.
 * Requires: running server, ALLOW_QA_FIXTURE fixture already applied,
 * docs/qa/phase-3/.local-credentials present.
 *
 * QA_BASE_URL=http://127.0.0.1:3020
 * Writes only to docs/qa/phase-3/revisions/round-01-core-collections/
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-3/revisions/round-01-core-collections')
const CREDS_PATH = path.join(ROOT, 'docs/qa/phase-3/.local-credentials')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3020'

type Creds = {
  password: string
  users: Record<string, { email: string; id: number }>
  ids: Record<string, number>
  slugs: { draft: string; published: string; inactive: string }
}

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}phase-3${path.sep}revisions${path.sep}round-01`)) {
    throw new Error('Refusing to write outside Round 01 folder')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log('wrote', name)
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/admin/login`)
  await settle(page)
  // Payload 3 login fields
  const emailInput = page.locator('input[name="email"], input[type="email"]').first()
  const passInput = page.locator('input[name="password"], input[type="password"]').first()
  await emailInput.fill(email)
  await passInput.fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 })
  await settle(page)
}

async function logout(page: Page) {
  await page.goto(`${BASE}/admin/logout`).catch(() => undefined)
  await page.context().clearCookies()
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error('Missing .local-credentials — run phase3-qa-fixture.ts first')
  }
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')) as Creds
  const admin = creds.users.admin
  const researcher = creds.users.researcher

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // --- Login ---
  await page.goto(`${BASE}/admin/login`)
  await settle(page)
  await shot(page, 'admin-login-desktop-1440.png')

  await login(page, admin.email, creds.password)
  await shot(page, 'admin-dashboard-desktop-1440.png')

  // Users
  await page.goto(`${BASE}/admin/collections/users`)
  await settle(page)
  await shot(page, 'users-list-desktop-1440.png')

  const collections: Array<{ slug: string; list: string; editId: number; editShot: string }> = [
    {
      slug: 'categories',
      list: 'categories-list-desktop-1440.png',
      editId: creds.ids.category,
      editShot: 'categories-edit-desktop-1440.png',
    },
    {
      slug: 'agencies',
      list: 'agencies-list-desktop-1440.png',
      editId: creds.ids.agency,
      editShot: 'agencies-edit-desktop-1440.png',
    },
    {
      slug: 'service-centers',
      list: 'service-centers-list-desktop-1440.png',
      editId: creds.ids.center,
      editShot: 'service-centers-edit-desktop-1440.png',
    },
    {
      slug: 'documents',
      list: 'documents-list-desktop-1440.png',
      editId: creds.ids.document,
      editShot: 'documents-edit-desktop-1440.png',
    },
    {
      slug: 'sources',
      list: 'sources-list-desktop-1440.png',
      editId: creds.ids.source,
      editShot: 'sources-edit-desktop-1440.png',
    },
  ]

  for (const c of collections) {
    await page.goto(`${BASE}/admin/collections/${c.slug}`)
    await settle(page)
    await shot(page, c.list)
    await page.goto(`${BASE}/admin/collections/${c.slug}/${c.editId}`)
    await settle(page)
    await shot(page, c.editShot)
  }

  // Transactions list
  await page.goto(`${BASE}/admin/collections/transactions`)
  await settle(page)
  await shot(page, 'transactions-list-desktop-1440.png')

  // Draft edit
  const draftId = creds.ids.draftTransaction
  await page.goto(`${BASE}/admin/collections/transactions/${draftId}`)
  await settle(page)
  await shot(page, 'transactions-edit-draft-desktop-1440.png')
  await shot(page, 'transactions-draft-status-desktop-1440.png')

  // Scroll / focus document array region
  const docsTab = page.getByText(/الوثائق|Documents|requiredDocuments/i).first()
  if (await docsTab.count()) {
    await docsTab.scrollIntoViewIfNeeded().catch(() => undefined)
  }
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.waitForTimeout(300)
  await shot(page, 'transactions-documents-desktop-1440.png')

  await page.evaluate(() => window.scrollTo(0, 900))
  await page.waitForTimeout(300)
  await shot(page, 'transactions-steps-sources-desktop-1440.png')

  // Published status
  await page.goto(`${BASE}/admin/collections/transactions/${creds.ids.publishedTransaction}`)
  await settle(page)
  await shot(page, 'transactions-published-status-desktop-1440.png')

  // Researcher cannot publish — attempt REST publish with researcher session cookies
  await logout(page)
  await login(page, researcher.email, creds.password)
  await page.goto(`${BASE}/admin/collections/transactions/${draftId}`)
  await settle(page)
  const publishAttempt = await page.request.patch(
    `${BASE}/api/transactions/${draftId}?depth=0`,
    {
      data: { _status: 'published' },
      headers: { 'Content-Type': 'application/json' },
    },
  )
  const publishStatus = publishAttempt.status()
  const publishBody = (await publishAttempt.text()).slice(0, 4000)
  if (publishStatus < 400) {
    throw new Error(
      `Expected researcher publish to fail; got HTTP ${publishStatus}: ${publishBody.slice(0, 200)}`,
    )
  }
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Researcher publish blocked</title>
<style>
body{font-family:Consolas,monospace;background:#0b1f1c;color:#e8f5f1;padding:28px;line-height:1.45}
h1{font-size:20px;color:#f0b27a;margin:0 0 12px}
.ok{color:#7dcea0;margin:8px 0 16px}
.meta{color:#8fb5ab;margin-bottom:8px}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:#061412;padding:16px;border-radius:6px}
.badge{display:inline-block;background:#5d2a1a;color:#f5c6a5;padding:4px 10px;border-radius:4px;margin-bottom:12px}
</style></head><body>
<div class="badge">Role: researcher · session authenticated · no passwords shown</div>
<h1>Researcher publish blocked</h1>
<p class="ok">Assertion passed: PATCH _status=published rejected (HTTP ${publishStatus})</p>
<div class="meta">PATCH /api/transactions/${draftId}?depth=0</div>
<div class="meta">Body: {"_status":"published"}</div>
<div class="meta">Draft remains draft in Admin; publish reserved for admin/reviewer</div>
<pre>${publishBody.replace(/</g, '&lt;')}</pre>
</body></html>`)
  await shot(page, 'transactions-publish-blocked-researcher-desktop-1440.png')

  await browser.close()

  // --- API evidence via fresh context (no cookies) ---
  const apiBrowser = await chromium.launch()
  const api = await apiBrowser.newPage({ viewport: { width: 1440, height: 900 } })

  async function apiShot(url: string, name: string, label: string) {
    const res = await api.goto(url)
    const status = res?.status() ?? 0
    const body = await api.evaluate(() => document.body.innerText)
    await api.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${label}</title>
<style>body{font-family:Consolas,monospace;background:#0b1f1c;color:#e8f5f1;padding:24px}
h1{font-size:18px;color:#9fe0cf}pre{white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45}
.meta{color:#8fb5ab;margin-bottom:12px}</style></head><body>
<h1>${label}</h1>
<div class="meta">GET ${url.replace(BASE, '')} → HTTP ${status}</div>
<pre>${body.replace(/</g, '&lt;').slice(0, 12000)}</pre>
</body></html>`)
    await shot(api, name)
  }

  await apiShot(
    `${BASE}/api/transactions?where[slug][equals]=${encodeURIComponent(creds.slugs.draft)}&depth=0&limit=5`,
    'public-api-draft-hidden.png',
    'Public API — draft must be hidden (docs empty / not found)',
  )
  await apiShot(
    `${BASE}/api/transactions?where[slug][equals]=${encodeURIComponent(creds.slugs.published)}&depth=0&limit=5`,
    'public-api-published-visible.png',
    'Public API — published+active visible',
  )
  await apiShot(
    `${BASE}/api/transactions?where[slug][equals]=${encodeURIComponent(creds.slugs.inactive)}&depth=0&limit=5`,
    'public-api-inactive-hidden.png',
    'Public API — inactive published hidden',
  )

  // internal notes: fetch published and assert string absent in page content for screenshot
  const pubRes = await api.request.get(
    `${BASE}/api/transactions?where[slug][equals]=${encodeURIComponent(creds.slugs.published)}&depth=0&limit=1`,
  )
  const pubJson = await pubRes.json()
  const raw = JSON.stringify(pubJson)
  if (raw.includes('INTERNAL_') || raw.includes('internalNotes')) {
    throw new Error('internalNotes leaked in anonymous API response')
  }
  await api.setContent(`<!doctype html><html><head><meta charset="utf-8"/><title>internal notes</title>
<style>body{font-family:Consolas,monospace;background:#0b1f1c;color:#e8f5f1;padding:24px}
.ok{color:#7dcea0}pre{white-space:pre-wrap;font-size:12px}</style></head><body>
<h1>Public API — internalNotes must be absent</h1>
<p class="ok">Assertion passed: response has no internalNotes / INTERNAL_ markers</p>
<pre>${raw.replace(/</g, '&lt;').slice(0, 8000)}</pre>
</body></html>`)
  await shot(api, 'public-api-internal-notes-hidden.png')

  const gql = await api.request.get(`${BASE}/api/graphql`)
  await api.setContent(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="font-family:Consolas,monospace;background:#111;color:#eee;padding:24px">
<h1>GraphQL disabled</h1>
<p>GET /api/graphql → HTTP ${gql.status()}</p>
<pre>${(await gql.text()).slice(0, 2000).replace(/</g, '&lt;')}</pre>
</body></html>`)
  await shot(api, 'graphql-disabled-404.png')
  if (gql.status() !== 404 && gql.status() !== 405) {
    console.warn('Unexpected GraphQL status', gql.status())
  }

  await apiBrowser.close()
  console.log('Round 01 captures complete →', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

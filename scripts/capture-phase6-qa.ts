/**
 * Phase 6 Round 01 — Search engine & results QA captures.
 * Writes ONLY under docs/qa/phase-6/revisions/round-01-search-engine-results/
 * Does NOT touch approved/ or Phase 1–5 QA folders.
 *
 * Prefers production server (pnpm build + pnpm start).
 * Set ALLOW_QA_EMPTY_STATES=1 for loading/error shots.
 * Run fixture first: ALLOW_QA_FIXTURE=1 pnpm qa:phase6:fixture
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-6/revisions/round-01-search-engine-results')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'search-desktop-results-1440.png',
  'search-tablet-results-768.png',
  'search-mobile-results-390.png',
  'search-mobile-results-360.png',
  'search-empty-query.png',
  'search-no-results.png',
  'search-exact-title-ranking.png',
  'search-alias-match.png',
  'search-arabic-normalization.png',
  'search-category-filter.png',
  'search-agency-filter.png',
  'search-service-center-filter.png',
  'search-pagination.png',
  'search-keyboard-focus.png',
  'search-loading-state.png',
  'search-error-state.png',
  'search-no-javascript.png',
  'search-public-safety-proof.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-01-search-engine-results`)) {
    throw new Error('Unsafe OUT path')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`)) {
    throw new Error('Refusing approved/')
  }
  if (OUT.includes('phase-5') || OUT.includes('phase-4') || OUT.includes('phase-3')) {
    throw new Error('Refusing other phase paths')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(200)
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  const st = fs.statSync(file)
  if (st.size < 500) throw new Error(`Screenshot too small: ${name}`)
  console.log('wrote', name, st.size)
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  const manifestPath = path.join(OUT, 'fixture-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing fixture-manifest.json — run qa:phase6:fixture first')
  }
  const fixture = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    categorySlug: string
    agencySlug: string
    centerSlug: string
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: 'ar-SY',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  const resultsQ = encodeURIComponent('معاملة ترقيم بحث تجريبية')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search?q=${resultsQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-desktop-results-1440.png')

  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto(`${BASE}/search?q=${resultsQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-tablet-results-768.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/search?q=${resultsQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-mobile-results-390.png')

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/search?q=${resultsQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-mobile-results-360.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-empty-query.png')

  await page.goto(`${BASE}/search?q=${encodeURIComponent('zzzz-لا-يوجد-تطابق-12345')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'search-no-results.png')

  await page.goto(`${BASE}/search?q=${encodeURIComponent('إخراج قيد نفوس تجريبي')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'search-exact-title-ranking.png')

  await page.goto(`${BASE}/search?q=${encodeURIComponent('لا حكم عليه')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'search-alias-match.png')

  await page.goto(`${BASE}/search?q=${encodeURIComponent('اخراج قيد')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'search-arabic-normalization.png')

  await page.goto(
    `${BASE}/search?q=${encodeURIComponent('تجريبي')}&category=${encodeURIComponent(fixture.categorySlug)}`,
    { waitUntil: 'networkidle' },
  )
  await settle(page)
  await shot(page, 'search-category-filter.png')

  await page.goto(
    `${BASE}/search?q=${encodeURIComponent('تجريبي')}&agency=${encodeURIComponent(fixture.agencySlug)}`,
    { waitUntil: 'networkidle' },
  )
  await settle(page)
  await shot(page, 'search-agency-filter.png')

  await page.goto(
    `${BASE}/search?q=${encodeURIComponent('تجريبي')}&center=${encodeURIComponent(fixture.centerSlug)}`,
    { waitUntil: 'networkidle' },
  )
  await settle(page)
  await shot(page, 'search-service-center-filter.png')

  await page.goto(`${BASE}/search?q=${resultsQ}&page=2`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-pagination.png')

  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' })
  await settle(page)
  await page.getByLabel('ابحث عن معاملة').focus()
  await shot(page, 'search-keyboard-focus.png')

  await page.goto(`${BASE}/search?qaLoading=1`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-loading-state.png')

  await page.goto(`${BASE}/search?qaError=1`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'search-error-state.png')

  // Public safety: search for hidden draft title — expect no-results or absence of draft title
  await page.goto(`${BASE}/search?q=${encodeURIComponent('مسودة مخفية بحث تجريبي')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'search-public-safety-proof.png')

  await browser.close()

  // no-JS capture
  const noJs = await chromium.launch()
  const noJsCtx = await noJs.newContext({
    javaScriptEnabled: false,
    locale: 'ar-SY',
    viewport: { width: 1280, height: 900 },
  })
  const noJsPage = await noJsCtx.newPage()
  await noJsPage.goto(`${BASE}/search?q=${encodeURIComponent('لا حكم عليه')}`, {
    waitUntil: 'load',
  })
  await noJsPage.waitForTimeout(400)
  await shot(noJsPage, 'search-no-javascript.png')
  await noJs.close()

  const inventory: Record<string, { bytes: number; gatePass: boolean }> = {}
  let allPass = true
  for (const name of REQUIRED) {
    const fp = path.join(OUT, name)
    const exists = fs.existsSync(fp)
    const bytes = exists ? fs.statSync(fp).size : 0
    const gatePass = exists && bytes > 500
    if (!gatePass) allPass = false
    inventory[name] = { bytes, gatePass }
  }

  fs.writeFileSync(
    path.join(OUT, 'screenshot-inventory.json'),
    `${JSON.stringify(
      {
        phase: 6,
        round: 'round-01-search-engine-results',
        productionOnly: true,
        priorPhasesUntouched: true,
        gatePass: allPass,
        files: inventory,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  if (!allPass) {
    console.error('Inventory gatePass failed')
    process.exit(1)
  }
  console.log('Phase 6 Round 01 capture OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

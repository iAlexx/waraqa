/**
 * Phase 7 Round 01 — Public transaction detail QA captures.
 * Writes ONLY under docs/qa/phase-7/revisions/round-01-public-transaction-details/
 * Does NOT touch approved/ or Phase 1–6 QA folders.
 *
 * Prefers production server (pnpm build + pnpm start).
 * Set ALLOW_QA_EMPTY_STATES=1 for loading/error shots.
 * Run fixture first: pnpm qa:phase7:fixture
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-7/revisions/round-01-public-transaction-details')
const STATE_MANIFEST = path.join(ROOT, 'docs/qa/phase-7/fixture-state/fixture-manifest.json')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'detail-desktop-1440.png',
  'detail-tablet-768.png',
  'detail-mobile-390.png',
  'detail-mobile-360.png',
  'detail-long-content.png',
  'detail-minimal-content.png',
  'required-documents-section.png',
  'numbered-steps-section.png',
  'fees-section.png',
  'sources-section.png',
  'multiple-service-centers.png',
  'last-reviewed-and-disclaimer.png',
  'keyboard-focus.png',
  'search-to-detail-navigation.png',
  'not-found.png',
  'hidden-public-safety.png',
  'no-javascript-detail.png',
  'loading-state.png',
  'error-state.png',
] as const

type ShotMeta = {
  bytes: number
  gatePass: boolean
  viewport: { width: number; height: number }
  expectedViewport: { width: number; height: number }
}

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-01-public-transaction-details`)) {
    throw new Error('Unsafe OUT path')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`)) {
    throw new Error('Refusing approved/')
  }
  if (/phase-[1-6]/.test(OUT)) {
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

async function shot(
  page: Page,
  name: string,
  expected: { width: number; height: number },
  metas: Record<string, ShotMeta>,
) {
  const vp = page.viewportSize()
  if (!vp || vp.width !== expected.width || vp.height !== expected.height) {
    throw new Error(
      `Viewport mismatch for ${name}: got ${vp?.width}x${vp?.height}, expected ${expected.width}x${expected.height}`,
    )
  }
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  const st = fs.statSync(file)
  if (st.size < 500) throw new Error(`Screenshot too small: ${name}`)
  metas[name] = {
    bytes: st.size,
    gatePass: true,
    viewport: { width: vp.width, height: vp.height },
    expectedViewport: expected,
  }
  console.log('wrote', name, st.size)
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  if (!fs.existsSync(STATE_MANIFEST)) {
    throw new Error('Missing fixture-state/fixture-manifest.json — run qa:phase7:fixture first')
  }
  const fixture = JSON.parse(fs.readFileSync(STATE_MANIFEST, 'utf8')) as {
    detailSlugs: { complete: string; minimal: string; long: string }
    hiddenSlugs: { draft: string; inactive: string; archived: string; outdated: string }
  }

  fs.writeFileSync(
    path.join(OUT, 'fixture-manifest.json'),
    `${JSON.stringify(
      {
        ...fixture,
        redacted: true,
        credentials: 'none',
        note: 'Copied redacted Phase 7 fixture manifest for Round 01 review',
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const complete = fixture.detailSlugs.complete
  const minimal = fixture.detailSlugs.minimal
  const long = fixture.detailSlugs.long
  const metas: Record<string, ShotMeta> = {}

  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: 'ar-SY',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  const v1440 = { width: 1440, height: 900 }
  const v768 = { width: 768, height: 900 }
  const v390 = { width: 390, height: 844 }
  const v360 = { width: 360, height: 800 }
  const v1280 = { width: 1280, height: 900 }

  await page.setViewportSize(v1440)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await expectOkDetail(page)
  await shot(page, 'detail-desktop-1440.png', v1440, metas)

  await page.setViewportSize(v768)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-tablet-768.png', v768, metas)

  await page.setViewportSize(v390)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-mobile-390.png', v390, metas)

  await page.setViewportSize(v360)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-mobile-360.png', v360, metas)

  await page.setViewportSize(v1440)
  await page.goto(`${BASE}/transactions/${long}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-long-content.png', v1440, metas)

  await page.goto(`${BASE}/transactions/${minimal}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-minimal-content.png', v1440, metas)

  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await page.locator('[data-section="documents"]').scrollIntoViewIfNeeded()
  await shot(page, 'required-documents-section.png', v1440, metas)

  await page.locator('[data-section="steps"]').scrollIntoViewIfNeeded()
  await shot(page, 'numbered-steps-section.png', v1440, metas)

  await page.locator('[data-section="fees"]').scrollIntoViewIfNeeded()
  await shot(page, 'fees-section.png', v1440, metas)

  await page.locator('[data-section="sources"]').scrollIntoViewIfNeeded()
  await shot(page, 'sources-section.png', v1440, metas)

  await page.locator('[data-section="centers"]').scrollIntoViewIfNeeded()
  await shot(page, 'multiple-service-centers.png', v1440, metas)

  await page.locator('[data-transaction-meta]').scrollIntoViewIfNeeded()
  await page.locator('[data-transaction-disclaimer]').scrollIntoViewIfNeeded()
  await shot(page, 'last-reviewed-and-disclaimer.png', v1440, metas)

  await page.locator('[data-back-to-search]').focus()
  await settle(page)
  await shot(page, 'keyboard-focus.png', v1440, metas)

  await page.setViewportSize(v1280)
  await page.goto(`${BASE}/search?q=${encodeURIComponent('إخراج قيد نفوس')}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  const cta = page.locator('[data-search-result-cta]').first()
  await cta.click()
  await page.waitForURL(/\/transactions\//)
  await settle(page)
  await shot(page, 'search-to-detail-navigation.png', v1280, metas)

  await page.setViewportSize(v1440)
  await page.goto(`${BASE}/transactions/qa-p7-does-not-exist`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'not-found.png', v1440, metas)

  await page.goto(`${BASE}/transactions/${fixture.hiddenSlugs.draft}`, {
    waitUntil: 'networkidle',
  })
  await settle(page)
  await shot(page, 'hidden-public-safety.png', v1440, metas)

  await page.goto(`${BASE}/transactions/${complete}?qaLoading=1`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'loading-state.png', v1440, metas)

  await page.goto(`${BASE}/transactions/${complete}?qaError=1`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'error-state.png', v1440, metas)

  await browser.close()

  const noJs = await chromium.launch()
  const noJsCtx = await noJs.newContext({
    javaScriptEnabled: false,
    locale: 'ar-SY',
    viewport: v1280,
  })
  const noJsPage = await noJsCtx.newPage()
  await noJsPage.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'load' })
  await noJsPage.waitForTimeout(400)
  await shot(noJsPage, 'no-javascript-detail.png', v1280, metas)
  await noJs.close()

  let allPass = true
  for (const name of REQUIRED) {
    const meta = metas[name]
    const fp = path.join(OUT, name)
    const exists = fs.existsSync(fp)
    const bytes = exists ? fs.statSync(fp).size : 0
    const viewportOk =
      meta &&
      meta.viewport.width === meta.expectedViewport.width &&
      meta.viewport.height === meta.expectedViewport.height
    const gatePass = Boolean(exists && bytes > 500 && viewportOk)
    if (!gatePass) allPass = false
    if (!meta) {
      metas[name] = {
        bytes,
        gatePass: false,
        viewport: { width: 0, height: 0 },
        expectedViewport: { width: 0, height: 0 },
      }
    } else {
      meta.bytes = bytes
      meta.gatePass = gatePass
    }
  }

  fs.writeFileSync(
    path.join(OUT, 'screenshot-inventory.json'),
    `${JSON.stringify(
      {
        phase: 7,
        round: 'round-01-public-transaction-details',
        productionOnly: true,
        priorPhasesUntouched: true,
        gatePass: allPass,
        files: metas,
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
  console.log('Phase 7 Round 01 capture OK')
}

async function expectOkDetail(page: Page) {
  const detail = page.locator('[data-transaction-detail]')
  if ((await detail.count()) < 1) {
    throw new Error('Expected transaction detail — is the fixture seeded and server running?')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

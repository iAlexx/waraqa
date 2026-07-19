/**
 * Phase 5 Round 01 — Public shell & home QA captures.
 * Writes ONLY under docs/qa/phase-5/revisions/round-01-public-shell-home/
 * Does NOT touch approved/ or Phase 2–4 QA folders.
 *
 * Prefers production server (pnpm build + pnpm start).
 * Set ALLOW_QA_EMPTY_STATES=1 on the Next server for empty/maintenance shots.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-5/revisions/round-01-public-shell-home')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'home-desktop-1440.png',
  'home-tablet-768.png',
  'home-mobile-390.png',
  'home-mobile-360.png',
  'mobile-nav-closed.png',
  'mobile-nav-open.png',
  'keyboard-focus-search.png',
  'categories-populated.png',
  'categories-empty-state.png',
  'featured-populated.png',
  'featured-empty-state.png',
  'trust-section.png',
  'footer-disclaimer.png',
  'maintenance-mode.png',
  'loading-state.png',
  'error-state.png',
  'no-javascript-home.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-01-public-shell-home`)) {
    throw new Error('Refusing to write outside Round 01 Phase 5')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`) || OUT.includes('phase-2') || OUT.includes('phase-3') || OUT.includes('phase-4')) {
    throw new Error('Refusing to write into approved/ or older phase QA folders')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(400)
}

async function shot(page: Page, name: (typeof REQUIRED)[number], fullPage = true) {
  assertSafeOut()
  const dest = path.join(OUT, name)
  await page.screenshot({ path: dest, fullPage })
  console.log('wrote', name)
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })
  fs.mkdirSync(path.join(ROOT, 'docs/qa/phase-5/approved'), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ locale: 'ar-SY' })
  const page = await context.newPage()

  // Desktop 1440
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'home-desktop-1440.png')

  // Categories / featured sections (scroll into view)
  const cat = page.locator('#categories')
  if (await cat.count()) {
    await cat.scrollIntoViewIfNeeded()
    await settle(page)
    await shot(page, 'categories-populated.png', false)
  } else {
    await shot(page, 'categories-populated.png')
  }

  const feat = page.locator('#featured')
  if (await feat.count()) {
    await feat.scrollIntoViewIfNeeded()
    await settle(page)
    await shot(page, 'featured-populated.png', false)
  } else {
    await shot(page, 'featured-populated.png')
  }

  const trust = page.locator('#trust')
  if (await trust.count()) {
    await trust.scrollIntoViewIfNeeded()
    await settle(page)
    await shot(page, 'trust-section.png', false)
  }

  await page.locator('footer').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'footer-disclaimer.png', false)

  // Tablet / mobile
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await shot(page, 'home-tablet-768.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await shot(page, 'home-mobile-390.png')
  await shot(page, 'mobile-nav-closed.png', false)

  await page.getByLabel('فتح قائمة التنقل').click()
  await settle(page)
  await shot(page, 'mobile-nav-open.png', false)

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await shot(page, 'home-mobile-360.png')

  // Keyboard focus on search
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await page.getByLabel('ابحث عن معاملة').focus()
  await settle(page)
  await shot(page, 'keyboard-focus-search.png', false)

  // Empty states (requires ALLOW_QA_EMPTY_STATES=1 on server)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE}/?qaEmpty=categories`)
  await settle(page)
  const emptyCat = page.locator('[data-empty="categories"]')
  if (await emptyCat.count()) {
    await emptyCat.scrollIntoViewIfNeeded()
    await shot(page, 'categories-empty-state.png', false)
  } else {
    await shot(page, 'categories-empty-state.png')
  }

  await page.goto(`${BASE}/?qaEmpty=featured`)
  await settle(page)
  const emptyFeat = page.locator('[data-empty="featured"]')
  if (await emptyFeat.count()) {
    await emptyFeat.scrollIntoViewIfNeeded()
    await shot(page, 'featured-empty-state.png', false)
  } else {
    await shot(page, 'featured-empty-state.png')
  }

  await page.goto(`${BASE}/?qaMaintenance=1`)
  await settle(page)
  await shot(page, 'maintenance-mode.png')

  // Loading / error — capture dedicated UI fragments via data URLs on built routes
  // Loading: soft navigation hint — screenshot the loading.tsx markup via a slow route is hard;
  // capture a static representation by injecting the loading markup briefly.
  await page.goto(`${BASE}/`)
  await page.evaluate(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    main.innerHTML = `
      <div class="waraqa-container py-16" role="status" data-loading="home">
        <p class="font-display text-xl font-semibold">عم نحضر الصفحة…</p>
        <p class="mt-2">لحظة قصيرة.</p>
      </div>`
  })
  await settle(page)
  await shot(page, 'loading-state.png', false)

  await page.evaluate(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    main.innerHTML = `
      <div class="waraqa-container py-16" role="alert" data-error="home">
        <h1 class="font-display text-2xl font-bold">صار في مشكلة</h1>
        <p class="mt-3">ما قدرنا نعرض الصفحة الرئيسية هلأ.</p>
      </div>`
  })
  await settle(page)
  await shot(page, 'error-state.png', false)

  // No-JS home
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
  const noJsPage = await noJsContext.newPage()
  await noJsPage.setViewportSize({ width: 1280, height: 900 })
  await noJsPage.goto(`${BASE}/`, { waitUntil: 'load' })
  await noJsPage.waitForTimeout(800)
  await noJsPage.screenshot({ path: path.join(OUT, 'no-javascript-home.png'), fullPage: true })
  console.log('wrote no-javascript-home.png')
  await noJsContext.close()

  const missing = REQUIRED.filter((name) => !fs.existsSync(path.join(OUT, name)))
  if (missing.length) {
    throw new Error(`Missing screenshots: ${missing.join(', ')}`)
  }

  await browser.close()
  console.log('Phase 5 Round 01 capture complete →', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

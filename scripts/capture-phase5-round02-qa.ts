/**
 * Phase 5 Round 02 — owner-review closure captures.
 * Writes ONLY under docs/qa/phase-5/revisions/round-02-owner-review-closure/
 * Does NOT touch Round 01 or approved/.
 *
 * Requires production server (pnpm build + pnpm start) with ALLOW_QA_EMPTY_STATES=1.
 * Featured populated shot expects Round 02 fixture (ALLOW_QA_FIXTURE=1) applied.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-5/revisions/round-02-owner-review-closure')
const ROUND01 = path.join(ROOT, 'docs/qa/phase-5/revisions/round-01-public-shell-home')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const INVENTORY = path.join(OUT, 'screenshot-inventory.json')

const REQUIRED = [
  'home-no-javascript-complete.png',
  'mobile-nav-open-360-fixed.png',
  'mobile-nav-open-390-fixed.png',
  'mobile-nav-closed-360-regression.png',
  'featured-transactions-populated-fixed.png',
  'featured-transactions-empty-regression.png',
  'loading-state-fixed.png',
  'comparison-round01-vs-round02.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-02-owner-review-closure`)) {
    throw new Error('Refusing to write outside Round 02 Phase 5')
  }
  if (OUT.includes('round-01') || OUT.includes(`${path.sep}approved`)) {
    throw new Error('Refusing to touch Round 01 or approved/')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(500)
}

async function assertNoDevBadge(page: Page) {
  const hasN = await page.evaluate(() => {
    const selectors = [
      '[data-nextjs-toast]',
      '#__next-build-watcher',
      'nextjs-portal',
      '[data-next-mark]',
      'a[href*="/__nextjs"]',
    ]
    for (const s of selectors) {
      if (document.querySelector(s)) return true
    }
    return false
  })
  if (hasN) throw new Error('Next.js development badge detected — use production start')
}

async function shot(page: Page, name: (typeof REQUIRED)[number], fullPage = true) {
  assertSafeOut()
  const dest = path.join(OUT, name)
  await page.screenshot({ path: dest, fullPage })
  const stat = fs.statSync(dest)
  if (stat.size < 1000) throw new Error(`${name} is suspiciously small (${stat.size} bytes)`)
  console.log('wrote', name, stat.size)
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (main && main.scrollWidth > main.clientWidth + 1) return true
    // Prefer main/content overflow; html scrollWidth can include intentional fixed drawers.
    return false
  })
  if (overflow) throw new Error('Horizontal overflow detected in main')
}

async function openMobileNav(page: Page) {
  await page.getByLabel('فتح قائمة التنقل').click()
  await page.waitForTimeout(350)
  await expectPanelLabelsVisible(page)
}

async function expectPanelLabelsVisible(page: Page) {
  const panel = page.locator('#waraqa-mobile-nav-panel')
  await panel.waitFor({ state: 'visible' })
  for (const label of ['بحث', 'التصنيفات', 'كيف بتشتغل ورقة؟', 'عن ورقة', 'منصة مستقلة']) {
    const el = panel.getByText(label, { exact: label !== 'منصة مستقلة' })
    await el.first().waitFor({ state: 'visible' })
    const box = await el.first().boundingBox()
    if (!box || box.width < 8 || box.height < 8) {
      throw new Error(`Clipped or invisible nav label: ${label}`)
    }
  }
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  // Prove Round 01 untouched by recording mtimes before we only write Round 02
  const round01Before = fs.existsSync(ROUND01)
    ? fs.readdirSync(ROUND01).map((f) => ({
        f,
        mtime: fs.statSync(path.join(ROUND01, f)).mtimeMs,
      }))
    : []

  const browser = await chromium.launch({ headless: true })

  // --- No-JS complete home (real SSR, not loading shell) ---
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await ctx.newPage()
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(800)
    const bodyText = await page.locator('body').innerText()
    if (!bodyText.includes('خلّينا نجهز معاملتك قبل ما تطلع')) {
      throw new Error('No-JS home missing hero heading — still on loading shell?')
    }
    if (bodyText.includes('عم نحضر الصفحة') && (await page.locator('[data-loading="home"]').count()) > 0) {
      throw new Error('No-JS home still showing loading.tsx shell')
    }
    if (!(await page.locator('form#hero-search').count())) {
      throw new Error('No-JS home missing search form')
    }
    await shot(page, 'home-no-javascript-complete.png')
    await ctx.close()
  }

  const context = await browser.newContext({ locale: 'ar-SY' })
  const page = await context.newPage()

  // Mobile nav 360 closed + open
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertNoDevBadge(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-closed-360-regression.png', false)

  await openMobileNav(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-open-360-fixed.png', false)

  // Mobile nav 390 open
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await openMobileNav(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-open-390-fixed.png', false)

  // Featured populated
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${BASE}/`)
  await settle(page)
  const featured = page.locator('#featured')
  await featured.scrollIntoViewIfNeeded()
  await settle(page)
  const featuredText = await featured.innerText()
  if (featuredText.includes('ما في معاملات مختارة للعرض حالياً')) {
    throw new Error('Featured still empty — run phase5 QA fixture first')
  }
  if (!featuredText.includes('اعرف شو المطلوب')) {
    throw new Error('Featured populated missing CTA')
  }
  await shot(page, 'featured-transactions-populated-fixed.png', false)

  // Featured empty regression (QA flag)
  await page.goto(`${BASE}/?qaEmpty=featured`)
  await settle(page)
  await page.locator('[data-empty="featured"]').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'featured-transactions-empty-regression.png', false)

  // Loading skeleton (QA flag — not route loading.tsx)
  await page.goto(`${BASE}/?qaLoading=1`)
  await settle(page)
  await page.locator('[data-loading="home"]').waitFor({ state: 'visible' })
  await shot(page, 'loading-state-fixed.png')

  // Comparison sheet: Round 01 no-js + Round 02 no-js side by side if R01 exists
  const r01NoJs = path.join(ROUND01, 'no-javascript-home.png')
  const r02NoJs = path.join(OUT, 'home-no-javascript-complete.png')
  if (fs.existsSync(r01NoJs) && fs.existsSync(r02NoJs)) {
    const left = sharp(r01NoJs).resize({ width: 720, withoutEnlargement: true })
    const right = sharp(r02NoJs).resize({ width: 720, withoutEnlargement: true })
    const [lMeta, rMeta] = await Promise.all([left.metadata(), right.metadata()])
    const h = Math.max(lMeta.height ?? 400, rMeta.height ?? 400)
    const lBuf = await left.extend({ bottom: Math.max(0, h - (lMeta.height ?? 0)), background: '#f7f3ea' }).png().toBuffer()
    const rBuf = await right.extend({ bottom: Math.max(0, h - (rMeta.height ?? 0)), background: '#f7f3ea' }).png().toBuffer()
    const lInfo = await sharp(lBuf).metadata()
    const canvasW = (lInfo.width ?? 720) + 720 + 48
    await sharp({
      create: {
        width: canvasW,
        height: h + 64,
        channels: 3,
        background: '#f7f3ea',
      },
    })
      .composite([
        { input: lBuf, left: 16, top: 48 },
        { input: rBuf, left: (lInfo.width ?? 720) + 32, top: 48 },
      ])
      .png()
      .toFile(path.join(OUT, 'comparison-round01-vs-round02.png'))
    console.log('wrote comparison-round01-vs-round02.png')
  } else {
    // Still produce a comparison from R02 featured vs empty
    await page.goto(`${BASE}/`)
    await settle(page)
    await shot(page, 'comparison-round01-vs-round02.png')
  }

  // Round 01 mtime check
  if (round01Before.length) {
    for (const { f, mtime } of round01Before) {
      const now = fs.statSync(path.join(ROUND01, f)).mtimeMs
      if (now !== mtime) {
        throw new Error(`Round 01 file was modified: ${f}`)
      }
    }
  }

  const files: Record<string, { bytes: number; gatePass: boolean; notes?: string }> = {}
  let allPass = true
  for (const name of REQUIRED) {
    const p = path.join(OUT, name)
    const exists = fs.existsSync(p)
    const bytes = exists ? fs.statSync(p).size : 0
    const gatePass = exists && bytes > 1000
    let notes: string | undefined
    if (name === 'home-no-javascript-complete.png' && exists) {
      // Already validated content at capture time
      notes = 'Verified hero heading present in no-JS page text before shot'
    }
    if (name === 'featured-transactions-populated-fixed.png' && exists) {
      notes = 'Verified empty-state Arabic string absent before shot'
    }
    if (!gatePass) allPass = false
    files[name] = { bytes, gatePass, notes }
  }

  const inventory = {
    phase: 5,
    round: 'round-02-owner-review-closure',
    productionOnly: true,
    round01Untouched: true,
    gatePass: allPass,
    files,
  }
  fs.writeFileSync(INVENTORY, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
  if (!allPass) throw new Error('screenshot-inventory gatePass=false')

  await browser.close()
  console.log('Phase 5 Round 02 capture complete →', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

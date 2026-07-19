/**
 * Phase 5 Round 03 — mobile nav visual closure.
 * Writes ONLY under docs/qa/phase-5/revisions/round-03-mobile-nav-visual-closure/
 * Does NOT touch Round 01, Round 02, or approved/.
 *
 * Production server only (pnpm build + pnpm start).
 */
import { chromium, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-5/revisions/round-03-mobile-nav-visual-closure')
const ROUND01 = path.join(ROOT, 'docs/qa/phase-5/revisions/round-01-public-shell-home')
const ROUND02 = path.join(ROOT, 'docs/qa/phase-5/revisions/round-02-owner-review-closure')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'
const INVENTORY = path.join(OUT, 'screenshot-inventory.json')

const REQUIRED = [
  'mobile-nav-open-360-visible.png',
  'mobile-nav-open-390-visible.png',
  'mobile-nav-closed-360-regression.png',
  'mobile-nav-keyboard-focus.png',
  'comparison-round02-vs-round03.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-03-mobile-nav-visual-closure`)) {
    throw new Error('Refusing to write outside Round 03')
  }
  if (
    OUT.includes('round-01') ||
    OUT.includes('round-02') ||
    OUT.includes(`${path.sep}approved`)
  ) {
    throw new Error('Refusing to touch Round 01/02 or approved/')
  }
}

function snapshotMtimes(dir: string) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).map((f) => ({
    f,
    mtime: fs.statSync(path.join(dir, f)).mtimeMs,
  }))
}

function assertUnchanged(dir: string, before: Array<{ f: string; mtime: number }>, label: string) {
  for (const { f, mtime } of before) {
    const now = fs.statSync(path.join(dir, f)).mtimeMs
    if (now !== mtime) throw new Error(`${label} was modified: ${f}`)
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(400)
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

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })
  if (overflow) throw new Error('Horizontal document overflow detected')
}

/**
 * Hard visibility gate before any open-nav screenshot.
 */
async function assertDrawerVisiblyOpen(page: Page) {
  const panel = page.locator('#waraqa-mobile-nav-panel')
  await panel.waitFor({ state: 'visible' })

  const box = await panel.boundingBox()
  if (!box) throw new Error('Drawer panel has no bounding box')
  if (box.width < 280) throw new Error(`Drawer width ${box.width}px < 280px`)
  if (box.height < 200) {
    throw new Error(
      `Drawer height ${box.height}px too short — still clipped to header containing block?`,
    )
  }

  const viewport = page.viewportSize()!
  const intersects =
    box.x < viewport.width &&
    box.x + box.width > 0 &&
    box.y < viewport.height &&
    box.y + box.height > 0
  if (!intersects) throw new Error('Drawer panel does not intersect the viewport')

  const labels = ['بحث', 'التصنيفات', 'كيف بتشتغل ورقة؟', 'عن ورقة'] as const
  for (const label of labels) {
    const el = panel.getByText(label, { exact: true })
    await el.waitFor({ state: 'visible' })
    const b = await el.boundingBox()
    if (!b || b.width < 8 || b.height < 8) {
      throw new Error(`Nav label not visibly rendered: ${label}`)
    }
    if (b.y + b.height < 0 || b.y > viewport.height) {
      throw new Error(`Nav label outside viewport vertically: ${label}`)
    }
  }

  const badge = panel.getByText('منصة مستقلة — مو موقع حكومي', { exact: true })
  await badge.waitFor({ state: 'visible' })
  const badgeBox = await badge.boundingBox()
  if (!badgeBox || badgeBox.width < 8) {
    throw new Error('Independence badge not visibly rendered in drawer')
  }

  const backdrop = page.locator('[data-mobile-nav-backdrop]')
  await backdrop.waitFor({ state: 'visible' })
}

async function openMobileNav(page: Page) {
  await page.getByLabel('فتح قائمة التنقل').click()
  await page.waitForTimeout(300)
  await assertDrawerVisiblyOpen(page)
}

async function shot(page: Page, name: (typeof REQUIRED)[number], fullPage = false) {
  assertSafeOut()
  const dest = path.join(OUT, name)
  await page.screenshot({ path: dest, fullPage })
  const bytes = fs.statSync(dest).size
  if (bytes < 1000) throw new Error(`${name} too small (${bytes})`)
  console.log('wrote', name, bytes)
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  const r01Before = snapshotMtimes(ROUND01)
  const r02Before = snapshotMtimes(ROUND02)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ locale: 'ar-SY' })
  const page = await context.newPage()

  // Closed 360
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertNoDevBadge(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-closed-360-regression.png')

  // Open 360
  await openMobileNav(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-open-360-visible.png')

  // Open 390
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await openMobileNav(page)
  await assertNoHorizontalOverflow(page)
  await shot(page, 'mobile-nav-open-390-visible.png')

  // Keyboard focus on close control inside open drawer
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await openMobileNav(page)
  const close = page.locator('#waraqa-mobile-nav-panel label').filter({ hasText: 'إغلاق' })
  await close.focus()
  await expect(close).toBeFocused()
  await settle(page)
  await shot(page, 'mobile-nav-keyboard-focus.png')

  // Comparison: Round 02 open-360 vs Round 03 open-360
  const r02Open = path.join(ROUND02, 'mobile-nav-open-360-fixed.png')
  const r03Open = path.join(OUT, 'mobile-nav-open-360-visible.png')
  if (fs.existsSync(r02Open) && fs.existsSync(r03Open)) {
    const left = await sharp(r02Open).resize({ width: 360, withoutEnlargement: true }).png().toBuffer()
    const right = await sharp(r03Open).resize({ width: 360, withoutEnlargement: true }).png().toBuffer()
    const [lMeta, rMeta] = await Promise.all([sharp(left).metadata(), sharp(right).metadata()])
    const h = Math.max(lMeta.height ?? 400, rMeta.height ?? 400)
    const lPad = await sharp(left)
      .extend({ bottom: Math.max(0, h - (lMeta.height ?? 0)), background: '#f7f3ea' })
      .png()
      .toBuffer()
    const rPad = await sharp(right)
      .extend({ bottom: Math.max(0, h - (rMeta.height ?? 0)), background: '#f7f3ea' })
      .png()
      .toBuffer()
    const lw = (await sharp(lPad).metadata()).width ?? 360
    await sharp({
      create: {
        width: lw + 360 + 48,
        height: h + 64,
        channels: 3,
        background: '#f7f3ea',
      },
    })
      .composite([
        { input: lPad, left: 16, top: 48 },
        { input: rPad, left: lw + 32, top: 48 },
      ])
      .png()
      .toFile(path.join(OUT, 'comparison-round02-vs-round03.png'))
    console.log('wrote comparison-round02-vs-round03.png')
  } else {
    throw new Error('Missing Round 02 or Round 03 open-360 shots for comparison')
  }

  assertUnchanged(ROUND01, r01Before, 'Round 01')
  assertUnchanged(ROUND02, r02Before, 'Round 02')

  const files: Record<string, { bytes: number; gatePass: boolean; notes?: string }> = {}
  let allPass = true
  for (const name of REQUIRED) {
    const p = path.join(OUT, name)
    const exists = fs.existsSync(p)
    const bytes = exists ? fs.statSync(p).size : 0
    const gatePass = exists && bytes > 1000
    if (!gatePass) allPass = false
    files[name] = {
      bytes,
      gatePass,
      notes:
        name.includes('open') && name.includes('visible')
          ? 'Pre-shot: labels + badge + panel min 280x200 + viewport intersection'
          : undefined,
    }
  }

  const inventory = {
    phase: 5,
    round: 'round-03-mobile-nav-visual-closure',
    productionOnly: true,
    round01Untouched: true,
    round02Untouched: true,
    gatePass: allPass,
    rootCause:
      'Fixed descendants lived inside sticky header with backdrop-blur; backdrop-filter made fixed use a ~64px header containing block, clipping drawer links.',
    files,
  }
  fs.writeFileSync(INVENTORY, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
  if (!allPass) throw new Error('screenshot-inventory gatePass=false')

  await browser.close()
  console.log('Phase 5 Round 03 capture complete →', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

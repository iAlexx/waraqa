/**
 * Phase 6 Round 02 — Search results visual closure captures.
 * Writes ONLY under docs/qa/phase-6/revisions/round-02-search-results-visual-closure/
 * Does NOT modify Round 01, approved/, or Phase 1–5 QA folders.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-6/revisions/round-02-search-results-visual-closure')
const ROUND01 = path.join(ROOT, 'docs/qa/phase-6/revisions/round-01-search-engine-results')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'search-results-cards-desktop-1440.png',
  'search-results-cards-tablet-768.png',
  'search-results-cards-mobile-390.png',
  'search-results-cards-mobile-360.png',
  'search-single-result-card.png',
  'search-multiple-results-density.png',
  'search-results-keyboard-focus.png',
  'search-pagination-refined.png',
  'comparison-round01-vs-round02.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-02-search-results-visual-closure`)) {
    throw new Error('Unsafe OUT path')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`)) {
    throw new Error('Refusing approved/')
  }
  if (OUT.includes('round-01')) {
    throw new Error('Refusing Round 01 path')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(250)
}

async function assertCardLayout(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })
  if (overflow) throw new Error('Horizontal overflow detected')

  const cards = page.locator('[data-search-result-card]')
  const count = await cards.count()
  if (count < 1) throw new Error('Expected at least one result card')

  const viewport = page.viewportSize()!
  for (let i = 0; i < Math.min(count, 5); i++) {
    const card = cards.nth(i)
    const box = await card.boundingBox()
    if (!box) throw new Error(`Card ${i} missing box`)
    if (box.width < viewport.width * 0.65) {
      throw new Error(`Card ${i} too narrow: ${box.width} vs viewport ${viewport.width}`)
    }
    const border = await card.evaluate((el) => getComputedStyle(el).borderTopWidth)
    if (!border || border === '0px') throw new Error(`Card ${i} missing visible border`)
    await expectVisible(card.locator('[data-search-result-cta]'))
  }

  // Consistent gaps between first two cards when multiple
  if (count >= 2) {
    const a = await cards.nth(0).boundingBox()
    const b = await cards.nth(1).boundingBox()
    if (a && b) {
      const gap = b.y - (a.y + a.height)
      if (gap < 8 || gap > 28) throw new Error(`Inconsistent card gap: ${gap}`)
    }
  }

  // Demo label present somewhere for fixture data
  const demo = page.getByText('بيانات تجريبية')
  if ((await demo.count()) < 1) {
    console.warn('Warning: no تجريبي badge visible on this query')
  }
}

async function expectVisible(locator: ReturnType<Page['locator']>) {
  const count = await locator.count()
  if (count < 1) throw new Error('Expected visible CTA')
  const box = await locator.first().boundingBox()
  if (!box || box.width < 8 || box.height < 8) throw new Error('CTA not visible')
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  const st = fs.statSync(file)
  if (st.size < 500) throw new Error(`Screenshot too small: ${name}`)
  console.log('wrote', name, st.size)
}

async function writeComparison() {
  const r01 = path.join(ROUND01, 'search-desktop-results-1440.png')
  const r02 = path.join(OUT, 'search-results-cards-desktop-1440.png')
  if (!fs.existsSync(r01) || !fs.existsSync(r02)) {
    throw new Error('Missing Round 01 or Round 02 desktop shot for comparison')
  }
  const left = sharp(r01).resize({ width: 720, withoutEnlargement: true })
  const right = sharp(r02).resize({ width: 720, withoutEnlargement: true })
  const leftMeta = await left.metadata()
  const rightMeta = await right.metadata()
  const h = Math.max(leftMeta.height ?? 800, rightMeta.height ?? 800)
  const canvas = sharp({
    create: {
      width: 1440 + 24,
      height: h + 48,
      channels: 3,
      background: { r: 245, g: 242, b: 235 },
    },
  })
  const leftBuf = await left.extend({ top: 0, bottom: Math.max(0, h - (leftMeta.height ?? 0)), background: '#f5f2eb' }).png().toBuffer()
  const rightBuf = await right.extend({ top: 0, bottom: Math.max(0, h - (rightMeta.height ?? 0)), background: '#f5f2eb' }).png().toBuffer()
  await canvas
    .composite([
      { input: leftBuf, left: 8, top: 32 },
      { input: rightBuf, left: 744, top: 32 },
    ])
    .png()
    .toFile(path.join(OUT, 'comparison-round01-vs-round02.png'))
  console.log('wrote comparison-round01-vs-round02.png')
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  // Prove Round 01 untouched by recording mtimes before/after would be capture-time;
  // we never write into ROUND01.
  const r01Before = fs.readdirSync(ROUND01).map((n) => {
    const st = fs.statSync(path.join(ROUND01, n))
    return { n, mtimeMs: st.mtimeMs, size: st.size }
  })

  const fixtureSrc = path.join(ROUND01, 'fixture-manifest.json')
  if (!fs.existsSync(fixtureSrc)) {
    throw new Error('Round 01 fixture-manifest missing — seed/search fixture required')
  }
  const fixture = JSON.parse(fs.readFileSync(fixtureSrc, 'utf8')) as {
    sampleQueries: string[]
  }
  fs.writeFileSync(
    path.join(OUT, 'fixture-manifest.json'),
    `${JSON.stringify(
      {
        phase: 6,
        round: 'round-02-search-results-visual-closure',
        reusedFrom: 'round-01-search-engine-results',
        redacted: true,
        credentials: 'none',
        sampleQueries: fixture.sampleQueries,
        note: 'Visual closure only — no new seed credentials; reuses Round 01 fixture data in DB if present',
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const browser = await chromium.launch()
  const context = await browser.newContext({ locale: 'ar-SY', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const multiQ = encodeURIComponent('معاملة ترقيم بحث تجريبية')
  const singleQ = encodeURIComponent('لا حكم عليه')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await shot(page, 'search-results-cards-desktop-1440.png')
  await shot(page, 'search-multiple-results-density.png')

  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await shot(page, 'search-results-cards-tablet-768.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await shot(page, 'search-results-cards-mobile-390.png')

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await shot(page, 'search-results-cards-mobile-360.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search?q=${singleQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await shot(page, 'search-single-result-card.png')

  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  const titleLink = page.locator('[data-search-result-title]').first()
  await titleLink.focus()
  await shot(page, 'search-results-keyboard-focus.png')

  await page.goto(`${BASE}/search?q=${multiQ}&page=2`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCardLayout(page)
  await expectVisible(page.locator('[data-search-pagination]'))
  await shot(page, 'search-pagination-refined.png')

  await browser.close()
  await writeComparison()

  const r01After = fs.readdirSync(ROUND01).map((n) => {
    const st = fs.statSync(path.join(ROUND01, n))
    return { n, mtimeMs: st.mtimeMs, size: st.size }
  })
  const beforeMap = new Map(r01Before.map((r) => [r.n, r]))
  for (const row of r01After) {
    const prev = beforeMap.get(row.n)
    if (!prev || prev.mtimeMs !== row.mtimeMs || prev.size !== row.size) {
      throw new Error(`Round 01 file changed: ${row.n}`)
    }
  }

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
        round: 'round-02-search-results-visual-closure',
        productionOnly: true,
        round01Untouched: true,
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
  console.log('Phase 6 Round 02 capture OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

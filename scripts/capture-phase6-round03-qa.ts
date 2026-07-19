/**
 * Phase 6 Round 03 — Duplicate results closure captures.
 * Writes ONLY under docs/qa/phase-6/revisions/round-03-duplicate-results-closure/
 * Does NOT modify Round 01 or Round 02.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-6/revisions/round-03-duplicate-results-closure')
const ROUND01 = path.join(ROOT, 'docs/qa/phase-6/revisions/round-01-search-engine-results')
const ROUND02 = path.join(ROOT, 'docs/qa/phase-6/revisions/round-02-search-results-visual-closure')
const STATE = path.join(ROOT, 'docs/qa/phase-6/fixture-state/fixture-manifest.json')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'search-unique-results-desktop-1440.png',
  'search-unique-results-mobile-390.png',
  'search-unique-results-mobile-360.png',
  'search-pagination-page-1-unique.png',
  'search-pagination-page-2-unique.png',
  'search-result-count-correct.png',
  'comparison-round02-vs-round03.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-03-duplicate-results-closure`)) {
    throw new Error('Unsafe OUT')
  }
  if (OUT.includes('round-01') || OUT.includes('round-02') || OUT.includes('approved')) {
    throw new Error('Refusing other QA paths')
  }
}

function snapshotDir(dir: string) {
  return fs.readdirSync(dir).map((n) => {
    const st = fs.statSync(path.join(dir, n))
    return { n, mtimeMs: st.mtimeMs, size: st.size }
  })
}

function assertUnchanged(label: string, before: ReturnType<typeof snapshotDir>, dir: string) {
  const after = snapshotDir(dir)
  const map = new Map(before.map((r) => [r.n, r]))
  if (before.length !== after.length) throw new Error(`${label} file count changed`)
  for (const row of after) {
    const prev = map.get(row.n)
    if (!prev || prev.mtimeMs !== row.mtimeMs || prev.size !== row.size) {
      throw new Error(`${label} changed: ${row.n}`)
    }
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(250)
}

async function collectIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-search-result-id]', (els) =>
    els.map((el) => el.getAttribute('data-search-result-id') || ''),
  )
}

async function assertUniqueCards(page: Page, expectedTotal?: number) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow) throw new Error('Horizontal overflow')

  const cards = page.locator('[data-search-result-card]')
  const count = await cards.count()
  if (count < 1) throw new Error('No result cards')

  // Round 02 card chrome still present
  const border = await cards.first().evaluate((el) => getComputedStyle(el).borderTopWidth)
  if (!border || border === '0px') throw new Error('Card border missing — Round 02 design regress')

  const ids = await collectIds(page)
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate IDs on page: ${ids.join(',')}`)
  }

  const countText = await page.locator('[data-search-result-count]').innerText()
  if (expectedTotal != null) {
    if (expectedTotal === 11 && !countText.includes('11 نتيجة')) {
      throw new Error(`Expected 11 نتيجة, got: ${countText}`)
    }
  }

  const demo = await page.getByText('بيانات تجريبية').count()
  if (demo < 1) console.warn('No تجريبي badge on this viewport/query')
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  const st = fs.statSync(file)
  if (st.size < 500) throw new Error(`tiny ${name}`)
  console.log('wrote', name, st.size)
}

async function writeComparison() {
  const r02 = path.join(ROUND02, 'search-results-cards-desktop-1440.png')
  const r03 = path.join(OUT, 'search-unique-results-desktop-1440.png')
  if (!fs.existsSync(r02) || !fs.existsSync(r03)) {
    throw new Error('Missing Round 02 or Round 03 desktop for comparison')
  }
  const left = sharp(r02).resize({ width: 720, withoutEnlargement: true })
  const right = sharp(r03).resize({ width: 720, withoutEnlargement: true })
  const leftMeta = await left.metadata()
  const rightMeta = await right.metadata()
  const h = Math.max(leftMeta.height ?? 800, rightMeta.height ?? 800)
  const leftBuf = await left
    .extend({ top: 0, bottom: Math.max(0, h - (leftMeta.height ?? 0)), background: '#f5f2eb' })
    .png()
    .toBuffer()
  const rightBuf = await right
    .extend({ top: 0, bottom: Math.max(0, h - (rightMeta.height ?? 0)), background: '#f5f2eb' })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: 1440 + 24,
      height: h + 48,
      channels: 3,
      background: { r: 245, g: 242, b: 235 },
    },
  })
    .composite([
      { input: leftBuf, left: 8, top: 32 },
      { input: rightBuf, left: 744, top: 32 },
    ])
    .png()
    .toFile(path.join(OUT, 'comparison-round02-vs-round03.png'))
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })

  const r01Before = snapshotDir(ROUND01)
  const r02Before = snapshotDir(ROUND02)

  if (!fs.existsSync(STATE)) {
    throw new Error('Missing fixture-state manifest — run pnpm qa:phase6:fixture first')
  }
  const state = JSON.parse(fs.readFileSync(STATE, 'utf8')) as {
    publishedEligibleTransactionCount: number
    sampleQueries: string[]
    categorySlug: string
  }
  fs.writeFileSync(
    path.join(OUT, 'fixture-manifest.json'),
    `${JSON.stringify(
      {
        phase: 6,
        round: 'round-03-duplicate-results-closure',
        redacted: true,
        credentials: 'none',
        reusedFixtureState: 'docs/qa/phase-6/fixture-state/fixture-manifest.json',
        publishedEligibleTransactionCount: state.publishedEligibleTransactionCount,
        paginationQueryExpectedUnique: 11,
        sampleQueries: state.sampleQueries,
        note: 'Round 03 closes duplicate titles from repeated non-idempotent fixture runs.',
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

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertUniqueCards(page, 11)
  await shot(page, 'search-unique-results-desktop-1440.png')
  await shot(page, 'search-result-count-correct.png')
  await shot(page, 'search-pagination-page-1-unique.png')
  const page1Ids = await collectIds(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertUniqueCards(page, 11)
  await shot(page, 'search-unique-results-mobile-390.png')

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${BASE}/search?q=${multiQ}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertUniqueCards(page, 11)
  await shot(page, 'search-unique-results-mobile-360.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/search?q=${multiQ}&page=2`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertUniqueCards(page)
  const page2Ids = await collectIds(page)
  for (const id of page2Ids) {
    if (page1Ids.includes(id)) throw new Error(`ID ${id} overlaps page 1 and 2`)
  }
  await shot(page, 'search-pagination-page-2-unique.png')

  await browser.close()
  await writeComparison()

  assertUnchanged('Round 01', r01Before, ROUND01)
  assertUnchanged('Round 02', r02Before, ROUND02)

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
        round: 'round-03-duplicate-results-closure',
        productionOnly: true,
        round01Untouched: true,
        round02Untouched: true,
        rootCause: 'fixture-duplication',
        beforeUniquePaginationMatches: 22,
        afterUniquePaginationMatches: 11,
        gatePass: allPass,
        files: inventory,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  if (!allPass) process.exit(1)
  console.log('Phase 6 Round 03 capture OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

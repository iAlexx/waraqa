/**
 * Phase 7 Round 02 — Transaction detail visual closure captures.
 * Writes ONLY under docs/qa/phase-7/revisions/round-02-transaction-detail-visual-closure/
 * Does NOT modify Round 01, approved/, or Phase 1–6 QA folders.
 */
import { chromium, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-7/revisions/round-02-transaction-detail-visual-closure')
const ROUND01 = path.join(ROOT, 'docs/qa/phase-7/revisions/round-01-public-transaction-details')
const STATE_MANIFEST = path.join(ROOT, 'docs/qa/phase-7/fixture-state/fixture-manifest.json')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

/** Round 01 inventory SHA-256 — capture fails if Round 01 was modified. */
const ROUND01_INVENTORY_SHA256 =
  '56D69A7AD32A35D2966DB3D8E9EDC793311848DE22443D7477C73B3AA3E5139B'

const REQUIRED = [
  'detail-desktop-1440-width-fixed.png',
  'detail-desktop-minimal-balanced.png',
  'detail-desktop-long-content-fixed.png',
  'detail-tablet-768-regression.png',
  'detail-mobile-390-regression.png',
  'required-documents-focused.png',
  'steps-and-fees-focused.png',
  'service-centers-focused.png',
  'sources-focused-long-url.png',
  'loading-state-balanced.png',
  'error-state-with-retry.png',
  'not-found-balanced.png',
  'comparison-round01-vs-round02.png',
] as const

type ShotMeta = {
  bytes: number
  gatePass: boolean
  viewport: { width: number; height: number }
  expectedViewport: { width: number; height: number }
  focusedSection?: string
  overflowOk: boolean
}

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-02-transaction-detail-visual-closure`)) {
    throw new Error('Unsafe OUT path')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`)) {
    throw new Error('Refusing approved/')
  }
  if (OUT.includes('round-01')) {
    throw new Error('Refusing Round 01 path')
  }
}

function assertRound01Untouched() {
  const inv = path.join(ROUND01, 'screenshot-inventory.json')
  if (!fs.existsSync(inv)) throw new Error('Round 01 inventory missing')
  const hash = crypto.createHash('sha256').update(fs.readFileSync(inv)).digest('hex').toUpperCase()
  if (hash !== ROUND01_INVENTORY_SHA256) {
    throw new Error(`Round 01 inventory hash changed: ${hash}`)
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(220)
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow) throw new Error('Horizontal overflow detected')
}

async function assertCenteredRail(page: Page) {
  const ok = await page.evaluate(() => {
    const article = document.querySelector('[data-transaction-detail]')
    if (!article) return false
    const rail = article.firstElementChild as HTMLElement | null
    if (!rail) return false
    const a = article.getBoundingClientRect()
    const r = rail.getBoundingClientRect()
    const leftGap = r.left - a.left
    const rightGap = a.right - r.right
    // Rail should not hug one edge with a huge opposite empty region.
    if (Math.abs(leftGap - rightGap) > 48) return false
    // At wide viewports, rail should use a substantial share of the container.
    if (a.width > 900 && r.width < a.width * 0.55) return false
    return true
  })
  if (!ok) throw new Error('Desktop content rail not centered / too narrow')
}

async function assertSectionInView(page: Page, selector: string) {
  const visible = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    return rect.top < vh * 0.85 && rect.bottom > vh * 0.15
  }, selector)
  if (!visible) throw new Error(`Focused section not in viewport: ${selector}`)
}

async function assertNoDevArtifacts(page: Page) {
  const bad = await page.locator('text=/Next.js|Turbopack|webpack|__NEXT_DATA__/i').count()
  if (bad > 0) throw new Error('Development-only UI artifacts visible')
}

async function shot(
  page: Page,
  name: string,
  expected: { width: number; height: number },
  metas: Record<string, ShotMeta>,
  opts?: { fullPage?: boolean; focusedSection?: string },
) {
  const vp = page.viewportSize()
  if (!vp || vp.width !== expected.width || vp.height !== expected.height) {
    throw new Error(
      `Viewport mismatch for ${name}: got ${vp?.width}x${vp?.height}, expected ${expected.width}x${expected.height}`,
    )
  }
  await assertNoOverflow(page)
  await assertNoDevArtifacts(page)
  if (opts?.focusedSection) {
    await assertSectionInView(page, opts.focusedSection)
  }

  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: opts?.fullPage ?? false })
  const st = fs.statSync(file)
  if (st.size < 500) throw new Error(`Screenshot too small: ${name}`)
  metas[name] = {
    bytes: st.size,
    gatePass: true,
    viewport: { width: vp.width, height: vp.height },
    expectedViewport: expected,
    focusedSection: opts?.focusedSection,
    overflowOk: true,
  }
  console.log('wrote', name, st.size)
}

async function main() {
  assertSafeOut()
  assertRound01Untouched()
  fs.mkdirSync(OUT, { recursive: true })

  if (!fs.existsSync(STATE_MANIFEST)) {
    throw new Error('Missing fixture-state — run qa:phase7:fixture first')
  }
  const fixture = JSON.parse(fs.readFileSync(STATE_MANIFEST, 'utf8')) as {
    detailSlugs: { complete: string; minimal: string; long: string }
  }
  const complete = fixture.detailSlugs.complete
  const minimal = fixture.detailSlugs.minimal
  const long = fixture.detailSlugs.long
  const metas: Record<string, ShotMeta> = {}

  const v1440 = { width: 1440, height: 900 }
  const v768 = { width: 768, height: 900 }
  const v390 = { width: 390, height: 844 }

  const browser = await chromium.launch()
  const context = await browser.newContext({ locale: 'ar-SY', viewport: v1440 })
  const page = await context.newPage()

  await page.setViewportSize(v1440)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCenteredRail(page)
  await shot(page, 'detail-desktop-1440-width-fixed.png', v1440, metas, { fullPage: true })

  await page.goto(`${BASE}/transactions/${minimal}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCenteredRail(page)
  await shot(page, 'detail-desktop-minimal-balanced.png', v1440, metas, { fullPage: true })

  await page.goto(`${BASE}/transactions/${long}`, { waitUntil: 'networkidle' })
  await settle(page)
  await assertCenteredRail(page)
  await shot(page, 'detail-desktop-long-content-fixed.png', v1440, metas, { fullPage: true })

  await page.setViewportSize(v768)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-tablet-768-regression.png', v768, metas, { fullPage: true })

  await page.setViewportSize(v390)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'detail-mobile-390-regression.png', v390, metas, { fullPage: true })

  await page.setViewportSize(v1440)
  await page.goto(`${BASE}/transactions/${complete}`, { waitUntil: 'networkidle' })
  await settle(page)
  await page.locator('[data-section="documents"]').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'required-documents-focused.png', v1440, metas, {
    focusedSection: '[data-section="documents"]',
  })

  await page.locator('[data-section="steps"]').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'steps-and-fees-focused.png', v1440, metas, {
    focusedSection: '[data-section="steps"]',
  })
  // Ensure fees section exists for owner review context (same page, sequential cards)
  if ((await page.locator('[data-section="fees"]').count()) < 1) {
    throw new Error('Expected fees section on complete fixture')
  }

  await page.locator('[data-section="centers"]').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'service-centers-focused.png', v1440, metas, {
    focusedSection: '[data-section="centers"]',
  })

  await page.locator('[data-section="sources"]').scrollIntoViewIfNeeded()
  await settle(page)
  await shot(page, 'sources-focused-long-url.png', v1440, metas, {
    focusedSection: '[data-section="sources"]',
  })

  await page.goto(`${BASE}/transactions/${complete}?qaLoading=1`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'loading-state-balanced.png', v1440, metas, { fullPage: true })

  await page.goto(`${BASE}/transactions/${complete}?qaError=1`, { waitUntil: 'networkidle' })
  await settle(page)
  if ((await page.locator('[data-error-retry]').count()) < 1) {
    throw new Error('Expected retry control on error state')
  }
  await shot(page, 'error-state-with-retry.png', v1440, metas, { fullPage: true })

  await page.goto(`${BASE}/transactions/qa-p7-does-not-exist`, { waitUntil: 'networkidle' })
  await settle(page)
  await shot(page, 'not-found-balanced.png', v1440, metas, { fullPage: true })

  await browser.close()

  // Side-by-side comparison Round 01 vs Round 02 desktop
  const r01 = path.join(ROUND01, 'detail-desktop-1440.png')
  const r02 = path.join(OUT, 'detail-desktop-1440-width-fixed.png')
  if (!fs.existsSync(r01) || !fs.existsSync(r02)) {
    throw new Error('Missing comparison source screenshots')
  }
  const left = sharp(r01).resize({ width: 720, withoutEnlargement: true })
  const right = sharp(r02).resize({ width: 720, withoutEnlargement: true })
  const [lBuf, rBuf] = await Promise.all([left.toBuffer(), right.toBuffer()])
  const lMeta = await sharp(lBuf).metadata()
  const rMeta = await sharp(rBuf).metadata()
  const height = Math.max(lMeta.height ?? 900, rMeta.height ?? 900)
  const comparison = await sharp({
    create: {
      width: 1460,
      height: height + 40,
      channels: 3,
      background: { r: 245, g: 242, b: 235 },
    },
  })
    .composite([
      { input: lBuf, top: 20, left: 10 },
      { input: rBuf, top: 20, left: 740 },
    ])
    .png()
    .toBuffer()
  const cmpPath = path.join(OUT, 'comparison-round01-vs-round02.png')
  fs.writeFileSync(cmpPath, comparison)
  metas['comparison-round01-vs-round02.png'] = {
    bytes: fs.statSync(cmpPath).size,
    gatePass: true,
    viewport: { width: 1460, height: height + 40 },
    expectedViewport: { width: 1460, height: height + 40 },
    overflowOk: true,
  }
  console.log('wrote comparison-round01-vs-round02.png')

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
    const gatePass = Boolean(exists && bytes > 500 && viewportOk && meta?.overflowOk)
    if (!gatePass) allPass = false
    if (!meta) {
      metas[name] = {
        bytes,
        gatePass: false,
        viewport: { width: 0, height: 0 },
        expectedViewport: { width: 0, height: 0 },
        overflowOk: false,
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
        round: 'round-02-transaction-detail-visual-closure',
        round01Untouched: true,
        round01InventorySha256: ROUND01_INVENTORY_SHA256,
        productionOnly: true,
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
  console.log('Phase 7 Round 02 capture OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

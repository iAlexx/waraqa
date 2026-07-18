/**
 * Deterministic Phase 2 visual QA captures (production-like server).
 *
 * Required:
 *   QA_REVISION_DIR=docs/qa/phase-2/revisions/round-XX-short-name
 *   QA_BASE_URL or PLAYWRIGHT_BASE_URL=http://127.0.0.1:PORT
 *
 * Never writes into docs/qa/phase-2/ root.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const revisionDir = process.env.QA_REVISION_DIR
if (!revisionDir) {
  throw new Error(
    'Set QA_REVISION_DIR to a new revisions/round-XX-* folder (never docs/qa/phase-2 root).',
  )
}

const OUT = path.resolve(revisionDir)
const BASE =
  process.env.QA_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  'http://127.0.0.1:3000'
const phase2Root = path.resolve('docs/qa/phase-2')

if (
  path.normalize(OUT) === path.normalize(phase2Root) ||
  !path.normalize(OUT).startsWith(path.normalize(path.join(phase2Root, 'revisions')))
) {
  throw new Error(
    `QA_REVISION_DIR must be under docs/qa/phase-2/revisions/. Got: ${OUT}`,
  )
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(600)
}

async function shotEl(page: Page, selector: string, name: string) {
  const file = path.join(OUT, name)
  const loc = page.locator(selector).first()
  await loc.waitFor({ state: 'visible', timeout: 20_000 })
  await loc.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
  })
  await page.waitForTimeout(200)
  await loc.screenshot({ path: file, animations: 'disabled' })
  console.log('wrote', file)
}

async function shotHome(page: Page, name: string) {
  const file = path.join(OUT, name)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('No viewport')

  const contentHeight = await page.evaluate(() =>
    Math.ceil(Math.max(document.body.getBoundingClientRect().height, 1)),
  )

  if (contentHeight <= viewport.height) {
    await page.screenshot({
      path: file,
      clip: { x: 0, y: 0, width: viewport.width, height: contentHeight },
    })
  } else {
    await page.screenshot({ path: file, fullPage: true })
  }
  console.log('wrote', file, `(body ${contentHeight}px)`)
}

/** Fail if a BrandMark screenshot is predominantly red/orange. */
async function assertNotRedWordmark(file: string) {
  const { data } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let redHeavy = 0
  let samples = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 200) continue
    if (r > 240 && g > 240 && b > 230) continue
    // skip very dark green backgrounds
    if (r < 40 && g < 80 && b < 70 && g >= r) continue
    samples++
    if (r > g + 25 && r > b + 20) redHeavy++
  }
  const ratio = samples ? redHeavy / samples : 0
  if (ratio >= 0.12) {
    throw new Error(
      `Wordmark appears red/orange in ${file}: redHeavy=${ratio.toFixed(3)} (${redHeavy}/${samples})`,
    )
  }
  console.log(`not-red ok ${path.basename(file)}: redHeavy=${ratio.toFixed(3)}`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  // Round 04 must remain untouched
  const round04 = path.join(
    phase2Root,
    'revisions',
    'round-04-wordmark-interlaced-star',
    'wordmark-aref-ruqaa-desktop.png',
  )
  if (!fs.existsSync(round04)) {
    throw new Error('Round 04 archive missing — aborting capture')
  }
  const round04Stat = fs.statSync(round04)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  for (const asset of [
    '/brand/waraqa-interlaced-star.svg',
    '/brand/waraqa-interlaced-star-dark.svg',
  ]) {
    const res = await page.request.get(`${BASE}${asset}`)
    if (res.status() !== 200) throw new Error(`${asset} HTTP ${res.status()}`)
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/dev/wordmark-lab`)
  await settle(page)
  await shotEl(page, '#wordmark-aref-ruqaa', 'wordmark-aref-ruqaa-desktop.png')
  await shotEl(page, '#wordmark-reversed-dark', 'wordmark-reversed-dark.png')
  await shotEl(page, '#wordmark-ink-print', 'wordmark-ink-print.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dev/wordmark-lab`)
  await settle(page)
  await shotEl(page, '#wordmark-aref-ruqaa', 'wordmark-aref-ruqaa-mobile.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/dev/design-system`)
  await settle(page)
  await shotEl(page, '#waraqa-interlaced-star-light', 'waraqa-interlaced-star-light.png')
  await shotEl(page, '#waraqa-interlaced-star-dark', 'waraqa-interlaced-star-dark.png')
  await shotEl(page, '#pattern-dark-band', 'pattern-dark-band-desktop.png')
  await shotEl(page, '#geometric-divider', 'geometric-divider.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dev/design-system`)
  await settle(page)
  await shotEl(page, '#pattern-dark-band', 'pattern-dark-band-mobile.png')

  await page.goto(`${BASE}/`)
  await settle(page)
  await shotHome(page, 'home-shell-mobile-390.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`)
  await settle(page)
  await shotHome(page, 'home-shell-desktop-1440.png')

  await browser.close()

  for (const f of [
    'wordmark-aref-ruqaa-desktop.png',
    'wordmark-aref-ruqaa-mobile.png',
    'home-shell-desktop-1440.png',
    'home-shell-mobile-390.png',
  ]) {
    await assertNotRedWordmark(path.join(OUT, f))
  }

  const round04After = fs.statSync(round04)
  if (round04After.mtimeMs !== round04Stat.mtimeMs || round04After.size !== round04Stat.size) {
    throw new Error('Round 04 archive was modified during capture — policy violation')
  }
  console.log('Round 04 preserved')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

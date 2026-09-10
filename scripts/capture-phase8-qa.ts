/**
 * Phase 8 Round 01 — Interactive guide QA captures.
 * Writes ONLY under docs/qa/phase-8/revisions/round-01-interactive-guide/
 * Does NOT touch approved/ or Phase 1–7 QA folders.
 *
 * Run fixture first: ALLOW_QA_FIXTURE=1 pnpm qa:phase8:fixture
 * Server: pnpm build && ALLOW_QA_EMPTY_STATES=1 pnpm start
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-8/revisions/round-01-interactive-guide')
const STATE_MANIFEST = path.join(ROOT, 'docs/qa/phase-8/fixture-state/fixture-manifest.json')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'detail-cta-guide-desktop-1440.png',
  'detail-no-cta-noguide-1440.png',
  'guide-landing-desktop-1440.png',
  'guide-question-mobile-390.png',
  'guide-result-checklist-desktop-1440.png',
  'guide-variant-selected-1440.png',
  'guide-restart-desktop-1440.png',
  'guide-keyboard-focus-1440.png',
  'guide-not-found.png',
  'guide-no-javascript.png',
  'guide-loading-state.png',
  'guide-error-state.png',
] as const

type ShotMeta = {
  bytes: number
  gatePass: boolean
  viewport: { width: number; height: number }
  expectedViewport: { width: number; height: number }
  notes?: string[]
}

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-01-interactive-guide`)) {
    throw new Error('Unsafe OUT path')
  }
  if (OUT.includes(`${path.sep}approved${path.sep}`)) {
    throw new Error('Refusing approved/')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
  })
  await page.waitForTimeout(250)
}

async function assertNoDevBadge(page: Page) {
  const badge = page.locator('#__next-build-watcher, [data-nextjs-toast], nextjs-portal')
  if ((await badge.count()) > 0) {
    throw new Error('Next.js development badge/toast detected — use production server (pnpm start)')
  }
}

async function assertNoPrivateLeak(page: Page) {
  const body = (await page.locator('body').innerText()).toLowerCase()
  const forbidden = [
    'searchtext',
    'internalnotes',
    'workflowstate',
    'guidedenabled',
    'decisionrules',
    'payload',
    '"fx_type"',
    'includeDocument',
  ]
  for (const token of forbidden) {
    if (body.includes(token.toLowerCase())) {
      throw new Error(`Private/internal token leaked in public UI: ${token}`)
    }
  }
}

async function shot(
  page: Page,
  name: string,
  expected: { width: number; height: number },
  metas: Record<string, ShotMeta>,
  notes: string[] = [],
) {
  await assertNoDevBadge(page)
  const vp = page.viewportSize()
  if (!vp || vp.width !== expected.width || vp.height !== expected.height) {
    throw new Error(
      `Viewport mismatch for ${name}: got ${vp?.width}x${vp?.height}, expected ${expected.width}x${expected.height}`,
    )
  }
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: true })
  const bytes = fs.statSync(file).size
  if (bytes < 1024) throw new Error(`Zero/small screenshot: ${name}`)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow) {
    throw new Error(`Horizontal overflow on ${name}`)
  }
  metas[name] = {
    bytes,
    gatePass: true,
    viewport: { width: vp.width, height: vp.height },
    expectedViewport: expected,
    notes,
  }
}

/** Click visible option label inside the guide (inputs are sr-only). */
async function pickOption(page: Page, label: string) {
  await page.locator('[data-guide-client] label').filter({ hasText: new RegExp(`^${label}$`) }).click()
}

/** Minor + first-time: guardian with why + variant_first */
async function answerMinorFirstTimeToResult(page: Page) {
  await pickOption(page, 'لا')
  await page.getByRole('button', { name: 'التالي' }).click()
  await pickOption(page, 'أول مرة')
  await page.getByRole('button', { name: 'عرض النتيجة' }).click()
  await page.getByRole('heading', { name: 'نتيجة التحضير' }).waitFor()
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server not reachable at ${BASE} — start with ALLOW_QA_EMPTY_STATES=1 pnpm start`)
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })
  await waitForServer()

  if (!fs.existsSync(STATE_MANIFEST)) {
    throw new Error('Missing fixture-state — run qa:phase8:fixture first')
  }
  const fixture = JSON.parse(fs.readFileSync(STATE_MANIFEST, 'utf8')) as {
    detailSlugs: { guide: string; noGuide: string }
    hiddenSlugs: { draft: string }
  }
  const guideSlug = fixture.detailSlugs.guide
  const noGuideSlug = fixture.detailSlugs.noGuide
  const draftSlug = fixture.hiddenSlugs.draft

  const browser = await chromium.launch()
  const metas: Record<string, ShotMeta> = {}
  const assertionNotes: string[] = []

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}`, { waitUntil: 'networkidle' })
    if ((await page.locator('[data-not-found]').count()) > 0) {
      throw new Error('Guide fixture detail not found — seed qa:phase8:fixture')
    }
    const cta = page.locator('[data-start-guide]')
    if ((await cta.count()) < 1) throw new Error('Expected CTA on guide-enabled detail')
    await expectText(cta, 'ابدأ الدليل التفاعلي')
    await assertNoPrivateLeak(page)
    await settle(page)
    await shot(page, 'detail-cta-guide-desktop-1440.png', { width: 1440, height: 900 }, metas, [
      'CTA visible on eligible guide transaction',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${noGuideSlug}`, { waitUntil: 'networkidle' })
    if ((await page.locator('[data-start-guide]').count()) > 0) {
      throw new Error('CTA must not appear on no-guide transaction')
    }
    await assertNoPrivateLeak(page)
    await settle(page)
    await shot(page, 'detail-no-cta-noguide-1440.png', { width: 1440, height: 900 }, metas, [
      'No guide CTA on published no-guide transaction',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide`, { waitUntil: 'networkidle' })
    await expectVisible(page, '[data-guide-page]')
    await expectVisible(page, '#guide-question-heading')
    const body = await page.locator('body').innerText()
    if (!body.includes('مستقلة')) throw new Error('Landing missing independence disclaimer')
    if (!body.includes('جهازك') && !body.includes('الجلسة')) {
      assertionNotes.push('Session privacy copy check: soft — disclaimer present')
    }
    await assertNoPrivateLeak(page)
    await settle(page)
    await shot(page, 'guide-landing-desktop-1440.png', { width: 1440, height: 900 }, metas, [
      'Disclaimer + first question',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide`, { waitUntil: 'networkidle' })
    await expectVisible(page, '#guide-question-heading')
    await settle(page)
    await shot(page, 'guide-question-mobile-390.png', { width: 390, height: 844 }, metas, [
      'Mobile 390 — no overflow enforced in shot()',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide`, { waitUntil: 'networkidle' })
    await answerMinorFirstTimeToResult(page)
    const body = await page.locator('body').innerText()
    if (!body.includes('نتيجة التحضير')) throw new Error('Result heading missing')
    if (!body.includes('مطلوب عموماً') && !body.includes('مطلوب حسب')) {
      throw new Error('Checklist kind labels missing')
    }
    if (!body.includes('لماذا')) throw new Error('Expected why explanation for conditional item')
    if (!body.includes('المتغير المحدد') && !body.includes('إصدار')) {
      throw new Error('Expected selected variant to be visible')
    }
    if (!body.includes('المصادر') && !body.includes('مصدر')) {
      assertionNotes.push('Sources section soft-check')
    }
    if (!body.includes('العودة لتفاصيل المعاملة')) {
      throw new Error('Missing link back to Phase 7 detail')
    }
    await assertNoPrivateLeak(page)
    await settle(page)
    await shot(page, 'guide-result-checklist-desktop-1440.png', { width: 1440, height: 900 }, metas, [
      'Minor+first-time result: kinds + why + checklist',
    ])

    // Distinct variant shot: scroll variant into view if present
    const variantBlock = page.getByText('المتغير المحدد')
    if ((await variantBlock.count()) > 0) {
      await variantBlock.first().scrollIntoViewIfNeeded()
    }
    await settle(page)
    await shot(page, 'guide-variant-selected-1440.png', { width: 1440, height: 900 }, metas, [
      'Selected variant visible after rule fire',
    ])

    await page.getByRole('button', { name: 'ابدأ من جديد' }).click()
    await page.locator('#guide-question-heading').waitFor()
    if ((await page.getByRole('heading', { name: 'نتيجة التحضير' }).count()) > 0) {
      throw new Error('Restart did not leave result view')
    }
    // Radios should be cleared
    const checked = await page.locator('input[type="radio"]:checked').count()
    if (checked > 0) throw new Error('Restart did not clear in-memory answers')
    await settle(page)
    await shot(page, 'guide-restart-desktop-1440.png', { width: 1440, height: 900 }, metas, [
      'Restart cleared answers and returned to first question',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide`, { waitUntil: 'networkidle' })
    const nextBtn = page.getByRole('button', { name: 'التالي' })
    await nextBtn.focus()
    await expectVisible(page, '[data-guide-client]')
    await settle(page)
    await shot(page, 'guide-keyboard-focus-1440.png', { width: 1440, height: 900 }, metas, [
      'Focus on التالي control',
    ])
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/qa-p8-does-not-exist/guide`, { waitUntil: 'networkidle' })
    await expectVisible(page, '[data-not-found]')
    await settle(page)
    await shot(page, 'guide-not-found.png', { width: 1440, height: 900 }, metas, [
      'Missing slug → uniform not-found',
    ])

    // Hidden draft also not-found
    await page.goto(`${BASE}/transactions/${draftSlug}/guide`, { waitUntil: 'networkidle' })
    await expectVisible(page, '[data-not-found]')
    assertionNotes.push('Draft guide slug returns not-found (asserted, not separate PNG)')
    await page.close()
  }

  {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await context.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide`, { waitUntil: 'load', timeout: 60_000 })
    const text = await page.locator('body').innerText()
    if (!text.includes('جافاسكريبت')) {
      throw new Error('Noscript fallback text missing')
    }
    if (text.includes('عم نحضر') || (await page.locator('[data-loading]').count()) > 0) {
      throw new Error('No-JS shows loading shell — should show noscript fallback')
    }
    await settle(page)
    await shot(page, 'guide-no-javascript.png', { width: 1440, height: 900 }, metas, [
      'Noscript fallback, not loading shell',
    ])
    await context.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide?qaLoading=1`, {
      waitUntil: 'networkidle',
    })
    if ((await page.locator('[data-guide-loading]').count()) < 1) {
      throw new Error('guide-loading-state requires ALLOW_QA_EMPTY_STATES=1 on production server')
    }
    await settle(page)
    await shot(page, 'guide-loading-state.png', { width: 1440, height: 900 }, metas)
    await page.close()
  }

  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/transactions/${guideSlug}/guide?qaError=1`, {
      waitUntil: 'networkidle',
    })
    if ((await page.locator('[data-guide-error]').count()) < 1) {
      throw new Error('guide-error-state requires ALLOW_QA_EMPTY_STATES=1 on production server')
    }
    await expectText(page.locator('[data-error-retry]'), 'إعادة المحاولة')
    await settle(page)
    await shot(page, 'guide-error-state.png', { width: 1440, height: 900 }, metas)
    await page.close()
  }

  await browser.close()

  let missing = 0
  let zeroByte = 0
  let gateFail = 0
  for (const name of REQUIRED) {
    const file = path.join(OUT, name)
    if (!fs.existsSync(file)) {
      missing += 1
      continue
    }
    const bytes = fs.statSync(file).size
    if (bytes < 1) zeroByte += 1
    if (!metas[name]?.gatePass) gateFail += 1
  }

  const gatePass = missing === 0 && zeroByte === 0 && gateFail === 0 && REQUIRED.length === 12

  const inventory = {
    phase: 8,
    round: 'round-01-interactive-guide',
    status: gatePass ? 'captured_complete' : 'captured_incomplete',
    capturedAt: new Date().toISOString(),
    baseUrl: BASE,
    fixtureSlugs: {
      guide: guideSlug,
      noGuide: noGuideSlug,
      draft: draftSlug,
    },
    requiredCount: REQUIRED.length,
    presentCount: REQUIRED.length - missing,
    missingCount: missing,
    zeroByteCount: zeroByte,
    gatePass,
    assertionNotes,
    required: REQUIRED.map((file) => ({
      file,
      present: fs.existsSync(path.join(OUT, file)),
      bytes: fs.existsSync(path.join(OUT, file)) ? fs.statSync(path.join(OUT, file)).size : 0,
      gatePass: Boolean(metas[file]?.gatePass),
      meta: metas[file] ?? null,
    })),
    shots: metas,
  }

  fs.writeFileSync(path.join(OUT, 'screenshot-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`)

  if (!gatePass) {
    throw new Error(
      `Capture inventory failed: missing=${missing} zeroByte=${zeroByte} gateFail=${gateFail}`,
    )
  }
  console.log('Phase 8 Round 01 capture OK →', OUT)
  console.log(JSON.stringify({ gatePass, presentCount: inventory.presentCount, missingCount: 0 }, null, 2))
}

async function expectVisible(page: Page, selector: string) {
  if ((await page.locator(selector).count()) < 1) {
    throw new Error(`Expected visible: ${selector}`)
  }
}

async function expectText(locator: ReturnType<Page['locator']>, text: string) {
  const t = await locator.first().innerText()
  if (!t.includes(text)) throw new Error(`Expected text «${text}», got «${t}»`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

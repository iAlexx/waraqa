/**
 * Phase 13 — hard-gate critical closure (public shell, DEMO content, a11y, overflow).
 *
 * Soft-skip of the WHOLE suite only when neither demo mode nor PHASE13_CI is set.
 * When WARAQA_PHASE13_CI=1 or WARAQA_PUBLIC_CONTENT_MODE=demo: missing Phase 12
 * content is a FAILURE (never soft-skip).
 *
 * Admin login smoke runs only if docs/qa/phase-13/.local-credentials exists.
 * That test must not mutate the Phase 12 catalog.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const DEMO_LABEL = 'بيانات تجريبية للعرض'
const GOLDEN = 'p12-demo-tx-secondary-equivalency'
const GOLDEN_TITLE = 'معادلة شهادة ثانوية غير سورية'

const PROCEDURES = [
  { slug: 'p12-demo-tx-secondary-equivalency', titleRe: /معادلة شهادة ثانوية غير سورية/ },
  { slug: 'p12-demo-tx-poa-mission', titleRe: /تنظيم وكالة/ },
  { slug: 'p12-demo-tx-marriage-mission', titleRe: /تسجيل زواج/ },
  { slug: 'p12-demo-tx-civil-extract-mission', titleRe: /وثيقة أحوال مدنية/ },
  { slug: 'p12-demo-tx-passport-renew-mission', titleRe: /تجديد جواز/ },
] as const

const VIEWPORTS = [320, 360, 390, 768, 1024, 1280, 1440] as const

const isDemoMode = (process.env.WARAQA_PUBLIC_CONTENT_MODE || '').toLowerCase() === 'demo'
const isPhase13Ci = process.env.WARAQA_PHASE13_CI === '1'
const hardGate = isDemoMode || isPhase13Ci

const credsPath = path.resolve('docs/qa/phase-13/.local-credentials')
const hasCreds = fs.existsSync(credsPath)
const creds = hasCreds
  ? (JSON.parse(fs.readFileSync(credsPath, 'utf8')) as {
      password: string
      users: {
        admin: { email: string; role?: string }
        reviewer?: { email: string; role?: string }
      }
    })
  : null

async function horizontalOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const docEl = document.documentElement
    return Math.max(
      docEl.scrollWidth - docEl.clientWidth,
      document.body.scrollWidth - document.body.clientWidth,
    )
  })
}

async function loginAdmin(page: Page, email: string, password: string) {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[name="email"], input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 })
  await emailInput.fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 }).catch(() => {})
}

/**
 * Reach Golden Demo guide result via non-Arab certificate path.
 * Fails hard when content/navigation is missing (no soft-skip under hard gate).
 */
async function reachGoldenGuideResult(page: Page) {
  const guideRes = await page.goto(`/transactions/${GOLDEN}/guide`)
  expect(guideRes?.status(), 'Golden guide HTTP').toBe(200)

  await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible({
    timeout: 15_000,
  })

  await page.locator('[data-guide-client] label').filter({ hasText: /غير عربية/ }).click()
  await page.getByRole('button', { name: /التالي|عرض النتيجة/ }).click()

  const nextOrResult = page.getByRole('button', { name: /التالي|عرض النتيجة/ })
  if (await nextOrResult.isVisible()) {
    const noLabel = page.locator('[data-guide-client] label').filter({ hasText: /^لا$/ })
    if (await noLabel.count()) {
      await noLabel.first().click()
    }
    await nextOrResult.click()
  }

  await expect(page.getByRole('heading', { name: /نتيجة|التحضير/ })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(/ترجمة عربية من مترجم محلّف/).first()).toBeVisible()
}

test.describe('Phase 13 critical closure', () => {
  test.beforeEach(() => {
    test.skip(
      !hardGate,
      'Set WARAQA_PHASE13_CI=1 or WARAQA_PUBLIC_CONTENT_MODE=demo to run Phase 13 hard gate',
    )
  })

  test('public shell: RTL, skip link, independence disclaimer, no overflow at 360/1440', async ({
    page,
  }) => {
    for (const width of [360, 1440] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar-SY')

      const footer = page.locator('footer')
      await expect(footer).toContainText('مستقلة')
      await expect(footer).toContainText('ليست موقعاً حكومياً')
      await expect(page.locator('[data-hero-disclaimer]')).toContainText('مستقلة')

      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'تخطّى إلى المحتوى' })
      await expect(skip).toBeFocused()

      const overflow = await horizontalOverflowPx(page)
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThan(8)
    }
  })

  test('axe home (wcag2a/wcag2aa) — no critical violations', async ({ page }) => {
    // Match frontend.e2e: no disableRules (including color-contrast).
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const critical = results.violations.filter((v) => v.impact === 'critical')
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([])
  })

  test('search no-results empty state without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    const nonsense = `zzzx-phase13-no-match-${Date.now()}`
    const res = await page.goto(`/search?q=${encodeURIComponent(nonsense)}`)
    expect(res?.ok(), 'search HTTP').toBeTruthy()
    await expect(page.locator('[data-search-page]')).toBeVisible()
    await expect(page.locator('[data-empty="search-no-results"]')).toBeVisible()
    await expect(page.getByText('ما لقينا معاملة مطابقة.').first()).toBeVisible()

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('search finds Golden Demo title and links to procedure', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(GOLDEN_TITLE)}`)
    const bySlug = page.locator(`a[href="/transactions/${GOLDEN}"]`)
    await expect(bySlug.first(), `search → ${GOLDEN}`).toBeVisible({ timeout: 15_000 })
  })

  test('five Phase12 procedure detail pages: 200, DEMO, no QA_TEST', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    for (const proc of PROCEDURES) {
      const res = await page.goto(`/transactions/${proc.slug}`)
      expect(res?.status(), `${proc.slug} HTTP`).toBe(200)
      await expect(page.getByRole('heading', { name: proc.titleRe }).first()).toBeVisible()
      await expect(page.getByText(DEMO_LABEL).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('QA_TEST')
    }

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('Golden Demo guide non-Arab path → result; WhatsApp share safe; print DOM', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    await page.setViewportSize({ width: 360, height: 800 })
    await reachGoldenGuideResult(page)

    const share = page.locator('[data-guide-whatsapp-share]')
    await expect(share.first()).toBeVisible()
    const href = await share.first().getAttribute('href')
    expect(href || '').not.toMatch(/certificate_origin|answers=|national|passport=\d|husband_syrian/)

    await expect(page.locator('[data-guide-print-sheet], [data-guide-print-button]').first()).toBeVisible()

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('report-information page loads for Golden Demo transaction', async ({ page }) => {
    const res = await page.goto(`/report-information?transaction=${GOLDEN}`)
    expect(res?.status(), 'report-information HTTP').toBe(200)
    await expect(page.locator('[data-report-page]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /بلّغنا عن معلومة/ })).toBeVisible()
  })

  test('404 for missing transaction slug', async ({ page }) => {
    await page.goto('/transactions/does-not-exist-phase13')
    await expect(page.locator('[data-not-found]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /غير موجودة/ })).toBeVisible()
  })

  test('axe on transaction detail and guide result — no critical', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1280, height: 900 })

    const detailRes = await page.goto(`/transactions/${GOLDEN}`)
    expect(detailRes?.status(), 'Golden detail HTTP').toBe(200)
    const detailAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    // Tolerate non-critical (serious/moderate/minor) only if they appear; never silence all rules.
    // Known carry-over candidates: nested landmark/list patterns under guide chrome — document if seen.
    const detailCritical = detailAxe.violations.filter((v) => v.impact === 'critical')
    expect(detailCritical, JSON.stringify(detailCritical, null, 2)).toEqual([])

    await reachGoldenGuideResult(page)
    const resultAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    // Non-critical WhatsApp/print control labeling may surface as serious — fail only on critical.
    const resultCritical = resultAxe.violations.filter((v) => v.impact === 'critical')
    expect(resultCritical, JSON.stringify(resultCritical, null, 2)).toEqual([])
  })

  test('viewport overflow matrix on home and Golden Demo detail', async ({ page }) => {
    test.setTimeout(180_000)

    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: 900 })

      await page.goto('/')
      const homeOverflow = await horizontalOverflowPx(page)
      expect(homeOverflow, `home overflow at ${width}px`).toBeLessThan(8)

      const detailRes = await page.goto(`/transactions/${GOLDEN}`)
      expect(detailRes?.status(), `Golden detail HTTP at ${width}px`).toBe(200)
      const detailOverflow = await horizontalOverflowPx(page)
      expect(detailOverflow, `detail overflow at ${width}px`).toBeLessThan(8)
    }
  })

  test('admin login smoke when phase-13 credentials exist', async ({ page }) => {
    test.skip(!hasCreds || !creds, 'docs/qa/phase-13/.local-credentials missing')
    if (!creds) return

    test.setTimeout(90_000)
    await loginAdmin(page, creds.users.admin.email, creds.password)
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin\/login/)

    const dashboard = page.locator('[data-waraqa-editorial-dashboard]')
    const collectionsNav = page.locator(
      'a[href*="/admin/collections"], [href="/admin/collections/transactions"]',
    )
    const sawDashboard = await dashboard.isVisible().catch(() => false)
    const sawCollections = (await collectionsNav.count()) > 0
    expect(sawDashboard || sawCollections).toBe(true)

    // Smoke only — do not open/edit Phase 12 catalog procedures.
  })
})

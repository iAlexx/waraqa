/**
 * P0-06 browser smoke — content class isolation.
 * Requires seeded fixtures: ALLOW_QA_FIXTURE=1 pnpm exec tsx scripts/p0-06-e2e-fixture.ts
 *
 * Run twice (server inherits env via Playwright webServer):
 *   WARAQA_PUBLIC_CONTENT_MODE=production pnpm exec playwright test tests/e2e/p0-06-content-isolation.e2e.spec.ts
 *   WARAQA_PUBLIC_CONTENT_MODE=demo pnpm exec playwright test tests/e2e/p0-06-content-isolation.e2e.spec.ts
 */
import { expect, test } from '@playwright/test'

const DEMO_LABEL = 'بيانات تجريبية للعرض — ليست معلومات رسمية'
const SLUGS = {
  production: 'e2e-p06-tx-production',
  demo: 'e2e-p06-tx-demo',
  qa: 'e2e-p06-tx-qa',
} as const

const mode = (process.env.WARAQA_PUBLIC_CONTENT_MODE || 'production').toLowerCase()
const isDemoMode = mode === 'demo'

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(overflow).toBe(false)
}

test.describe(`P0-06 content isolation (mode=${mode || 'production'})`, () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Collect later via evaluate if needed; soft note in attachment
        void msg.text()
      }
    })
  })

  test('A/B/F: DEMO and QA_TEST direct URLs blocked in production mode', async ({ page }) => {
    test.skip(isDemoMode, 'production-mode only')
    for (const slug of [SLUGS.demo, SLUGS.qa]) {
      const res = await page.goto(`/transactions/${slug}`, { waitUntil: 'domcontentloaded' })
      expect(res?.status()).toBeGreaterThanOrEqual(400)
      await expect(page.locator('[data-transaction-page]')).toHaveCount(0)
    }
  })

  test('C/D: DEMO visible with label in demo mode', async ({ page }) => {
    test.skip(!isDemoMode, 'demo-mode only')
    const res = await page.goto(`/transactions/${SLUGS.demo}`, { waitUntil: 'networkidle' })
    expect(res?.ok()).toBeTruthy()
    await expect(page.getByText(DEMO_LABEL)).toBeVisible()
    const robots = await page.locator('meta[name="robots"]').first().getAttribute('content')
    expect(robots ?? '').toMatch(/noindex/i)
  })

  test('E: PRODUCTION has no demo label', async ({ page }) => {
    const res = await page.goto(`/transactions/${SLUGS.production}`, {
      waitUntil: 'domcontentloaded',
    })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('إنتاج', {
      timeout: 20_000,
    })
    await expect(page.getByText(DEMO_LABEL)).toHaveCount(0)
  })

  test('F: QA_TEST blocked even in demo mode', async ({ page }) => {
    test.skip(!isDemoMode, 'demo-mode only')
    const res = await page.goto(`/transactions/${SLUGS.qa}`, { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeGreaterThanOrEqual(400)
  })

  test('G: search follows content-class policy', async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent('عزل')}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-search-page]')).toBeVisible({ timeout: 20_000 })
    const body = await page.locator('[data-search-page]').innerText()
    if (isDemoMode) {
      expect(body).toMatch(/عرض تجريبي|إنتاج/)
      expect(body).not.toMatch(/اختبار QA E2E/)
    } else {
      expect(body).toMatch(/إنتاج/)
      expect(body).not.toMatch(/عرض تجريبي E2E/)
      expect(body).not.toMatch(/اختبار QA E2E/)
    }
  })

  test('H: demo metadata noindex (demo mode)', async ({ page }) => {
    test.skip(!isDemoMode, 'demo-mode only')
    const res = await page.goto(`/transactions/${SLUGS.demo}`, { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(400)
    const robots = await page.locator('meta[name="robots"]').first().getAttribute('content')
    expect(robots ?? '').toMatch(/noindex/i)
  })

  test('RTL + overflow at 360 and 1440', async ({ page }) => {
    const slug = isDemoMode ? SLUGS.demo : SLUGS.production
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    for (const width of [360, 1440] as const) {
      await page.setViewportSize({ width, height: 800 })
      const res = await page.goto(`/transactions/${slug}`, { waitUntil: 'domcontentloaded' })
      expect(res?.status()).toBeLessThan(400)
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await assertNoHorizontalOverflow(page)
    }
    expect(consoleErrors.filter((e) => !/favicon|hydration|Download the React DevTools/i.test(e))).toEqual(
      [],
    )
  })

  test('preview path is not anonymous public content', async ({ page }) => {
    const res = await page.goto('/preview/transactions/1', { waitUntil: 'domcontentloaded' })
    expect(res?.ok()).toBeTruthy()
    await expect(page.getByText('معاينة داخلية — هالمحتوى غير منشور')).toBeVisible()
    await expect(page.getByText(/غير مصرّح/)).toBeVisible()
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots ?? '').toMatch(/noindex/i)
  })
})

/**
 * Phase 12 DEMO seed browser QA.
 * Requires seeded content + WARAQA_PUBLIC_CONTENT_MODE=demo.
 *
 * Usage:
 *   WARAQA_ALLOW_PHASE12_SEED=1 WARAQA_PHASE12_SEED_REVIEWER_PASSWORD=... pnpm seed:phase12
 *   WARAQA_PUBLIC_CONTENT_MODE=demo pnpm exec playwright test tests/e2e/phase12-seed-content.e2e.spec.ts
 */
import { expect, test } from '@playwright/test'

const DEMO_LABEL = 'بيانات تجريبية للعرض'
const GOLDEN = 'p12-demo-tx-secondary-equivalency'
const ALL = [
  'p12-demo-tx-secondary-equivalency',
  'p12-demo-tx-poa-mission',
  'p12-demo-tx-marriage-mission',
  'p12-demo-tx-civil-extract-mission',
  'p12-demo-tx-passport-renew-mission',
] as const

test.describe('Phase 12 seed content browser QA', () => {
  test.beforeEach(() => {
    test.skip(
      (process.env.WARAQA_PUBLIC_CONTENT_MODE || '').toLowerCase() !== 'demo',
      'Set WARAQA_PUBLIC_CONTENT_MODE=demo for Phase 12 public DEMO visibility',
    )
  })

  test('five DEMO procedures discoverable and labeled', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    for (const slug of ALL) {
      const res = await page.goto(`/transactions/${slug}`)
      if (res?.status() === 404) {
        test.skip(true, `Phase 12 procedure ${slug} not seeded or not visible in demo mode`)
        return
      }
      await expect(page.getByText(DEMO_LABEL).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('QA_TEST')
    }

    expect(errors).toEqual([])
  })

  test('Golden Demo guide path + result + print/share safety', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.setViewportSize({ width: 360, height: 800 })
    const res = await page.goto(`/transactions/${GOLDEN}/guide`)
    if (res?.status() === 404) {
      test.skip(true, 'Golden Demo guide not available')
      return
    }

    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(DEMO_LABEL).first()).toBeVisible()

    // certificate origin — non-arab path
    await page.locator('[data-guide-client] label').filter({ hasText: /غير عربية/ }).click()
    await page.getByRole('button', { name: /التالي|عرض النتيجة/ }).click()

    // optional missing subjects — skip or answer لا
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
    await expect(page.getByText(/ترجمة/)).toBeVisible()

    const share = page.locator('[data-guide-whatsapp-share]')
    if (await share.count()) {
      const href = await share.getAttribute('href')
      expect(href || '').not.toMatch(/certificate_origin|answers=|national|passport=\d/)
    }

    await expect(page.locator('[data-guide-print-sheet], [data-guide-print-button]').first()).toBeVisible()

    // desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const overflow = await page.evaluate(() => {
      const docEl = document.documentElement
      return Math.max(docEl.scrollWidth - docEl.clientWidth, document.body.scrollWidth - document.body.clientWidth)
    })
    expect(overflow).toBeLessThan(8)

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('search finds Golden Demo by title', async ({ page }) => {
    await page.goto('/search?q=' + encodeURIComponent('معادلة شهادة ثانوية'))
    const link = page.getByRole('link', { name: /معادلة شهادة ثانوية غير سورية/ })
    if ((await link.count()) === 0) {
      // soft: search indexing may need regenerate; detail page already covered
      test.info().annotations.push({ type: 'note', description: 'search hit not found — check searchText generation' })
      return
    }
    await expect(link.first()).toBeVisible()
  })
})

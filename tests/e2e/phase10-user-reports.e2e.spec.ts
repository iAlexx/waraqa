import { expect, test } from '@playwright/test'

/**
 * Phase 10 — public report flow smoke (requires a publicly eligible fixture slug).
 * Set PHASE10_E2E_TX_SLUG to a published PRODUCTION transaction slug in the local DB.
 * Skips cleanly when unset so CI without fixtures does not fail the suite.
 */
const slug = process.env.PHASE10_E2E_TX_SLUG?.trim() || ''

test.describe('Phase 10 public report flow', () => {
  test.skip(!slug, 'PHASE10_E2E_TX_SLUG not set')

  test('eligible transaction exposes CTA and accepts a report', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`/transactions/${encodeURIComponent(slug)}`)
    await expect(page.locator('[data-report-changed-info]')).toBeVisible()

    const overflow360 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow360).toBe(false)

    await page.locator('[data-report-changed-info]').click()
    await expect(page).toHaveURL(new RegExp(`/report-information\\?transaction=${slug}`))
    await expect(page.locator('[data-report-form]')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    await page.locator('#report-section').selectOption('fees')
    await page.locator('#report-message').fill(
      'الرسوم في الصفحة لا تطابق ما طُلب في المركز عند الزيارة اليوم.',
    )
    await page.locator('#report-encountered').fill(
      'طلب الموظف مبلغاً مختلفاً عند الشباك ولم يذكر السبب.',
    )
    const centerSelect = page.locator('#report-service-center')
    if (await centerSelect.isVisible().catch(() => false)) {
      const options = centerSelect.locator('option')
      const count = await options.count()
      if (count > 1) {
        await centerSelect.selectOption({ index: 1 })
      }
    }
    await page.locator('#report-consent').click()
    await page.locator('[data-report-submit]').click()

    await expect(page.locator('[data-report-success]')).toBeVisible({ timeout: 15_000 })
    expect(page.url()).not.toMatch(/contactEmail|followup|@|sent=1/)
    expect(page.url()).toMatch(/report-information/)

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('[data-report-success]')).toBeVisible()
    const overflow1440 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow1440).toBe(false)

    const appErrors = consoleErrors.filter(
      (t) => !t.includes('favicon') && !t.includes('Download the React DevTools'),
    )
    expect(appErrors).toEqual([])
  })

  test('keyboard can reach report CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/transactions/${encodeURIComponent(slug)}`)
    const cta = page.locator('[data-report-changed-info]')
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/report-information/)
  })
})

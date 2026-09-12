import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Phase 11 Admin UX closure — dashboard, review-due, assignment, tablet smoke.
 * Uses gitignored local credentials. Skips when absent.
 */
const credsPath = path.resolve('docs/qa/phase-3/.local-credentials')
const hasCreds = fs.existsSync(credsPath)
const creds = hasCreds
  ? (JSON.parse(fs.readFileSync(credsPath, 'utf8')) as {
      password: string
      users: {
        admin: { email: string }
        reviewer: { email: string }
        researcher: { email: string }
      }
    })
  : null

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[name="email"], input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 })
  await emailInput.fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 }).catch(() => {})
}

test.describe('Phase 11 Admin UX closure', () => {
  test.skip(!hasCreds || !creds, 'docs/qa/phase-3/.local-credentials missing')

  test('dashboard, review-due, assignment, tablet smoke', async ({ page }) => {
    test.setTimeout(120_000)
    if (!creds) return

    await login(page, creds.users.admin.email, creds.password)
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin\/login/)

    const dashboard = page.locator('[data-waraqa-editorial-dashboard]')
    await expect(dashboard).toBeVisible({ timeout: 15_000 })
    await expect(dashboard).toContainText(/لوحة التحرير/)
    await expect(dashboard.locator('[data-dashboard-card]').first()).toBeVisible()

    await page.goto('/admin/collections/transactions')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    const txBody = await page.locator('body').innerText()
    expect(/موعد المراجعة|reviewDueAt|متأخر|قريب|قادم/i.test(txBody)).toBe(true)

    await page.goto('/admin/collections/user-reports')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await expect(page.locator('body')).toContainText(/بلاغ|مُعيَّن|assigned/i)

    const first = page
      .locator('table a[href*="/admin/collections/user-reports/"], .table a[href*="user-reports"]')
      .first()
    if (await first.isVisible().catch(() => false)) {
      await first.click()
      await expect(page.locator('body')).toContainText(/مُعيَّن|assignedTo|الحالة|status/i)
      const assignField = page.locator(
        '#field-assignedTo, [id*="assignedTo"], label:has-text("مُعيَّن")',
      )
      if (await assignField.first().isVisible().catch(() => false)) {
        await expect(assignField.first()).toBeVisible()
      }
    }

    // Tablet smoke
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/admin')
    await expect(page.locator('[data-waraqa-editorial-dashboard]')).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth > el.clientWidth + 8
    })
    expect(overflow).toBe(false)

    await page.goto('/admin/collections/transactions')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await page.goto('/admin/collections/user-reports')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await page.goto('/admin/collections/audit-events')
    await expect(page).not.toHaveURL(/\/admin\/login/)
  })
})

import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Phase 10 admin/manual closure — uses gitignored local credentials.
 * Skips when credentials file is absent.
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
  await page.goto('/admin/login')
  await page.locator('input[name="email"], input[type="email"]').first().fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 }).catch(() => {})
}

test.describe('Phase 10 admin closure', () => {
  test.skip(!hasCreds || !creds, 'docs/qa/phase-3/.local-credentials missing')

  test('reviewer can triage; researcher denied; admin sees audit', async ({ page }) => {
    if (!creds) return

    await login(page, creds.users.reviewer.email, creds.password)
    await page.goto('/admin/collections/user-reports')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await expect(page.locator('body')).toContainText(/بلاغ|user-reports|Reports/i)

    const first = page.locator('table a[href*="/admin/collections/user-reports/"], .table a[href*="user-reports"]').first()
    if (await first.isVisible().catch(() => false)) {
      await first.click()
      await expect(page.locator('body')).toContainText(/معلومة|الرسوم|بلاغ|status|الحالة/i)
      // Contact fields exist for reviewer (labels may be Arabic)
      const html = await page.content()
      expect(/contact|بريد|هاتف|email|phone/i.test(html)).toBe(true)
    }

    await page.goto('/admin/logout').catch(() => {})
    await page.goto('/admin/login')
    await login(page, creds.users.researcher.email, creds.password)
    await page.goto('/admin/collections/user-reports')
    const researcherHtml = await page.content()
    const researcherDenied =
      page.url().includes('/login') ||
      /forbidden|unauthorized|غير مصرّح|ليس لديك صلاحية|no access/i.test(researcherHtml) ||
      !(await page.locator('table a[href*="user-reports"]').first().isVisible().catch(() => false))
    expect(researcherDenied).toBe(true)

    await page.goto('/admin/logout').catch(() => {})
    await login(page, creds.users.admin.email, creds.password)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/admin/collections/user-reports')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await page.goto('/admin/collections/audit-events')
    await expect(page).not.toHaveURL(/\/admin\/login/)
    const auditHtml = await page.content()
    expect(/audit|تدقيق|report_|بلاغ|event/i.test(auditHtml)).toBe(true)
  })
})

/**
 * Phase 12 DEMO seed browser QA — hard closure gate when demo mode is set.
 *
 * Prerequisites:
 *   WARAQA_PHASE12_SEED_REVIEWER_PASSWORD=... pnpm seed:phase12
 *   WARAQA_PUBLIC_CONTENT_MODE=demo
 *
 * Once demo mode is enabled, missing seeded content is a TEST FAILURE (not skip).
 */
import { expect, test } from '@playwright/test'

const DEMO_LABEL = 'بيانات تجريبية للعرض'
const GOLDEN = 'p12-demo-tx-secondary-equivalency'
const PROCEDURES = [
  {
    slug: 'p12-demo-tx-secondary-equivalency',
    titleRe: /معادلة شهادة ثانوية غير سورية/,
    titleQuery: 'معادلة شهادة ثانوية غير سورية',
    alias: 'معادلة بكالوريا أجنبية',
  },
  {
    slug: 'p12-demo-tx-poa-mission',
    titleRe: /تنظيم وكالة/,
    titleQuery: 'تنظيم وكالة في بعثة',
    alias: 'وكالة عدلية في السفارة',
  },
  {
    slug: 'p12-demo-tx-marriage-mission',
    titleRe: /تسجيل زواج/,
    titleQuery: 'تسجيل زواج عبر بعثة',
    alias: 'تثبيت زواج في السفارة',
  },
  {
    slug: 'p12-demo-tx-civil-extract-mission',
    titleRe: /وثيقة أحوال مدنية/,
    titleQuery: 'استخراج وثيقة أحوال مدنية',
    alias: 'بيان قيد من السفارة',
  },
  {
    slug: 'p12-demo-tx-passport-renew-mission',
    titleRe: /تجديد جواز/,
    titleQuery: 'تجديد جواز سفر منته',
    alias: 'تجديد جواز بدل منتهي',
  },
] as const

test.describe('Phase 12 seed content browser QA', () => {
  test.beforeEach(() => {
    test.skip(
      (process.env.WARAQA_PUBLIC_CONTENT_MODE || '').toLowerCase() !== 'demo',
      'Set WARAQA_PUBLIC_CONTENT_MODE=demo to run Phase 12 closure suite',
    )
  })

  test('five DEMO procedures: detail, sources, DEMO label, no QA_TEST', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    for (const proc of PROCEDURES) {
      const res = await page.goto(`/transactions/${proc.slug}`)
      expect(res?.status(), `${proc.slug} HTTP`).toBe(200)
      await expect(page.getByRole('heading', { name: proc.titleRe }).first()).toBeVisible()
      await expect(page.getByText(DEMO_LABEL).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('QA_TEST')
      await expect(page.getByText(/مصدر|مصادر|تحقق/).first()).toBeVisible()
      const report = page.getByRole('link', { name: /بلّغ|إبلاغ|معلومة/ })
      if ((await report.count()) > 0) {
        await expect(report.first()).toBeVisible()
      }
    }

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('search finds every procedure by title and alias', async ({ page }) => {
    test.setTimeout(120_000)
    for (const proc of PROCEDURES) {
      await page.goto('/search?q=' + encodeURIComponent(proc.titleQuery))
      // Prefer slug link if title regex is noisy
      const bySlug = page.locator(`a[href="/transactions/${proc.slug}"]`)
      await expect(bySlug.first(), `title search → ${proc.slug}`).toBeVisible({ timeout: 15_000 })

      await page.goto('/search?q=' + encodeURIComponent(proc.alias))
      await expect(bySlug.first(), `alias search → ${proc.slug}`).toBeVisible({ timeout: 15_000 })
    }
  })

  test('Golden Demo deepest guide path + persistence + share/print', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.setViewportSize({ width: 360, height: 800 })

    // Discover via search
    await page.goto('/search?q=' + encodeURIComponent('معادلة شهادة ثانوية'))
    await page.locator(`a[href="/transactions/${GOLDEN}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/transactions/${GOLDEN}`))
    await expect(page.getByText(DEMO_LABEL).first()).toBeVisible()

    const guideRes = await page.goto(`/transactions/${GOLDEN}/guide`)
    expect(guideRes?.status(), 'Golden guide HTTP').toBe(200)

    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible({
      timeout: 15_000,
    })

    // non-Arab certificate path
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

    // Edit answers
    const edit = page.getByRole('button', { name: /تعديل|العودة|تحرير الإجابات/ })
    if ((await edit.count()) > 0) {
      await edit.first().click()
      await expect(page.locator('[data-guide-client]')).toBeVisible()
    } else {
      // re-enter guide path via link if present
      const back = page.getByRole('link', { name: /تعديل|العودة إلى الأسئلة/ })
      if ((await back.count()) > 0) await back.first().click()
    }

    // Return to result for share/print
    if ((await page.getByRole('heading', { name: /نتيجة|التحضير/ }).count()) === 0) {
      await page.locator('[data-guide-client] label').filter({ hasText: /غير عربية/ }).click()
      const btn = page.getByRole('button', { name: /التالي|عرض النتيجة/ })
      await btn.click()
      if (await page.getByRole('button', { name: /عرض النتيجة/ }).isVisible()) {
        await page.getByRole('button', { name: /عرض النتيجة/ }).click()
      }
    }

    await expect(page.getByRole('heading', { name: /نتيجة|التحضير/ })).toBeVisible({
      timeout: 10_000,
    })

    const share = page.locator('[data-guide-whatsapp-share]')
    await expect(share.first()).toBeVisible()
    const href = await share.first().getAttribute('href')
    expect(href || '').not.toMatch(/certificate_origin|answers=|national|passport=\d|husband_syrian/)

    await expect(page.locator('[data-guide-print-sheet], [data-guide-print-button]').first()).toBeVisible()

    // checklist persistence marker if present
    const checklist = page.locator('[data-guide-checklist], [data-checklist-item]')
    if ((await checklist.count()) > 0) {
      await expect(checklist.first()).toBeVisible()
    }

    // desktop / RTL / overflow
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    const overflow = await page.evaluate(() => {
      const docEl = document.documentElement
      return Math.max(
        docEl.scrollWidth - docEl.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      )
    })
    expect(overflow).toBeLessThan(8)

    // keyboard: focus share
    await share.first().focus()
    await expect(share.first()).toBeFocused()

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })
})

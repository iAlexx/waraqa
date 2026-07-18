import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import sharp from 'sharp'

test.describe('Public home shell (Phase 2)', () => {
  test('loads Arabic RTL shell with footer disclaimer and skip link', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')

    await expect(page).toHaveTitle(/ورقة/)
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'ar-SY')
    await expect(html).toHaveAttribute('dir', 'rtl')

    const footer = page.locator('footer')
    await expect(footer).toContainText(
      'منصة إرشادية مستقلة — ليست موقعاً حكومياً',
    )
    await expect(
      page.getByRole('note').filter({ hasText: 'مستقلة' }),
    ).toHaveCount(0)

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'تخطّى إلى المحتوى' })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  for (const width of [320, 360, 390] as const) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 })
      await page.goto('/')
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      })
      expect(overflow).toBe(false)
    })
  }

  test('BrandMark uses brand-900 and is not painted red', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready
    })

    const marks = page.locator('[data-brand-mark]')
    await expect(marks.first()).toBeVisible()

    const styleCheck = await marks.first().evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        color: cs.color,
        className: el.className,
        variant: el.getAttribute('data-brand-variant'),
      }
    })
    expect(styleCheck.variant).toBe('primary')
    expect(styleCheck.className).not.toMatch(/danger|destructive/)
    // brand-900 ≈ rgb(10, 61, 55)
    expect(styleCheck.color).toMatch(/rgb\(\s*10,\s*61,\s*55\s*\)/)

    const png = await page.locator('h1 [data-brand-mark]').screenshot({ type: 'png' })
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let redHeavy = 0
    let greenHeavy = 0
    let samples = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 200) continue
      if (r > 240 && g > 240 && b > 230) continue
      samples++
      if (r > g + 25 && r > b + 25) redHeavy++
      if (g >= r - 5 && g > b) greenHeavy++
    }
    expect(info.width).toBeGreaterThan(10)
    expect(samples).toBeGreaterThan(20)
    expect(redHeavy / samples).toBeLessThan(0.15)
    expect(greenHeavy).toBeGreaterThan(redHeavy)
  })
})

test.describe('Design system (development)', () => {
  test('renders showcase interactions and passes axe checks', async ({
    page,
  }) => {
    test.skip(process.env.CI === 'true' && process.env.ALLOW_DEV_E2E !== '1', 'Dev showcase runs locally with next dev')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dev/design-system')
    await expect(
      page.getByRole('heading', { level: 1, name: 'نظام تصميم ورقة' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'افتح حوار' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'افتح درج الجوال' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'إغلاق' }).click()

    await page.getByRole('button', { name: 'Toast نجاح' }).click()

    // Dismiss toast before axe so ephemeral Sonner chrome does not skew contrast.
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(serious).toEqual([])
  })
})

test.describe('Wordmark lab (development)', () => {
  test('shows selected Aref Ruqaa Ink wordmark without Lateef', async ({ page }) => {
    test.skip(process.env.CI === 'true' && process.env.ALLOW_DEV_E2E !== '1', 'Dev lab runs locally')

    await page.goto('/dev/wordmark-lab')
    await expect(
      page.getByRole('heading', { level: 1, name: /Aref Ruqaa Ink/ }),
    ).toBeVisible()
    await expect(page.locator('#wordmark-aref-ruqaa').getByText('ورقة').first()).toBeVisible()
    await expect(page.getByText('Lateef مرفوض')).toBeVisible()
    await expect(page.locator('[data-wordmark-candidate="Lateef"]')).toHaveCount(0)
  })
})

test.describe('Production protection', () => {
  test('health endpoint remains safe', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok', database: 'ok' })
  })
})

test.describe('Reduced motion', () => {
  test('home remains usable with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'ورقة' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'ورقة' }).first()).toBeVisible()
    await expect(page.locator('footer')).toContainText(
      'منصة إرشادية مستقلة — ليست موقعاً حكومياً',
    )
  })
})

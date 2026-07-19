import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import sharp from 'sharp'

test.describe('Public home shell (Phase 5)', () => {
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
    await expect(footer).toContainText('مستقلة')
    await expect(footer).toContainText('ليست موقعاً حكومياً')

    // Hero disclaimer must be visible (not role=note — Phase 2 guard preserved)
    await expect(page.locator('[data-hero-disclaimer]')).toContainText('مستقلة')
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

  test('native search form is keyboard usable and GET-based', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/')
    const form = page.locator('form#hero-search')
    await expect(form).toHaveAttribute('method', /get/i)
    await expect(form).toHaveAttribute('action', '/search')
    const input = page.getByLabel('ابحث عن معاملة')
    await input.click()
    await expect(input).toBeFocused()
    await input.fill('جواز سفر')
    await Promise.all([
      page.waitForURL(/\/search\?q=/),
      page.keyboard.press('Enter'),
    ])
    await expect(page.getByRole('heading', { name: /البحث/ })).toBeVisible()
    await expect(page.getByText(/ما بتعرض نتائج وهمية|محرّك البحث العربي/)).toBeVisible()
  })

  test('header landmarks and mobile checkbox menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const header = page.locator('header')
    await expect(header).toBeVisible()
    const box = await header.boundingBox()
    expect(box?.height).toBeLessThanOrEqual(68)

    const openControl = page.getByLabel('فتح قائمة التنقل')
    await expect(openControl).toBeVisible()
    await openControl.click()
    const panel = page.locator('#waraqa-mobile-nav-panel')
    await expect(panel).toBeVisible()

    const panelBox = await panel.boundingBox()
    expect(panelBox).toBeTruthy()
    expect(panelBox!.width).toBeGreaterThanOrEqual(280)
    expect(panelBox!.height).toBeGreaterThan(200)

    await expect(panel.getByText('بحث', { exact: true })).toBeVisible()
    await expect(panel.getByText('التصنيفات', { exact: true })).toBeVisible()
    await expect(panel.getByText('كيف بتشتغل ورقة؟', { exact: true })).toBeVisible()
    await expect(panel.getByText('عن ورقة', { exact: true })).toBeVisible()
    await expect(panel.getByText('منصة مستقلة — مو موقع حكومي', { exact: true })).toBeVisible()
    await expect(page.locator('[data-mobile-nav-backdrop]')).toBeVisible()

    const viewport = page.viewportSize()!
    for (const label of ['بحث', 'التصنيفات', 'كيف بتشتغل ورقة؟', 'عن ورقة']) {
      const el = panel.getByText(label, { exact: true })
      const b = await el.boundingBox()
      expect(b).toBeTruthy()
      expect(b!.width).toBeGreaterThan(8)
      expect(b!.x).toBeGreaterThanOrEqual(-1)
      expect(b!.x + b!.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(b!.y).toBeGreaterThan(40)
    }

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    })
    expect(overflow).toBe(false)
  })

  test('no-JavaScript home renders complete primary content (not loading shell)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await context.newPage()
    await page.setViewportSize({ width: 1280, height: 900 })
    const response = await page.goto('/', { waitUntil: 'load', timeout: 60_000 })
    expect(response?.ok()).toBeTruthy()

    await expect(
      page.getByRole('heading', { level: 1, name: 'خلّينا نجهز معاملتك قبل ما تطلع' }),
    ).toBeVisible()
    await expect(page.locator('form#hero-search')).toBeVisible()
    await expect(page.locator('[data-hero-disclaimer]')).toContainText('مستقلة')
    await expect(page.locator('#categories')).toBeVisible()
    await expect(page.locator('#featured')).toBeVisible()
    await expect(page.locator('#how-it-works')).toBeVisible()
    await expect(page.locator('#trust')).toBeVisible()
    await expect(page.locator('footer')).toContainText('مستقلة')
    await expect(page.locator('[data-loading="home"]')).toHaveCount(0)
    await expect(page.getByText('عم نحضر الصفحة')).toHaveCount(0)

    await context.close()
  })

  for (const width of [360, 390, 768, 1024, 1440] as const) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
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
    expect(styleCheck.color).toMatch(/rgb\(\s*10,\s*61,\s*55\s*\)/)

    const png = await page.locator('header [data-brand-mark]').first().screenshot({ type: 'png' })
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

  test('home passes axe with no critical/serious issues', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(serious).toEqual([])
  })

  test('graphql remains disabled', async ({ request }) => {
    const response = await request.get('/api/graphql')
    expect(response.status()).toBe(404)
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
    await expect(
      page.getByRole('heading', { level: 1, name: /خلّينا نجهز معاملتك/ }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /ورقة/ }).first()).toBeVisible()
    await expect(page.locator('footer')).toContainText('مستقلة')
  })
})

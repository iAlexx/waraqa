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
    await expect(page.getByRole('heading', { level: 1, name: 'البحث عن معاملة' })).toBeVisible()
    await expect(page.locator('form#public-search')).toBeVisible()
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

test.describe('Public search (Phase 6)', () => {
  test('search page empty query and results shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/search')
    await expect(page.getByRole('heading', { name: 'البحث عن معاملة' })).toBeVisible()
    await expect(page.locator('form#public-search')).toBeVisible()
    await expect(page.locator('[data-empty="search-query"]')).toBeVisible()
  })

  test('search results use full-width bordered cards without overflow', async ({ page }) => {
    for (const width of [1440, 390, 360] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/search?q=%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A')
      await expect(page.locator('[data-search-page]')).toBeVisible()
      const cards = page.locator('[data-search-result-card]')
      const count = await cards.count()
      if (count > 0) {
        const box = await cards.first().boundingBox()
        expect(box).toBeTruthy()
        expect(box!.width).toBeGreaterThan(width * 0.7)
        await expect(cards.first().locator('[data-search-result-cta]')).toBeVisible()
      }
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      })
      expect(overflow).toBe(false)
    }
  })

  test('filters preserve query via GET', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/search?q=%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A')
    const form = page.locator('form#public-search')
    await expect(form).toHaveAttribute('method', /get/i)
    await expect(page.locator('#search-category')).toBeVisible()
    await expect(page.locator('#search-agency')).toBeVisible()
    await expect(page.locator('#search-center')).toBeVisible()
  })

  test('keyboard focus on search input', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/search')
    const input = page.getByLabel('ابحث عن معاملة')
    await input.focus()
    await expect(input).toBeFocused()
  })

  test('no-JavaScript search renders server results shell', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await context.newPage()
    await page.setViewportSize({ width: 1280, height: 900 })
    const response = await page.goto('/search?q=%D8%AC%D9%88%D8%A7%D8%B2', {
      waitUntil: 'load',
      timeout: 60_000,
    })
    expect(response?.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: 'البحث عن معاملة' })).toBeVisible()
    await expect(page.locator('form#public-search')).toBeVisible()
    await expect(page.locator('[data-search-status]')).toBeVisible()
    await context.close()
  })

  test('search page has no critical axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/search')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(serious).toEqual([])
  })

  test('inaccessible transaction slug returns not found', async ({ page }) => {
    await page.goto('/transactions/qa-does-not-exist')
    await expect(page.locator('[data-not-found]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /غير موجودة/ })).toBeVisible()
  })
})

test.describe('Public transaction detail (Phase 7)', () => {
  const detailSlug = process.env.E2E_P7_DETAIL_SLUG || 'qa-p7-r1-tx-complete'

  test('desktop detail page renders sections when fixture slug exists', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const res = await page.goto(`/transactions/${detailSlug}`)
    if (res?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    await expect(page.locator('[data-transaction-detail]')).toBeVisible()
    await expect(page.locator('#transaction-title')).toBeVisible()
    await expect(page.locator('[data-section="steps"]')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow).toBe(false)
  })

  test('mobile detail has no overflow when fixture present', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    const res = await page.goto(`/transactions/${detailSlug}`)
    if (res?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    await expect(page.locator('[data-transaction-detail]')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow).toBe(false)
  })

  test('no-JavaScript detail SSR when fixture present', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await context.newPage()
    const res = await page.goto(`/transactions/${detailSlug}`, {
      waitUntil: 'load',
      timeout: 60_000,
    })
    if (res?.status() === 404) {
      await context.close()
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    await expect(page.locator('[data-transaction-detail]')).toBeVisible()
    await expect(page.locator('#transaction-title')).toBeVisible()
    await context.close()
  })

  test('search CTA opens detail for fixture result', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/search?q=%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A')
    const cta = page.locator('[data-search-result-cta]').first()
    if ((await cta.count()) < 1) {
      test.skip(true, 'No search results available')
      return
    }
    await expect(cta).toContainText('عرض تفاصيل المعاملة')
    await Promise.all([page.waitForURL(/\/transactions\//), cta.click()])
    const path = new URL(page.url()).pathname
    expect(path.startsWith('/transactions/')).toBe(true)
  })

  test('detail page axe when fixture present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const res = await page.goto(`/transactions/${detailSlug}`)
    if (res?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(serious).toEqual([])
  })

  test('long-content and minimal pages when fixture present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const longSlug = process.env.E2E_P7_LONG_SLUG || 'qa-p7-r1-tx-long'
    const minSlug = process.env.E2E_P7_MIN_SLUG || 'qa-p7-r1-tx-minimal'
    const longRes = await page.goto(`/transactions/${longSlug}`)
    if (longRes?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    await expect(page.locator('[data-transaction-detail]')).toBeVisible()
    await expect(page.locator('[data-section="steps"]')).toBeVisible()

    await page.goto(`/transactions/${minSlug}`)
    await expect(page.locator('[data-transaction-detail]')).toBeVisible()
    await expect(page.locator('[data-section="steps"]')).toBeVisible()
    await expect(page.locator('[data-section="fees"]')).toHaveCount(0)
    await expect(page.locator('[data-section="documents"]')).toHaveCount(0)
  })

  test('keyboard focus reaches back-to-search when fixture present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const res = await page.goto(`/transactions/${detailSlug}`)
    if (res?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    const back = page.locator('[data-back-to-search]')
    await back.focus()
    await expect(back).toBeFocused()
  })

  test('desktop content rail is centered at 1440 when fixture present', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const res = await page.goto(`/transactions/${detailSlug}`)
    if (res?.status() === 404) {
      test.skip(true, 'Phase 7 fixture not seeded')
      return
    }
    const centered = await page.evaluate(() => {
      const article = document.querySelector('[data-transaction-detail]')
      const rail = article?.firstElementChild as HTMLElement | null
      if (!article || !rail) return false
      const a = article.getBoundingClientRect()
      const r = rail.getBoundingClientRect()
      return Math.abs(r.left - a.left - (a.right - r.right)) <= 48 && r.width >= a.width * 0.55
    })
    expect(centered).toBe(true)
  })

  test('error QA state exposes Arabic retry action', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/transactions/${detailSlug}?qaError=1`)
    const retry = page.locator('[data-error-retry]')
    if ((await retry.count()) < 1) {
      test.skip(true, 'ALLOW_QA_EMPTY_STATES not enabled')
      return
    }
    await expect(retry).toBeVisible()
    await expect(retry).toContainText('إعادة المحاولة')
  })
})


test.describe('Phase 8 interactive guide', () => {
  const guideSlug = process.env.E2E_P8_GUIDE_SLUG || 'qa-p8-r1-tx-guide'
  const hiddenSlug = process.env.E2E_P8_HIDDEN_SLUG || 'qa-p8-r1-tx-draft'

  test('detail CTA opens guide, answers produce checklist, restart clears, no URL answers', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const detailRes = await page.goto(`/transactions/${guideSlug}`)
    if (detailRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }
    const cta = page.locator('[data-start-guide]')
    await expect(cta).toBeVisible()
    await expect(cta).toContainText('ابدأ الدليل التفاعلي')
    await Promise.all([page.waitForURL(new RegExp(`/transactions/${guideSlug}/guide`)), cta.click()])

    await expect(page.locator('[data-guide-page]')).toBeVisible()
    await expect(page.locator('[data-guide-client]')).toBeVisible()

    // Labels wrap sr-only radios — click the visible label text
    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^نعم$/ })
      .click()
    await page.getByRole('button', { name: 'التالي' }).click()

    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^أول مرة$/ })
      .click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()

    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(page.locator('[data-guide-client]').getByRole('heading', { name: 'الوثائق' })).toBeVisible()
    expect(page.url()).not.toMatch(/[?&](age_group|issuance|answers)=/)

    // P9-A: interactive document checklist (+ P9-B may persist locally; still never in URL)
    const checklist = page.locator('[data-guide-documents-checklist]')
    await expect(checklist).toBeVisible()
    await expect(checklist.getByText(/التحديد هون بس لمساعدتك بالتحضير/)).toBeVisible()
    const firstDoc = checklist.getByRole('checkbox').first()
    await expect(firstDoc).toBeVisible()
    await firstDoc.check()
    await expect(firstDoc).toBeChecked()
    await checklist.getByRole('button', { name: 'إلغاء تحديد الكل' }).click()
    await expect(firstDoc).not.toBeChecked()
    expect(page.url()).not.toMatch(/[?&](doc_|checked|checklist)=/)

    await page.getByRole('button', { name: 'ابدأ من جديد' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)
    await expect(page.locator('#guide-question-heading')).toBeVisible()
    expect(page.url()).not.toMatch(/[?&](age_group|issuance|answers)=/)
  })

  test('P9-B local persistence restores progress and restart clears storage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const guideRes = await page.goto(`/transactions/${guideSlug}/guide`)
    if (guideRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()

    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^نعم$/ })
      .click()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^أول مرة$/ })
      .click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()

    const checklist = page.locator('[data-guide-documents-checklist]')
    const firstDoc = checklist.getByRole('checkbox').first()
    await firstDoc.check()
    await expect(firstDoc).toBeChecked()

    const stored = await page.evaluate((slug) => {
      const raw = window.localStorage.getItem(`waraqa:guide:${slug}`)
      if (!raw) return null
      const parsed = JSON.parse(raw) as {
        answers?: Record<string, unknown>
        checkedDocumentKeys?: string[]
      }
      return {
        hasAnswers: Boolean(parsed.answers && Object.keys(parsed.answers).length > 0),
        checkedCount: parsed.checkedDocumentKeys?.length ?? 0,
        keys: Object.keys(parsed),
      }
    }, guideSlug)
    expect(stored?.hasAnswers).toBe(true)
    expect(stored?.checkedCount).toBeGreaterThan(0)
    expect(stored?.keys).not.toEqual(expect.arrayContaining(['claimTrustOk', 'contentClass']))

    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(checklist.getByRole('checkbox').first()).toBeChecked()
    expect(page.url()).not.toMatch(/[?&](age_group|issuance|answers|doc_|checked)=/)

    await page.getByRole('button', { name: 'ابدأ من جديد' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)
    await expect(page.locator('#guide-question-heading')).toBeVisible()

    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)
    await expect(page.locator('#guide-question-heading')).toBeVisible()
    const afterRestart = await page.evaluate(
      (slug) => window.localStorage.getItem(`waraqa:guide:${slug}`),
      guideSlug,
    )
    expect(afterRestart).toBeNull()
  })

  test('P9-C print sheet: button, demo warning, print media hides chrome', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const guideRes = await page.goto(`/transactions/${guideSlug}/guide`)
    if (guideRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }

    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'طباعة النتيجة' })).toHaveCount(0)

    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^نعم$/ })
      .click()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^أول مرة$/ })
      .click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()

    const printBtn = page.getByRole('button', { name: 'طباعة النتيجة' })
    await expect(printBtn).toBeVisible()

    const checklist = page.locator('[data-guide-documents-checklist]')
    await checklist.getByRole('checkbox').first().check()
    await expect(checklist.getByRole('checkbox').first()).toBeChecked()

    await expect(page.locator('[data-guide-print-sheet]')).toBeVisible()
    await expect(page.locator('[data-demo-content-label]').first()).toContainText(
      'بيانات تجريبية للعرض — ليست معلومات رسمية',
    )
    await expect(page.locator('[data-print-disclaimer]')).toContainText('منصة إرشادية مستقلة')
    await expect(page.locator('[data-guide-print-sheet]')).toContainText('المصادر الرسمية')

    const overflow = await page.evaluate(() => {
      const el = document.querySelector('[data-guide-print-sheet]')
      if (!el) return true
      return el.scrollWidth > el.clientWidth + 1
    })
    expect(overflow).toBe(false)

    await page.emulateMedia({ media: 'print' })

    await expect(page.locator('[data-site-header]')).toBeHidden()
    await expect(page.locator('[data-site-footer]')).toBeHidden()
    await expect(page.locator('[data-guide-controls]')).toBeHidden()
    await expect(printBtn).toBeHidden()
    await expect(page.locator('[data-guide-print-sheet]')).toBeVisible()
    await expect(page.locator('[data-guide-print-chrome]')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    const checkedMark = await page.evaluate(() => {
      const item = document.querySelector('[data-checklist-checked="true"]')
      if (!item) return null
      return getComputedStyle(item, '::before').content
    })
    expect(checkedMark && checkedMark !== 'none').toBeTruthy()
    expect(String(checkedMark)).toMatch(/✓/)

    await page.emulateMedia({ media: 'screen' })
    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(page.locator('[data-guide-documents-checklist]').getByRole('checkbox').first()).toBeChecked()
  })

  test('P9-D WhatsApp share: href message is Arabic-safe and omits checklist/answers', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const guideRes = await page.goto(`/transactions/${guideSlug}/guide`)
    if (guideRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }

    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'مشاركة عبر واتساب' })).toHaveCount(0)

    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^نعم$/ })
      .click()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page
      .locator('[data-guide-client] label')
      .filter({ hasText: /^أول مرة$/ })
      .click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()

    const share = page.getByRole('link', { name: 'مشاركة عبر واتساب' })
    await expect(share).toBeVisible()
    await expect(page.getByRole('button', { name: 'طباعة النتيجة' })).toBeVisible()

    const checklist = page.locator('[data-guide-documents-checklist]')
    await checklist.getByRole('checkbox').first().check()
    await expect(checklist.getByRole('checkbox').first()).toBeChecked()

    const href = await share.getAttribute('href')
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/)
    const decoded = decodeURIComponent(new URL(href!).searchParams.get('text') || '')
    expect(decoded).toContain('هاي قائمة معاملتي من ورقة:')
    expect(decoded).toContain('بيانات تجريبية للعرض — ليست معلومات رسمية')
    expect(decoded).toContain('ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.')
    expect(decoded).toMatch(/\/transactions\/qa-p8-r1-tx-guide/)
    expect(decoded).not.toMatch(/needs_guardian|include-|doc_|rule_|claim_|contentClass|QA_TEST/)
    expect(decoded).not.toContain('محدّد للتحضير')
    expect(decoded).not.toContain('[✓]')
    expect(decoded).not.toMatch(/[?&](answers|age_group|issuance)=/)

    // Do not open external WhatsApp — inspect href only.
    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(checklist.getByRole('checkbox').first()).toBeChecked()
    await expect(page.getByRole('button', { name: 'طباعة النتيجة' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'مشاركة عبر واتساب' })).toBeVisible()
  })

  test('P9-E edit answers: summary, edit, recalculate, persist, print/share, restart', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    const guideRes = await page.goto(`/transactions/${guideSlug}/guide`)
    if (guideRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await page.locator('[data-guide-client] label').filter({ hasText: /^نعم$/ }).click()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page.locator('[data-guide-client] label').filter({ hasText: /^أول مرة$/ }).click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()

    const summary = page.locator('[data-guide-answer-summary]')
    await expect(summary).toBeVisible()
    await expect(summary.getByRole('heading', { name: 'إجاباتك' })).toBeVisible()
    await expect(summary.getByText('هل أنت بالغ؟')).toBeVisible()
    await expect(summary.getByText('نعم')).toBeVisible()

    const checklist = page.locator('[data-guide-documents-checklist]')
    await checklist.getByRole('checkbox').first().check()

    const overflow360 = await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
    )
    expect(overflow360).toBeLessThanOrEqual(1)

    // Edit second answer (transaction type) — fixture keys may vary; use first editable later row
    const editButtons = summary.locator('[data-guide-edit-answer]')
    const editCount = await editButtons.count()
    expect(editCount).toBeGreaterThanOrEqual(2)
    await editButtons.nth(1).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)

    await page.locator('[data-guide-client] label').filter({ hasText: /^تجديد$/ }).click()
    await page.getByRole('button', { name: 'عرض النتيجة' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(page.locator('[data-guide-answer-summary]')).toContainText('تجديد')

    await page.setViewportSize({ width: 1440, height: 900 })
    const overflow1440 = await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
    )
    expect(overflow1440).toBeLessThanOrEqual(1)
    await expect(page.getByRole('button', { name: 'طباعة النتيجة' })).toBeVisible()
    const share = page.getByRole('link', { name: 'مشاركة عبر واتساب' })
    await expect(share).toBeVisible()
    const href = await share.getAttribute('href')
    const decoded = decodeURIComponent(new URL(href!).searchParams.get('text') || '')
    expect(decoded).not.toMatch(/is_adult|first_time|needs_guardian|doc_/)
    expect(decoded).toContain('ورقة منصة إرشادية مستقلة')

    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
    await expect(page.locator('[data-guide-answer-summary]')).toContainText('تجديد')

    await page.getByRole('button', { name: 'ابدأ من جديد' }).click()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)
    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('hidden transaction guide slug returns not found', async ({ page }) => {
    await page.goto(`/transactions/${hiddenSlug}/guide`)
    await expect(page.locator('[data-not-found]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /غير موجودة/ })).toBeVisible()
  })

  test('no-JavaScript guide page shows noscript fallback when fixture present', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ar-SY' })
    const page = await context.newPage()
    const res = await page.goto(`/transactions/${guideSlug}/guide`, {
      waitUntil: 'load',
      timeout: 60_000,
    })
    if (res?.status() === 404) {
      await context.close()
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }
    await expect(page.locator('[data-guide-page]')).toBeVisible()
    await expect(page.getByText(/يحتاج جافاسكريبت/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'فتح تفاصيل المعاملة' })).toBeVisible()
    await context.close()
  })

  test('graphql remains disabled (Phase 8 consistent with public shell)', async ({ request }) => {
    const response = await request.get('/api/graphql')
    expect(response.status()).toBe(404)
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

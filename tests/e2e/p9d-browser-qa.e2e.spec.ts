/**
 * One-shot P9-D browser QA (not part of CI suite unless promoted).
 * Usage: PLAYWRIGHT_REUSE_SERVER=1 WARAQA_PUBLIC_CONTENT_MODE=demo pnpm exec playwright test tests/e2e/p9d-browser-qa.e2e.spec.ts
 */
import { expect, test } from '@playwright/test'

const guideSlug = process.env.E2E_P8_GUIDE_SLUG || 'qa-p8-r1-tx-guide'

async function reachResult(page: import('@playwright/test').Page) {
  await page.goto(`/transactions/${guideSlug}/guide`)
  await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
  await page.locator('[data-guide-client] label').filter({ hasText: /^نعم$/ }).click()
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.locator('[data-guide-client] label').filter({ hasText: /^أول مرة$/ }).click()
  await page.getByRole('button', { name: 'عرض النتيجة' }).click()
  await expect(page.getByRole('heading', { name: 'نتيجة التحضير' })).toBeVisible()
}

async function measureOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const docEl = document.documentElement
    const body = document.body
    const sheet = document.querySelector('[data-guide-print-sheet]') as HTMLElement | null
    const actions = document.querySelector('[data-guide-print-sheet] [data-print-hide]') as HTMLElement | null
    const share = document.querySelector('[data-guide-whatsapp-share]') as HTMLAnchorElement | null
    const printBtn = document.querySelector('[data-guide-print-button]') as HTMLElement | null
    const title = document.querySelector('[data-guide-page-header] h1') as HTMLElement | null

    const overflowX = Math.max(
      docEl.scrollWidth - docEl.clientWidth,
      body.scrollWidth - body.clientWidth,
      sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
    )

    const rects = {
      share: share?.getBoundingClientRect() ?? null,
      print: printBtn?.getBoundingClientRect() ?? null,
      actions: actions?.getBoundingClientRect() ?? null,
      title: title?.getBoundingClientRect() ?? null,
    }

    const clippedTitle = title
      ? title.scrollWidth > title.clientWidth + 2 && getComputedStyle(title).overflow !== 'visible'
      : false

    return {
      dir: docEl.getAttribute('dir'),
      overflowX,
      viewportW: window.innerWidth,
      shareVisible: Boolean(share && share.offsetParent !== null),
      printVisible: Boolean(printBtn && printBtn.offsetParent !== null),
      shareName: share?.textContent?.trim() ?? null,
      shareRel: share?.getAttribute('rel'),
      shareTarget: share?.getAttribute('target'),
      shareHref: share?.href ?? null,
      clippedTitle,
      titleText: title?.textContent?.trim() ?? null,
      actionsWidthFits:
        actions && rects.actions
          ? rects.actions.right <= window.innerWidth + 1 && rects.actions.left >= -1
          : false,
      consoleProbe: true,
    }
  })
}

test.describe('P9-D browser QA closure', () => {
  test('360px and 1440px layout + a11y + console', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // --- 360px ---
    await page.setViewportSize({ width: 360, height: 800 })
    const guideRes = await page.goto(`/transactions/${guideSlug}/guide`)
    if (guideRes?.status() === 404) {
      test.skip(true, 'Phase 8 fixture not seeded')
      return
    }
    await reachResult(page)

    const m360 = await measureOverflow(page)
    expect(m360.dir).toBe('rtl')
    expect(m360.overflowX).toBeLessThanOrEqual(1)
    expect(m360.shareVisible).toBe(true)
    expect(m360.printVisible).toBe(true)
    expect(m360.shareName).toBe('مشاركة عبر واتساب')
    expect(m360.shareTarget).toBe('_blank')
    expect(m360.shareRel).toMatch(/noopener/)
    expect(m360.shareRel).toMatch(/noreferrer/)
    expect(m360.actionsWidthFits).toBe(true)
    expect(m360.clippedTitle).toBe(false)

    // Keyboard: Tab until WhatsApp link focused
    let focusedShare = false
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      focusedShare = await page.evaluate(
        () => document.activeElement?.getAttribute('data-guide-whatsapp-share') === '',
      )
      if (focusedShare) break
    }
    expect(focusedShare).toBe(true)

    const href = m360.shareHref!
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/)
    const decoded = decodeURIComponent(new URL(href).searchParams.get('text') || '')
    expect(decoded).toContain('هاي قائمة معاملتي من ورقة:')
    expect(decoded).toMatch(/\/transactions\/qa-p8-r1-tx-guide/)
    expect(decoded).not.toMatch(/[?&](answers|age_group)=/)

    // Long Arabic title: inject into page header and confirm no horizontal overflow / clipping.
    await page.evaluate(() => {
      const h1 = document.querySelector('[data-guide-page-header] h1')
      if (h1) {
        h1.textContent =
          'الدليل التفاعلي — إصدار جواز سفر للمواطنين السوريين المقيمين خارج البلاد مع متطلبات تحضير إضافية طويلة للتحقق من عدم كسر التخطيط العربي'
      }
    })
    const afterLong = await measureOverflow(page)
    expect(afterLong.overflowX).toBeLessThanOrEqual(1)
    expect(afterLong.clippedTitle).toBe(false)
    const longTitleBox = await page.locator('[data-guide-page-header] h1').boundingBox()
    expect(longTitleBox).toBeTruthy()
    expect(longTitleBox!.width).toBeLessThanOrEqual(360)

    // --- 1440px ---
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await expect(page.locator('[data-guide-client][data-guide-storage-ready="true"]')).toBeVisible()
    // May restore to result via P9-B
    if ((await page.getByRole('heading', { name: 'نتيجة التحضير' }).count()) === 0) {
      await reachResult(page)
    }
    await expect(page.getByRole('link', { name: 'مشاركة عبر واتساب' })).toBeVisible()
    const m1440 = await measureOverflow(page)
    expect(m1440.dir).toBe('rtl')
    expect(m1440.overflowX).toBeLessThanOrEqual(1)
    expect(m1440.shareVisible).toBe(true)
    expect(m1440.printVisible).toBe(true)
    expect(m1440.actionsWidthFits).toBe(true)

    // Long title structural check via DOM inject of print title + share rebuild is out of scope;
    // assert page H1 wraps without page overflow (fixture title already Arabic).
    const h1Box = await page.locator('[data-guide-page-header] h1').boundingBox()
    expect(h1Box).toBeTruthy()
    expect(h1Box!.width).toBeLessThanOrEqual(1440)

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })
})

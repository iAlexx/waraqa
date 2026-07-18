import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('docs/qa/phase-2')

test.describe('Phase 2 QA screenshots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true })
  })

  test('capture required owner-review screenshots', async ({ page }) => {
    test.skip(
      process.env.CAPTURE_PHASE2_QA !== '1',
      'Set CAPTURE_PHASE2_QA=1 to refresh docs/qa/phase-2 screenshots',
    )
    test.setTimeout(180_000)

    async function settle() {
      await page.waitForLoadState('networkidle')
      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready
      })
      await page.waitForTimeout(250)
    }

    async function shot(name: string) {
      await page.screenshot({
        path: path.join(OUT, name),
        fullPage: true,
      })
    }

    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/dev/design-system')
    await settle()
    await shot('design-system-mobile-320.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dev/design-system')
    await settle()
    await shot('design-system-mobile-390.png')

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dev/design-system')
    await settle()
    await shot('design-system-tablet-768.png')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dev/design-system')
    await settle()
    await shot('design-system-desktop-1440.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await settle()
    await shot('home-shell-mobile-390.png')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await settle()
    await shot('home-shell-desktop-1440.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dev/design-system')
    await settle()
    await page.getByRole('button', { name: 'افتح حوار' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await shot('dialog-rtl-mobile.png')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'افتح درج الجوال' }).click()
    await expect(page.getByText('درج من الأسفل')).toBeVisible()
    await shot('drawer-rtl-mobile.png')
    await page.getByRole('button', { name: 'إغلاق' }).click()

    await page.locator('#forms').scrollIntoViewIfNeeded()
    await settle()
    await shot('form-error-states-mobile.png')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await settle()
    await shot('reduced-motion-check.png')

    const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))
    expect(files.length).toBeGreaterThanOrEqual(10)
  })
})

/**
 * Phase 13 — lightweight horizontal overflow matrix on `/`.
 * Always runs (no skip). Fail if overflow > 8px.
 */
import { expect, test } from '@playwright/test'

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const

async function horizontalOverflowPx(page: {
  evaluate: (fn: () => number) => Promise<number>
}): Promise<number> {
  return page.evaluate(() => {
    const docEl = document.documentElement
    const body = document.body
    return Math.max(
      docEl.scrollWidth - docEl.clientWidth,
      body.scrollWidth - body.clientWidth,
    )
  })
}

test.describe('Phase 13 home viewport overflow matrix', () => {
  for (const { width, height } of VIEWPORTS) {
    test(`home has ≤8px horizontal overflow at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const overflow = await horizontalOverflowPx(page)
      expect(overflow).toBeLessThanOrEqual(8)
    })
  }
})

import { test, expect } from '@playwright/test'

test.describe('Public home (Phase 1)', () => {
  test('loads Arabic RTL placeholder with independence disclaimer', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/ورقة/)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'ar-SY')
    await expect(html).toHaveAttribute('dir', 'rtl')

    await expect(page.getByRole('heading', { level: 1, name: 'ورقة' })).toBeVisible()
    await expect(
      page.getByText(
        'عم نجهّز منصة ورقة لتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.',
      ),
    ).toBeVisible()
    await expect(
      page.getByText('ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.'),
    ).toBeVisible()
  })

  test('health endpoint returns safe ok payload when DB is up', async ({
    request,
  }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: 'ok', database: 'ok' })
    expect(JSON.stringify(body)).not.toMatch(/postgresql|PASSWORD|PAYLOAD_SECRET|stack/i)
  })
})

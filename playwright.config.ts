import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

const port = process.env.PORT || '3000'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: `corepack pnpm@11.14.0 dev --port ${port}`,
    // Prefer a fresh Phase-aware server; set PLAYWRIGHT_REUSE_SERVER=1 to attach to an existing one.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    url: baseURL,
    timeout: 180_000,
    // Forward explicitly so Next/Payload do not silently bind a different local DB/mode.
    env: {
      ...process.env,
      PORT: port,
      DATABASE_URL: process.env.DATABASE_URL || '',
      DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || '',
      WARAQA_PUBLIC_CONTENT_MODE: process.env.WARAQA_PUBLIC_CONTENT_MODE || 'production',
    },
  },
})

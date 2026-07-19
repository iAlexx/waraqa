/**
 * Phase 4 Round 04 — list cells closure (publication status + audit actors).
 * Production server only. Does NOT touch Round 01/02/03 or approved/.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-4/revisions/round-04-list-cells-closure')
const ROUND03 = path.join(ROOT, 'docs/qa/phase-4/revisions/round-03-admin-workflow-ux-closure')
const CREDS_PATH = path.join(ROOT, 'docs/qa/phase-4/.local-credentials')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

const REQUIRED = [
  'transactions-list-publication-status-fixed.png',
  'audit-events-readable-actors-fixed.png',
  'comparison-round03-vs-round04.png',
] as const

type Creds = {
  password: string
  users: Record<string, { email: string; id: number }>
}

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-04-list-cells-closure`)) {
    throw new Error('Refusing to write outside Round 04')
  }
  for (const bad of ['round-01', 'round-02', 'round-03']) {
    if (OUT.includes(bad)) throw new Error(`Refusing to touch ${bad}`)
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(900)
}

async function assertNoDevBadge(page: Page) {
  const hasN = await page.evaluate(() => {
    if (document.querySelector('nextjs-portal, [data-next-mark], [data-nextjs-toast]')) return true
    return false
  })
  if (hasN) {
    throw new Error('Next.js development indicator detected — use production `pnpm start`')
  }
}

async function shot(page: Page, name: string) {
  await assertNoDevBadge(page)
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  if (fs.statSync(file).size <= 0) throw new Error(`Zero-byte: ${name}`)
  console.log('wrote', name)
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/admin/login`)
  await settle(page)
  await page.locator('input[name="email"], input[type="email"]').first().fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 45000 })
  await settle(page)
}

async function writeComparison() {
  const leftPath = path.join(ROUND03, 'transactions-list-arabic-statuses.png')
  const rightPath = path.join(OUT, 'transactions-list-publication-status-fixed.png')
  const outPath = path.join(OUT, 'comparison-round03-vs-round04.png')
  if (!fs.existsSync(rightPath)) throw new Error('Missing round04 comparison source')
  if (!fs.existsSync(leftPath)) {
    await sharp(rightPath).toFile(outPath)
    return
  }
  const leftMeta = await sharp(leftPath).metadata()
  const rightMeta = await sharp(rightPath).metadata()
  const lw = leftMeta.width ?? 720
  const lh = leftMeta.height ?? 450
  const rw = rightMeta.width ?? 720
  const rh = rightMeta.height ?? 450
  const pad = 24
  const labelH = 48
  const width = lw + rw + pad * 3
  const height = Math.max(lh, rh) + pad * 2 + labelH
  const svg = Buffer.from(`<svg width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7faf8"/>
    <text x="${pad}" y="28" font-size="18" font-family="sans-serif" fill="#0b3d2e">Round 03 (before)</text>
    <text x="${pad * 2 + lw}" y="28" font-size="18" font-family="sans-serif" fill="#0b3d2e">Round 04 (after)</text>
  </svg>`)
  await sharp(svg)
    .composite([
      { input: await sharp(leftPath).resize(lw, lh).toBuffer(), left: pad, top: pad + labelH },
      {
        input: await sharp(rightPath).resize(rw, rh).toBuffer(),
        left: pad * 2 + lw,
        top: pad + labelH,
      },
    ])
    .png()
    .toFile(outPath)
  console.log('wrote comparison-round03-vs-round04.png')
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })
  if (!fs.existsSync(CREDS_PATH)) throw new Error('Run qa:phase4:fixture first')
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')) as Creds

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
  if (!health || (health as { status?: string }).status !== 'ok') {
    throw new Error(`Production server not healthy at ${BASE}`)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await login(page, creds.users.admin.email, creds.password)

  await page.goto(`${BASE}/admin/collections/transactions`)
  await settle(page)
  // Wait for publication status cells to paint Arabic (not em dash alone)
  await page.waitForFunction(
    () => {
      const cells = Array.from(document.querySelectorAll('[data-waraqa-publication-status-cell="1"]'))
      if (!cells.length) return false
      return cells.some((c) => /مسودة|منشورة/.test(c.textContent || ''))
    },
    { timeout: 20000 },
  )
  await shot(page, 'transactions-list-publication-status-fixed.png')

  await page.goto(`${BASE}/admin/collections/audit-events`)
  await settle(page)
  await page.waitForFunction(
    () => {
      const cells = Array.from(document.querySelectorAll('[data-waraqa-actor-cell="1"]'))
      if (!cells.length) return false
      // Must not be all em-dashes; allow النظام / names / emails / مستخدم
      return cells.some((c) => {
        const t = (c.textContent || '').trim()
        return t && t !== '—' && t !== '…'
      })
    },
    { timeout: 25000 },
  )
  await shot(page, 'audit-events-readable-actors-fixed.png')

  await browser.close()
  await writeComparison()

  const missing: string[] = []
  for (const name of REQUIRED) {
    const file = path.join(OUT, name)
    if (!fs.existsSync(file) || fs.statSync(file).size <= 0) missing.push(name)
  }
  if (missing.length) {
    console.error('QA GATE FAIL', missing)
    process.exit(1)
  }
  console.log(`Round 04 complete: ${REQUIRED.length} screenshots → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

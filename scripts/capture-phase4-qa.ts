/**
 * Phase 4 Round 03 — Admin workflow UX closure captures.
 * PRODUCTION server only (pnpm build + pnpm start). Fails if Next.js dev `N` badge present.
 * Writes ONLY under docs/qa/phase-4/revisions/round-03-admin-workflow-ux-closure/
 * Does NOT touch Round 01/02 or approved/.
 */
import { chromium, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/qa/phase-4/revisions/round-03-admin-workflow-ux-closure')
const ROUND02 = path.join(ROOT, 'docs/qa/phase-4/revisions/round-02-owner-review-closure')
const CREDS_PATH = path.join(ROOT, 'docs/qa/phase-4/.local-credentials')
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000'

type Creds = {
  password: string
  users: Record<string, { email: string; id: number }>
  ids: Record<string, number | null>
  slugs: Record<string, string>
}

const REQUIRED = [
  'admin-login-final-brand-desktop-1440.png',
  'transaction-researcher-draft-actions.png',
  'transaction-researcher-changes-requested-comment.png',
  'transaction-researcher-in-review-readonly.png',
  'transaction-reviewer-in-review-actions.png',
  'transaction-reviewer-approved-actions.png',
  'transaction-admin-published-actions.png',
  'transaction-archived-restore-action.png',
  'transaction-workflow-status-readonly.png',
  'transaction-publication-status-arabic.png',
  'transaction-approval-invalidated-alert.png',
  'transaction-source-coverage-admin-alert.png',
  'audit-events-readable-actors.png',
  'categories-readable-parent.png',
  'transactions-list-arabic-statuses.png',
  'comparison-round02-vs-round03.png',
] as const

function assertSafeOut() {
  if (!OUT.includes(`${path.sep}round-03-admin-workflow-ux-closure`)) {
    throw new Error('Refusing to write outside Round 03')
  }
  if (OUT.includes('round-01') || OUT.includes('round-02-owner')) {
    throw new Error('Refusing to touch Round 01/02')
  }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(800)
}

async function assertNoDevBadge(page: Page) {
  const hasN = await page.evaluate(() => {
    const selectors = [
      '[data-nextjs-toast]',
      '#__next-build-watcher',
      'nextjs-portal',
      '[data-next-mark]',
      'a[href*="/__nextjs"]',
    ]
    for (const s of selectors) {
      if (document.querySelector(s)) return true
    }
    const buttons = Array.from(document.querySelectorAll('body *'))
    for (const el of buttons) {
      const style = window.getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (
        r.width >= 36 &&
        r.width <= 56 &&
        r.height >= 36 &&
        r.height <= 56 &&
        r.bottom > window.innerHeight - 80 &&
        r.left < 80 &&
        (style.backgroundColor === 'rgb(0, 0, 0)' || style.backgroundColor === 'rgba(0, 0, 0, 1)')
      ) {
        const text = (el.textContent || '').trim()
        if (text === 'N' || el.querySelector('svg')) return true
      }
    }
    return false
  })
  if (hasN) {
    throw new Error(
      'Next.js development indicator detected — use production `pnpm start`, not `pnpm dev`',
    )
  }
}

async function shot(page: Page, name: string) {
  await assertNoDevBadge(page)
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  const size = fs.statSync(file).size
  if (size <= 0) throw new Error(`Zero-byte screenshot: ${name}`)
  console.log('wrote', name, `(${size} bytes)`)
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/admin/login`)
  await settle(page)
  await assertNoDevBadge(page)
  await page.locator('input[name="email"], input[type="email"]').first().fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 45000 })
  await settle(page)
}

async function logout(page: Page) {
  await page.context().clearCookies()
  await page.goto(`${BASE}/admin/logout`).catch(() => undefined)
  await settle(page)
}

async function openTx(page: Page, id: number | null | undefined) {
  if (id == null) throw new Error('Missing transaction id')
  await page.goto(`${BASE}/admin/collections/transactions/${id}`)
  await settle(page)
  await page
    .locator('[data-waraqa-workflow-toolbar="1"]')
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => undefined)
}

async function writeComparison() {
  const leftPath = path.join(ROUND02, 'transaction-workflow-draft-desktop-1440.png')
  const rightPath = path.join(OUT, 'transaction-researcher-draft-actions.png')
  const outPath = path.join(OUT, 'comparison-round02-vs-round03.png')
  if (!fs.existsSync(rightPath)) throw new Error('Missing round03 comparison source')
  if (!fs.existsSync(leftPath)) {
    await sharp(rightPath).toFile(outPath)
    console.warn('Round 02 source missing — comparison is Round 03 only')
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
    <text x="${pad}" y="28" font-size="18" font-family="sans-serif" fill="#0b3d2e">Round 02 (before)</text>
    <text x="${pad * 2 + lw}" y="28" font-size="18" font-family="sans-serif" fill="#0b3d2e">Round 03 (after)</text>
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
  console.log('wrote comparison-round02-vs-round03.png')
}

async function main() {
  assertSafeOut()
  fs.mkdirSync(OUT, { recursive: true })
  if (!fs.existsSync(CREDS_PATH)) throw new Error('Run qa:phase4:fixture first')
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')) as Creds

  const health = await fetch(`${BASE}/api/health`)
    .then((r) => r.json())
    .catch(() => null)
  if (!health || (health as { status?: string }).status !== 'ok') {
    throw new Error(`Production server not healthy at ${BASE}`)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/admin/login`)
  await settle(page)
  await shot(page, 'admin-login-final-brand-desktop-1440.png')

  await login(page, creds.users.researcher.email, creds.password)
  await openTx(page, creds.ids.draft)
  await shot(page, 'transaction-researcher-draft-actions.png')

  await openTx(page, creds.ids.changesRequested)
  await page.locator('[data-waraqa-panel="reviewer-notes"]').first().waitFor({ timeout: 15000 })
  await shot(page, 'transaction-researcher-changes-requested-comment.png')

  await openTx(page, creds.ids.inReview)
  await shot(page, 'transaction-researcher-in-review-readonly.png')

  await logout(page)
  await login(page, creds.users.reviewer.email, creds.password)
  await openTx(page, creds.ids.inReview)
  await shot(page, 'transaction-reviewer-in-review-actions.png')

  await openTx(page, creds.ids.approved)
  await shot(page, 'transaction-reviewer-approved-actions.png')

  await logout(page)
  await login(page, creds.users.admin.email, creds.password)
  await openTx(page, creds.ids.published)
  if (await page.locator('[data-waraqa-overflow-toggle="1"]').count()) {
    await page.locator('[data-waraqa-overflow-toggle="1"]').first().click()
  }
  await page.waitForTimeout(400)
  await shot(page, 'transaction-admin-published-actions.png')

  await openTx(page, creds.ids.archived)
  if (await page.locator('[data-waraqa-overflow-toggle="1"]').count()) {
    await page.locator('[data-waraqa-overflow-toggle="1"]').first().click()
  }
  await page.waitForTimeout(400)
  await shot(page, 'transaction-archived-restore-action.png')

  await openTx(page, creds.ids.published)
  await shot(page, 'transaction-workflow-status-readonly.png')
  await shot(page, 'transaction-publication-status-arabic.png')

  await openTx(page, creds.ids.invalidated)
  await page
    .locator('[data-waraqa-alert="approval-invalidated"]')
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => undefined)
  await shot(page, 'transaction-approval-invalidated-alert.png')

  await openTx(page, creds.ids.sourceBlocker)
  await page.locator('[data-waraqa-workflow-action="approve"]').first().click()
  await page.waitForTimeout(1500)
  await shot(page, 'transaction-source-coverage-admin-alert.png')

  await page.goto(`${BASE}/admin/collections/audit-events`)
  await settle(page)
  await shot(page, 'audit-events-readable-actors.png')

  await page.goto(`${BASE}/admin/collections/categories`)
  await settle(page)
  await shot(page, 'categories-readable-parent.png')

  await page.goto(`${BASE}/admin/collections/transactions`)
  await settle(page)
  await shot(page, 'transactions-list-arabic-statuses.png')

  await browser.close()

  await writeComparison()

  const missing: string[] = []
  const zero: string[] = []
  for (const name of REQUIRED) {
    const file = path.join(OUT, name)
    if (!fs.existsSync(file)) missing.push(name)
    else if (fs.statSync(file).size <= 0) zero.push(name)
  }
  if (missing.length || zero.length) {
    console.error('QA GATE FAIL', { missing, zero })
    process.exit(1)
  }
  console.log(`Round 03 complete: ${REQUIRED.length} screenshots → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

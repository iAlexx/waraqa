import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Phase 10 public report CTA wiring', () => {
  it('transaction detail exposes the Arabic report CTA link', () => {
    const file = path.join(
      process.cwd(),
      'src/components/transaction/transaction-detail-view.tsx',
    )
    const src = readFileSync(file, 'utf8')
    expect(src).toContain('data-report-changed-info')
    expect(src).toContain('بلّغنا عن معلومة تغيّرت')
    expect(src).toContain('/report-information?transaction=')
  })

  it('public API route rejects GET and multipart', () => {
    const file = path.join(process.cwd(), 'src/app/api/public/reports/route.ts')
    const src = readFileSync(file, 'utf8')
    expect(src).toContain('multipart/form-data')
    expect(src).toContain('export async function GET')
  })
})

/**
 * Scan tracked git files for likely committed secrets.
 * Exit 1 on findings. Never print full secret values (redact).
 *
 * Usage: pnpm scan:secrets
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { scanSecretText } from '../src/lib/security/secret-scan.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const MAX_BYTES = 512 * 1024
const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.webm',
  '.sqlite',
  '.bin',
])

function listTrackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 32 * 1024 * 1024,
  })
  return out
    .toString('utf8')
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isProbablyBinary(filePath: string, buf: Buffer): boolean {
  const ext = path.extname(filePath).toLowerCase()
  if (BINARY_EXT.has(ext)) return true
  const sample = buf.subarray(0, Math.min(buf.length, 8000))
  let weird = 0
  for (const b of sample) {
    if (b === 0) return true
    if (b < 7 && b !== 9 && b !== 10 && b !== 13) weird++
  }
  return weird > 0 && weird / sample.length > 0.05
}

function main(): void {
  const files = listTrackedFiles()
  const all = []

  for (const rel of files) {
    const abs = path.join(ROOT, rel)
    let st: fs.Stats
    try {
      st = fs.statSync(abs)
    } catch {
      continue
    }
    if (!st.isFile() || st.size > MAX_BYTES) continue

    let buf: Buffer
    try {
      buf = fs.readFileSync(abs)
    } catch {
      continue
    }
    if (isProbablyBinary(rel, buf)) continue

    all.push(...scanSecretText(rel, buf.toString('utf8')))
  }

  if (all.length === 0) {
    console.log('secret-scan: OK (no likely secrets in tracked files)')
    process.exit(0)
  }

  console.error(`secret-scan: ${all.length} finding(s)`)
  for (const f of all) {
    console.error(`- ${f.file}:${f.line} [${f.rule}] ${f.snippet}`)
  }
  process.exit(1)
}

main()

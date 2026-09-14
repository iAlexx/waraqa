/**
 * Scan tracked git files for likely committed secrets.
 * Exit 1 on findings. Never print full secret values (redact).
 *
 * Allows: .env.example placeholders, disposable CI/local Docker passwords,
 * obvious test fixture passwords, process.env references, redacted stubs.
 *
 * Usage: pnpm scan:secrets
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

type Finding = {
  file: string
  line: number
  rule: string
  snippet: string
}

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

function redact(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 8) return '***'
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)} (len=${trimmed.length})`
}

/** Values that are intentionally non-secret in this repo. */
function isAllowedSecretishValue(raw: string): boolean {
  const v = raw.trim().replace(/^["'`]|["'`]$/g, '')
  if (!v) return true
  if (/^process\.env\./i.test(v)) return true
  if (/\[redacted/i.test(v)) return true
  if (/^(undefined|null)$/i.test(v)) return true

  // Documented placeholders / disposable local+CI credentials
  if (
    /replace-with|changeme|your-|example|placeholder|TODO|xxx|dummy|USER:PASSWORD|not-for-production|ci-only|waraqa_dev_only|waraqa_ci_only|local-only|generate with|Convert]::ToBase64String/i.test(
      v,
    )
  ) {
    return true
  }

  // Env var *names* mentioned in docs/errors (not values)
  if (/^[A-Z][A-Z0-9_]{5,}$/.test(v) && /(SECRET|PASSWORD|TOKEN|KEY)$/.test(v)) {
    return true
  }

  // Intentional disposable test/fixture passwords (never production)
  if (/^(Test|P0-0|Qa[-_]|phase\d+-ci|Waraqa[-_]?Test)/i.test(v)) return true
  // Paths under tests/ or *fixture* are covered by the Test* convention above;
  // also allow LocalOnly! stamps used by QA fixture generators.
  if (/LocalOnly!?$/i.test(v) || /-QA-/i.test(v) || /-E2E-/i.test(v)) return true

  return false
}

function isEnvExampleLike(file: string): boolean {
  return (
    /(^|[/\\])\.env\.example$/.test(file) ||
    /(^|[/\\])docker-compose\.ya?ml$/.test(file) ||
    /(^|[/\\])\.github[/\\]workflows[/\\]/.test(file)
  )
}

function scanText(file: string, text: string): Finding[] {
  const findings: Finding[] = []
  const lines = text.split(/\r?\n/)
  const envExampleLike = isEnvExampleLike(file)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const lineNo = i + 1

    // Skip comments that only document how to set secrets
    if (/^\s*[#*/]/.test(line) && /password|secret|token/i.test(line) && !/AKIA|BEGIN .+PRIVATE KEY/i.test(line)) {
      continue
    }

    // AWS access key id
    {
      const re = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        findings.push({ file, line: lineNo, rule: 'aws_access_key_id', snippet: redact(m[0]) })
      }
    }

    // Private key PEM
    if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(line)) {
      findings.push({ file, line: lineNo, rule: 'private_key_block', snippet: '***PEM***' })
    }

    // DATABASE_URL with embedded password
    {
      const re =
        /\b(?:DATABASE_URL(?:_DIRECT)?|POSTGRES_URL)\s*[=:]\s*["']?postgres(?:ql)?:\/\/([^:\s/'"]+):([^@\s/'"]+)@/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const pass = m[2] ?? ''
        if (isAllowedSecretishValue(pass) || envExampleLike) continue
        findings.push({
          file,
          line: lineNo,
          rule: 'database_url_password',
          snippet: redact(pass),
        })
      }
    }

    // Explicit secret assignments (skip process.env reads and fixture passwords)
    if (!/process\.env\./.test(line)) {
      const re =
        /\b(?:password|passwd|PAYLOAD_SECRET|PREVIEW_SECRET|CRON_SECRET|WARAQA_\w*PASSWORD)\s*[=:]\s*["']?([^\s"'`,;)]{8,})["']?/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const raw = m[1] ?? ''
        if (isAllowedSecretishValue(raw)) continue
        if (envExampleLike && /ci-only|waraqa_|replace-with|USER:PASSWORD/i.test(line)) continue
        // Object property named password holding a redacted note
        if (/redacted|see \.local-credentials|never commit/i.test(line)) continue
        findings.push({
          file,
          line: lineNo,
          rule: 'password_assignment',
          snippet: redact(raw),
        })
      }
    }

    // Real-looking .env secret lines outside .env.example
    if (!envExampleLike && !file.endsWith('.md') && /^\s*[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|API_KEY)\s*=/.test(line)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)$/)
      if (m) {
        const val = (m[2] ?? '').trim()
        if (!isAllowedSecretishValue(val) && !/^["']?\s*$/.test(val)) {
          // Skip TypeScript / Zod that merely names the key
          if (/\bprocess\.env\b|\bstring\b|\bz\.|\bschema\b/.test(line)) continue
          findings.push({
            file,
            line: lineNo,
            rule: 'dotenv_secretish',
            snippet: redact(val),
          })
        }
      }
    }
  }

  return findings
}

function main(): void {
  const files = listTrackedFiles()
  const all: Finding[] = []

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

    all.push(...scanText(rel, buf.toString('utf8')))
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

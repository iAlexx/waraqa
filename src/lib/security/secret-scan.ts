/**
 * Secret-scan core (pure). Used by `scripts/secret-scan.ts` and unit tests.
 * Never print full secret values — callers must redact snippets.
 */

export type SecretFinding = {
  file: string
  line: number
  rule: string
  snippet: string
}

export function redactSecret(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 8) return '***'
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)} (len=${trimmed.length})`
}

/**
 * Values that are intentionally non-secret in this repo
 * (placeholders, disposable CI/local Docker passwords, variable refs).
 */
export function isAllowedSecretishValue(raw: string): boolean {
  const v = raw.trim().replace(/^["'`]|["'`]$/g, '')
  if (!v) return true
  if (/^process\.env\./i.test(v)) return true
  if (/^(?:opts|args|creds|config|user|data)\.[A-Za-z_][\w.]*$/i.test(v)) return true
  if (/^[A-Za-z_][\w]*Password$/i.test(v)) return true
  if (/\[redacted/i.test(v)) return true
  if (/^(undefined|null)$/i.test(v)) return true

  if (
    /replace-with|changeme|your-|example|placeholder|TODO|xxx|dummy|USER:PASSWORD|not-for-production|ci-?only|waraqa_dev_only|waraqa_ci_only|local-only|generate with|Convert]::ToBase64String/i.test(
      v,
    )
  ) {
    return true
  }

  // Literal username "USER" with password "PASSWORD" in documented URLs
  if (/^PASSWORD$/i.test(v)) return true

  if (/^[A-Z][A-Z0-9_]{5,}$/.test(v) && /(SECRET|PASSWORD|TOKEN|KEY)$/.test(v)) {
    return true
  }

  if (/^(Test|P0-0|Qa[-_]|phase\d+-ci|Waraqa[-_]?Test)/i.test(v)) return true
  if (/LocalOnly!?$/i.test(v) || /-QA-/i.test(v) || /-E2E-/i.test(v)) return true

  return false
}

/** Files that may document env shapes — still subject to value-based DB password checks. */
export function isEnvExampleLike(file: string): boolean {
  return (
    /(^|[/\\])\.env\.example$/.test(file) ||
    /(^|[/\\])docker-compose\.ya?ml$/.test(file) ||
    /(^|[/\\])\.github[/\\]workflows[/\\]/.test(file)
  )
}

/**
 * Scan file text for likely secrets.
 *
 * DATABASE_URL / POSTGRES_URL embedded passwords are NEVER exempted by file class —
 * only by recognized placeholder/disposable values via `isAllowedSecretishValue`.
 */
export function scanSecretText(file: string, text: string): SecretFinding[] {
  const findings: SecretFinding[] = []
  const lines = text.split(/\r?\n/)
  const envExampleLike = isEnvExampleLike(file)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const lineNo = i + 1

    if (
      /^\s*[#*/]/.test(line) &&
      /password|secret|token/i.test(line) &&
      !/AKIA|BEGIN .+PRIVATE KEY/i.test(line)
    ) {
      continue
    }

    {
      const re = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        findings.push({
          file,
          line: lineNo,
          rule: 'aws_access_key_id',
          snippet: redactSecret(m[0]),
        })
      }
    }

    if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(line)) {
      findings.push({ file, line: lineNo, rule: 'private_key_block', snippet: '***PEM***' })
    }

    // DATABASE_URL with embedded password — value whitelist only (no file-class skip)
    {
      const re =
        /\b(?:DATABASE_URL(?:_DIRECT)?|POSTGRES_URL)\s*[=:]\s*["']?postgres(?:ql)?:\/\/([^:\s/'"]+):([^@\s/'"]+)@/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const pass = m[2] ?? ''
        if (isAllowedSecretishValue(pass)) continue
        findings.push({
          file,
          line: lineNo,
          rule: 'database_url_password',
          snippet: redactSecret(pass),
        })
      }
    }

    if (!/process\.env\./.test(line)) {
      const re =
        /\b(?:password|passwd|PAYLOAD_SECRET|PREVIEW_SECRET|CRON_SECRET|WARAQA_\w*PASSWORD|POSTGRES_PASSWORD)\s*[=:]\s*["']?([^\s"'`,;)]{8,})["']?/gi
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const raw = m[1] ?? ''
        if (isAllowedSecretishValue(raw)) continue
        if (/redacted|see \.local-credentials|never commit/i.test(line)) continue
        // Value whitelist only — documentation/CI file class is not an exemption.
        findings.push({
          file,
          line: lineNo,
          rule: 'password_assignment',
          snippet: redactSecret(raw),
        })
      }
    }

    if (!envExampleLike && !file.endsWith('.md') && /^\s*[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|API_KEY)\s*=/.test(line)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)$/)
      if (m) {
        const val = (m[2] ?? '').trim()
        if (!isAllowedSecretishValue(val) && !/^["']?\s*$/.test(val)) {
          if (/\bprocess\.env\b|\bstring\b|\bz\.|\bschema\b/.test(line)) continue
          findings.push({
            file,
            line: lineNo,
            rule: 'dotenv_secretish',
            snippet: redactSecret(val),
          })
        }
      }
    }
  }

  return findings
}

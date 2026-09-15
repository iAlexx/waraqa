import { describe, expect, it } from 'vitest'

import {
  isAllowedSecretishValue,
  redactSecret,
  scanSecretText,
} from '@/lib/security/secret-scan'

describe('secret-scan DATABASE_URL — no file-class exemption', () => {
  const realPass = 'Pr0d-Real-Db-Secret-991!'
  const realUrl = `postgresql://waraqa:${realPass}@db.example.com:5432/waraqa`

  it('A. real-looking DB password in .env.example => FAIL', () => {
    const text = `DATABASE_URL=${realUrl}\n`
    const findings = scanSecretText('.env.example', text)
    expect(findings.some((f) => f.rule === 'database_url_password')).toBe(true)
  })

  it('B. real-looking DB password in docker-compose.yml => FAIL', () => {
    const text = `services:\n  postgres:\n    environment:\n      DATABASE_URL: ${realUrl}\n`
    const findings = scanSecretText('docker-compose.yml', text)
    expect(findings.some((f) => f.rule === 'database_url_password')).toBe(true)
  })

  it('C. real-looking DB password in .github/workflows/ci.yml => FAIL', () => {
    const text = `env:\n  DATABASE_URL: ${realUrl}\n`
    const findings = scanSecretText('.github/workflows/ci.yml', text)
    expect(findings.some((f) => f.rule === 'database_url_password')).toBe(true)
  })

  it('D. approved placeholder DB values => PASS', () => {
    const text = [
      'DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres',
      'DATABASE_URL_DIRECT=postgresql://USER:PASSWORD@HOST:5432/postgres',
    ].join('\n')
    const findings = scanSecretText('.env.example', text)
    expect(findings.filter((f) => f.rule === 'database_url_password')).toEqual([])
  })

  it('E. CI disposable explicitly-whitelisted values => PASS', () => {
    const ciYml = [
      'DATABASE_URL: postgresql://waraqa:waraqa_ci_only@localhost:5432/waraqa',
      'DATABASE_URL_DIRECT: postgresql://waraqa:waraqa_ci_only@localhost:5432/waraqa',
    ].join('\n')
    expect(scanSecretText('.github/workflows/ci.yml', ciYml)).toEqual([])

    const docker = 'POSTGRES_PASSWORD: waraqa_dev_only\n'
    expect(scanSecretText('docker-compose.yml', docker)).toEqual([])
  })

  it('F. output remains redacted (never full secret)', () => {
    const findings = scanSecretText('.env.example', `DATABASE_URL=${realUrl}\n`)
    const hit = findings.find((f) => f.rule === 'database_url_password')
    expect(hit).toBeTruthy()
    expect(hit!.snippet).not.toContain(realPass)
    expect(hit!.snippet).toMatch(/len=\d+/)
    expect(redactSecret(realPass)).not.toBe(realPass)
  })
})

describe('isAllowedSecretishValue', () => {
  it('accepts documented disposable passwords', () => {
    expect(isAllowedSecretishValue('waraqa_ci_only')).toBe(true)
    expect(isAllowedSecretishValue('waraqa_dev_only')).toBe(true)
    expect(isAllowedSecretishValue('PASSWORD')).toBe(true)
  })

  it('rejects real-looking passwords', () => {
    expect(isAllowedSecretishValue('Pr0d-Real-Db-Secret-991!')).toBe(false)
  })
})

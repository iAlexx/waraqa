import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getServerEnv, resetServerEnvCacheForTests } from '@/lib/env'

describe('getServerEnv', () => {
  const keys = [
    'DATABASE_URL',
    'DATABASE_URL_DIRECT',
    'PAYLOAD_SECRET',
    'NEXT_PUBLIC_SERVER_URL',
  ] as const

  const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {}

  beforeEach(() => {
    for (const key of keys) {
      snapshot[key] = process.env[key]
    }
    resetServerEnvCacheForTests()
    process.env.DATABASE_URL =
      'postgresql://test_user:test_pass@127.0.0.1:5432/waraqa_test'
    process.env.DATABASE_URL_DIRECT =
      'postgresql://test_user:test_pass@127.0.0.1:5432/waraqa_test'
    process.env.PAYLOAD_SECRET = 'x'.repeat(32)
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    resetServerEnvCacheForTests()
    for (const key of keys) {
      const value = snapshot[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('accepts a valid Phase 1 environment contract', () => {
    const env = getServerEnv()
    expect(env.DATABASE_URL).toContain('postgresql://')
    expect(env.DATABASE_URL_DIRECT).toContain('postgresql://')
    expect(env.PAYLOAD_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(env.NEXT_PUBLIC_SERVER_URL).toBe('http://localhost:3000')
  })

  it('rejects a missing DATABASE_URL with a clear error', () => {
    delete process.env.DATABASE_URL
    resetServerEnvCacheForTests()
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/)
  })
})

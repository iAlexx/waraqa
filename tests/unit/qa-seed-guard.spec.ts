import { afterEach, describe, expect, it, vi } from 'vitest'

import { allowSeedBypass } from '@/lib/qa-seed-guard'

describe('allowSeedBypass', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows in test when context.seed is true', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('ALLOW_QA_FIXTURE', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(true)
    expect(allowSeedBypass({ context: {} })).toBe(false)
  })

  it('blocks in production without ALLOW_QA_FIXTURE', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_QA_FIXTURE', '')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(false)
  })

  it('allows with ALLOW_QA_FIXTURE=1 in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_QA_FIXTURE', '1')
    expect(allowSeedBypass({ context: { seed: true } })).toBe(true)
  })
})

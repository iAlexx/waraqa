import { describe, it, expect, vi, afterEach } from 'vitest'

describe('design-system production guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('calls notFound when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_DESIGN_SYSTEM_QA', '')
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    vi.doMock('next/navigation', () => ({ notFound }))
    vi.doMock('@/components/dev/design-system-showcase', () => ({
      DesignSystemShowcase: () => null,
    }))

    const mod = await import('@/app/(frontend)/dev/design-system/page')
    expect(() => mod.default()).toThrow(/NEXT_NOT_FOUND/)
    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it('skips notFound when ALLOW_DESIGN_SYSTEM_QA=1', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_DESIGN_SYSTEM_QA', '1')
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    vi.doMock('next/navigation', () => ({ notFound }))
    vi.doMock('@/components/dev/design-system-showcase', () => ({
      DesignSystemShowcase: () => null,
    }))

    const mod = await import('@/app/(frontend)/dev/design-system/page')
    try {
      mod.default()
    } catch (error) {
      expect((error as Error).message).not.toMatch(/NEXT_NOT_FOUND/)
    }
    expect(notFound).not.toHaveBeenCalled()
  })
})

describe('wordmark-lab production guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('calls notFound when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_DESIGN_SYSTEM_QA', '')
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    vi.doMock('next/navigation', () => ({ notFound }))
    vi.doMock('@/components/dev/wordmark-lab', () => ({
      WordmarkLab: () => null,
    }))

    const mod = await import('@/app/(frontend)/dev/wordmark-lab/page')
    expect(() => mod.default()).toThrow(/NEXT_NOT_FOUND/)
    expect(notFound).toHaveBeenCalledTimes(1)
  })
})

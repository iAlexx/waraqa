/**
 * Allow test/QA fixture bypass only when explicitly enabled.
 * Never active when NODE_ENV=production or VERCEL_ENV=production —
 * ALLOW_* flags cannot unlock seed bypass on production runtimes.
 *
 * Allowed only when:
 * - NODE_ENV=test / Vitest, OR
 * - ALLOW_QA_FIXTURE=1 or WARAQA_ALLOW_PHASE12_SEED=1 in non-production
 * AND req.context.seed === true
 */
export function allowSeedBypass(req: { context?: Record<string, unknown> }): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  if (process.env.NODE_ENV === 'production') return false

  const isTestRuntime =
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.VITEST === '1'

  const allowExplicitSeed =
    process.env.ALLOW_QA_FIXTURE === '1' || process.env.WARAQA_ALLOW_PHASE12_SEED === '1'

  if (!isTestRuntime && !allowExplicitSeed) {
    return false
  }

  return req.context?.seed === true
}

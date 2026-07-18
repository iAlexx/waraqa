/**
 * Allow test/QA fixture bypass only when explicitly enabled.
 * Never active in production unless ALLOW_QA_FIXTURE=1 (local disposable only).
 */
export function allowSeedBypass(req: { context?: Record<string, unknown> }): boolean {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_QA_FIXTURE !== '1') {
    return false
  }
  if (process.env.NODE_ENV !== 'test' && process.env.ALLOW_QA_FIXTURE !== '1') {
    return false
  }
  return req.context?.seed === true
}

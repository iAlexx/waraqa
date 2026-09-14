/**
 * Resolve which connection string Payload migration tooling should use.
 *
 * Prefer DATABASE_URL_DIRECT when set (non-empty); otherwise DATABASE_URL.
 * Never logs credentials.
 */
export type EnvLike = Record<string, string | undefined>

export function resolveMigrationDatabaseUrl(env: EnvLike = process.env): {
  url: string
  source: 'DATABASE_URL_DIRECT' | 'DATABASE_URL'
} {
  const direct = (env.DATABASE_URL_DIRECT || '').trim()
  if (direct) {
    return { url: direct, source: 'DATABASE_URL_DIRECT' }
  }
  const runtime = (env.DATABASE_URL || '').trim()
  if (runtime) {
    return { url: runtime, source: 'DATABASE_URL' }
  }
  throw new Error(
    'Migration tooling requires DATABASE_URL_DIRECT (preferred) or DATABASE_URL. Neither is set.',
  )
}

/**
 * Build a child-process env for Payload migrate commands:
 * sets DATABASE_URL to the resolved migration URL so Payload's postgresAdapter
 * (which reads DATABASE_URL) targets the direct connection when available.
 */
export function buildMigrationChildEnv(env: EnvLike = process.env): EnvLike {
  const { url } = resolveMigrationDatabaseUrl(env)
  return {
    ...env,
    DATABASE_URL: url,
  }
}

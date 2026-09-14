import { describe, expect, it } from 'vitest'

import {
  buildMigrationChildEnv,
  resolveMigrationDatabaseUrl,
} from '@/lib/db/migration-database-url'

describe('resolveMigrationDatabaseUrl', () => {
  it('prefers DATABASE_URL_DIRECT when set', () => {
    const r = resolveMigrationDatabaseUrl({
      DATABASE_URL: 'postgresql://app:waraqa_ci_only@host:6543/db',
      DATABASE_URL_DIRECT: 'postgresql://app:waraqa_ci_only@host:5432/db',
    })
    expect(r.source).toBe('DATABASE_URL_DIRECT')
    expect(r.url).toContain(':5432/')
  })

  it('falls back to DATABASE_URL when direct is absent', () => {
    const r = resolveMigrationDatabaseUrl({
      DATABASE_URL: 'postgresql://app:waraqa_ci_only@host:6543/db',
    })
    expect(r.source).toBe('DATABASE_URL')
    expect(r.url).toContain(':6543/')
  })

  it('throws when neither is set', () => {
    expect(() => resolveMigrationDatabaseUrl({})).toThrow(/DATABASE_URL/)
  })

  it('buildMigrationChildEnv sets DATABASE_URL to the resolved migration URL', () => {
    const child = buildMigrationChildEnv({
      DATABASE_URL: 'postgresql://app:waraqa_ci_only@host:6543/db',
      DATABASE_URL_DIRECT: 'postgresql://app:waraqa_ci_only@host:5432/db',
      OTHER: 'keep',
    })
    expect(child.DATABASE_URL).toBe('postgresql://app:waraqa_ci_only@host:5432/db')
    expect(child.DATABASE_URL_DIRECT).toBe('postgresql://app:waraqa_ci_only@host:5432/db')
    expect(child.OTHER).toBe('keep')
  })
})

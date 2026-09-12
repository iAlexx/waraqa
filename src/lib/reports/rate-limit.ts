import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

import { REPORT_RATE_LIMIT } from './types'

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; code: 'rate_limited'; retryAfterSec: number }

type DrizzleLike = {
  execute: (query: unknown) => Promise<{ rows?: Array<{ hit_count?: number | string }> } | unknown>
}

function getDrizzle(payload: Payload): DrizzleLike {
  const db = payload.db as { drizzle?: DrizzleLike }
  if (!db?.drizzle?.execute) {
    throw new Error('Rate limit store unavailable')
  }
  return db.drizzle
}

function windowStartIso(now: Date): string {
  const ms = Math.floor(now.getTime() / REPORT_RATE_LIMIT.windowMs) * REPORT_RATE_LIMIT.windowMs
  return new Date(ms).toISOString()
}

/**
 * PostgreSQL-backed fixed-window rate limit.
 * Stores only identity_hash (pseudonymous) — never raw IP.
 */
export async function consumeReportRateLimit(
  payload: Payload,
  identityHash: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const drizzle = getDrizzle(payload)
  const windowStart = windowStartIso(now)

  const result = await drizzle.execute(sql`
    INSERT INTO report_rate_buckets (identity_hash, window_start, hit_count)
    VALUES (${identityHash}, ${windowStart}::timestamptz, 1)
    ON CONFLICT (identity_hash, window_start)
    DO UPDATE SET hit_count = report_rate_buckets.hit_count + 1
    RETURNING hit_count
  `)

  const rows = (result as { rows?: Array<{ hit_count?: number | string }> })?.rows
  const hitRaw = rows?.[0]?.hit_count
  const hitCount = typeof hitRaw === 'number' ? hitRaw : Number(hitRaw || 0)

  if (!Number.isFinite(hitCount) || hitCount > REPORT_RATE_LIMIT.maxHits) {
    const windowEnd = new Date(
      Math.floor(now.getTime() / REPORT_RATE_LIMIT.windowMs) * REPORT_RATE_LIMIT.windowMs +
        REPORT_RATE_LIMIT.windowMs,
    )
    const retryAfterSec = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { ok: false, code: 'rate_limited', retryAfterSec }
  }

  return { ok: true, remaining: Math.max(0, REPORT_RATE_LIMIT.maxHits - hitCount) }
}

/** Best-effort cleanup of old buckets (call occasionally from submit path). */
export async function cleanupExpiredReportRateBuckets(
  payload: Payload,
  now: Date = new Date(),
): Promise<void> {
  try {
    const drizzle = getDrizzle(payload)
    const cutoff = new Date(now.getTime() - REPORT_RATE_LIMIT.retainMs).toISOString()
    await drizzle.execute(sql`
      DELETE FROM report_rate_buckets
      WHERE window_start < ${cutoff}::timestamptz
    `)
  } catch {
    // Non-fatal — rate limiting still works without cleanup.
  }
}

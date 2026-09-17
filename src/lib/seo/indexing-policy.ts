/**
 * Central public indexing policy (Phase 14-A).
 *
 * robots.txt / Metadata robots are NOT access control — they only signal crawlers.
 * Preview deployments still need real Vercel Deployment Protection (owner ops).
 *
 * Fail closed: indexing is opt-in only when ALL of:
 * - VERCEL_ENV === 'production' (missing / development / unexpected → noindex)
 * - WARAQA_PUBLIC_CONTENT_MODE resolves to 'production'
 * - WARAQA_FORCE_NOINDEX is not '1'
 */
import { getPublicContentMode } from '@/lib/content-class/public-content-policy'

export type IndexingDecision = {
  allowIndexing: boolean
  reasons: string[]
}

export function resolveIndexingDecision(input?: {
  vercelEnv?: string | undefined
  contentMode?: ReturnType<typeof getPublicContentMode>
  forceNoIndex?: string | undefined
}): IndexingDecision {
  const vercelEnv = (input?.vercelEnv ?? process.env.VERCEL_ENV ?? '').trim().toLowerCase()
  const contentMode = input?.contentMode ?? getPublicContentMode()
  const force =
    (input?.forceNoIndex ?? process.env.WARAQA_FORCE_NOINDEX ?? '').trim() === '1'

  const reasons: string[] = []

  if (force) reasons.push('WARAQA_FORCE_NOINDEX=1')

  if (vercelEnv !== 'production') {
    if (!vercelEnv) reasons.push('VERCEL_ENV=missing')
    else if (vercelEnv === 'preview') reasons.push('VERCEL_ENV=preview')
    else if (vercelEnv === 'development') reasons.push('VERCEL_ENV=development')
    else reasons.push(`VERCEL_ENV=unexpected:${vercelEnv}`)
  }

  if (contentMode !== 'production') {
    reasons.push(
      contentMode === 'demo'
        ? 'WARAQA_PUBLIC_CONTENT_MODE=demo'
        : `WARAQA_PUBLIC_CONTENT_MODE=${contentMode}`,
    )
  }

  return {
    allowIndexing: reasons.length === 0,
    reasons,
  }
}

export function shouldAllowPublicIndexing(): boolean {
  return resolveIndexingDecision().allowIndexing
}

/** Metadata robots fragment for layouts / pages. */
export function publicRobotsMetadata(): { index: boolean; follow: boolean } {
  const allow = shouldAllowPublicIndexing()
  return { index: allow, follow: allow }
}

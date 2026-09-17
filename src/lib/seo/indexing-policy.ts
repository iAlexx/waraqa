/**
 * Central public indexing policy (Phase 14-A).
 *
 * robots.txt / Metadata robots are NOT access control — they only signal crawlers.
 * Preview deployments still need real Vercel Deployment Protection (owner ops).
 *
 * Rules:
 * - Vercel Preview → never index
 * - WARAQA_PUBLIC_CONTENT_MODE=demo → never index as authoritative public info
 * - WARAQA_FORCE_NOINDEX=1 → never index (ops kill-switch)
 * - Otherwise allow index (PRODUCTION content mode on a production deploy)
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
  if (vercelEnv === 'preview') reasons.push('VERCEL_ENV=preview')
  if (contentMode === 'demo') reasons.push('WARAQA_PUBLIC_CONTENT_MODE=demo')

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

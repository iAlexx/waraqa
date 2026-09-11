/**
 * Central public-content environment policy (P0-06).
 * Do not scatter NODE_ENV / VERCEL_ENV checks in loaders.
 *
 * WARAQA_PUBLIC_CONTENT_MODE=production|demo
 * Safe default: production (DEMO + QA_TEST blocked from public).
 * Invalid values fail closed → production.
 * Do NOT infer safety from NODE_ENV alone.
 */
import {
  isContentClass,
  normalizeContentClass,
  type ContentClass,
} from '@/lib/content-class/types'

export const PUBLIC_CONTENT_MODES = ['production', 'demo'] as const
export type PublicContentMode = (typeof PUBLIC_CONTENT_MODES)[number]

let testOverride: PublicContentMode | null = null

/** Vitest / NODE_ENV=test only — never honor overrides in app/runtime. */
function isTestRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.VITEST === '1'
  )
}

/**
 * Test-only override for public content mode.
 * No-op outside Vitest / NODE_ENV=test (cannot silently change production).
 */
export function setPublicContentModeForTests(mode: PublicContentMode | null): void {
  if (!isTestRuntime()) return
  testOverride = mode
}

export function resolvePublicContentMode(
  raw: string | undefined = process.env.WARAQA_PUBLIC_CONTENT_MODE,
): PublicContentMode {
  if (testOverride && isTestRuntime()) return testOverride
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'demo') return 'demo'
  if (value === 'production' || value === '') return 'production'
  // Invalid → fail closed
  return 'production'
}

export function getPublicContentMode(): PublicContentMode {
  return resolvePublicContentMode()
}

/** Classes allowed on the public surface for the active mode. QA_TEST never. */
export function getPubliclyAllowedContentClasses(
  mode: PublicContentMode = getPublicContentMode(),
): ContentClass[] {
  if (mode === 'demo') return ['PRODUCTION', 'DEMO']
  return ['PRODUCTION']
}

export function isContentClassPubliclyAllowed(
  contentClass: unknown,
  mode: PublicContentMode = getPublicContentMode(),
): boolean {
  const cls = normalizeContentClass(contentClass)
  if (!isContentClass(contentClass) && contentClass != null && contentClass !== '') {
    // Explicitly invalid enum string → fail closed
    return false
  }
  return getPubliclyAllowedContentClasses(mode).includes(cls)
}

/**
 * Dependency: a transaction may only draw authoritative trust from compatible evidence classes.
 * PRODUCTION → PRODUCTION only
 * DEMO → DEMO or PRODUCTION (never QA_TEST)
 * QA_TEST → any valid class (CMS/test graphs; never public)
 */
export function claimClassSupportsTransaction(
  transactionClass: unknown,
  claimClass: unknown,
): boolean {
  if (!isContentClass(claimClass)) return false
  const tx = normalizeContentClass(transactionClass)
  if (tx === 'PRODUCTION') return claimClass === 'PRODUCTION'
  if (tx === 'DEMO') return claimClass === 'DEMO' || claimClass === 'PRODUCTION'
  if (tx === 'QA_TEST') return true
  return false
}

export function sourceClassSupportsClaim(claimClass: unknown, sourceClass: unknown): boolean {
  if (!isContentClass(sourceClass)) return false
  const claim = normalizeContentClass(claimClass)
  if (claim === 'PRODUCTION') return sourceClass === 'PRODUCTION'
  if (claim === 'DEMO') return sourceClass === 'DEMO' || sourceClass === 'PRODUCTION'
  if (claim === 'QA_TEST') return true
  return false
}

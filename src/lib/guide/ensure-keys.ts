import { STABLE_KEY_RE } from '@/lib/guide/types'

function slugifyKey(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  if (STABLE_KEY_RE.test(s)) return s
  return `k_${s || 'item'}`.replace(/[^a-z0-9_]/g, '_').slice(0, 64)
}

function ensureUnique(key: string, used: Set<string>): string {
  let candidate = key
  let i = 2
  while (used.has(candidate)) {
    const base = key.slice(0, 60)
    candidate = `${base}_${i}`
    i += 1
  }
  used.add(candidate)
  return candidate
}

function fillArrayKeys(
  rows: Array<Record<string, unknown>> | null | undefined,
  prefix: string,
  used: Set<string>,
): void {
  if (!Array.isArray(rows)) return
  for (const row of rows) {
    const existing = typeof row.key === 'string' ? row.key.trim() : ''
    if (existing && STABLE_KEY_RE.test(existing) && !used.has(existing)) {
      used.add(existing)
      continue
    }
    const idHint = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : ''
    const labelHint =
      typeof row.title === 'string'
        ? row.title
        : typeof row.label === 'string'
          ? row.label
          : ''
    const base = slugifyKey(existing || `${prefix}_${idHint || labelHint || 'item'}`)
    row.key = ensureUnique(base.startsWith(prefix) ? base : `${prefix}_${base}`, used)
  }
}

/**
 * BeforeChange: backfill missing stable keys on content arrays so rules can target them.
 * Does not invent guide questions — only docs/steps/fees.
 */
export const ensureStableContentKeys: import('payload').CollectionBeforeChangeHook = ({
  data,
}) => {
  if (!data) return data
  const next = data as Record<string, unknown>
  const used = new Set<string>()

  fillArrayKeys(next.requiredDocuments as Array<Record<string, unknown>>, 'doc', used)
  fillArrayKeys(next.steps as Array<Record<string, unknown>>, 'step', used)
  fillArrayKeys(next.fees as Array<Record<string, unknown>>, 'fee', used)

  return next
}

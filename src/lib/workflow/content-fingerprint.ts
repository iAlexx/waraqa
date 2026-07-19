import { createHash } from 'node:crypto'

type Localized = string | Record<string, string | null | undefined> | null | undefined

function loc(value: Localized): { ar: string; en: string } {
  if (value == null) return { ar: '', en: '' }
  if (typeof value === 'string') return { ar: value.trim(), en: value.trim() }
  return {
    ar: typeof value.ar === 'string' ? value.ar.trim() : '',
    en: typeof value.en === 'string' ? value.en.trim() : '',
  }
}

function relId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return id != null ? String(id) : null
  }
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  return null
}

function sortedIds(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((v) => relId(v))
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Deterministic critical-content fingerprint for approval invalidation.
 * Excludes timestamps, workflow metadata, internalNotes, hashes, and row technical IDs.
 */
export function buildCriticalCanonical(data: Record<string, unknown>): unknown {
  const sources = Array.isArray(data.sources)
    ? data.sources.map((row) => {
        const r = row as Record<string, unknown>
        const covered = Array.isArray(r.coveredSections)
          ? [...(r.coveredSections as string[])].sort()
          : []
        return {
          source: relId(r.source),
          primary: Boolean(r.primary),
          coveredSections: covered,
          citationNote: loc(r.citationNote as Localized),
        }
      })
    : []

  const requiredDocuments = Array.isArray(data.requiredDocuments)
    ? data.requiredDocuments.map((row) => {
        const r = row as Record<string, unknown>
        return {
          document: relId(r.document),
          requirementType: r.requirementType ?? null,
          condition: loc(r.condition as Localized),
          quantity: r.quantity ?? null,
          originalRequired: Boolean(r.originalRequired),
          copiesRequired: r.copiesRequired ?? null,
          certificationRequired: Boolean(r.certificationRequired),
          notes: loc(r.notes as Localized),
        }
      })
    : []

  const steps = Array.isArray(data.steps)
    ? data.steps.map((row) => {
        const r = row as Record<string, unknown>
        return {
          title: loc(r.title as Localized),
          description: loc(r.description as Localized),
          locationNote: loc(r.locationNote as Localized),
        }
      })
    : []

  const fees = Array.isArray(data.fees)
    ? data.fees.map((row) => {
        const r = row as Record<string, unknown>
        return {
          label: loc(r.label as Localized),
          amount: r.amount ?? null,
          currency: r.currency ?? null,
          amountText: loc(r.amountText as Localized),
          notes: loc(r.notes as Localized),
        }
      })
    : []

  const aliases = Array.isArray(data.aliases)
    ? data.aliases.map((row) => loc((row as { value?: Localized }).value))
    : []

  const duration = data.estimatedDuration as Record<string, unknown> | null | undefined

  return {
    title: loc(data.title as Localized),
    slug: typeof data.slug === 'string' ? data.slug : '',
    summary: loc(data.summary as Localized),
    category: relId(data.category),
    agency: relId(data.agency),
    serviceCenters: sortedIds(data.serviceCenters),
    audiences: Array.isArray(data.audiences)
      ? [...(data.audiences as string[])].sort()
      : [],
    eligibility: loc(data.eligibility as Localized),
    aliases,
    requiredDocuments,
    steps,
    fees,
    estimatedDuration: duration
      ? {
          minimum: duration.minimum ?? null,
          maximum: duration.maximum ?? null,
          unit: duration.unit ?? null,
          note: loc(duration.note as Localized),
        }
      : null,
    outcome: loc(data.outcome as Localized),
    prerequisiteProcedures: sortedIds(data.prerequisiteProcedures),
    sources,
    active: data.active !== false,
    markedOutdated: Boolean(data.markedOutdated),
  }
}

export function hashCriticalContent(data: Record<string, unknown>): string {
  const canonical = buildCriticalCanonical(data)
  const json = JSON.stringify(canonical)
  return createHash('sha256').update(json, 'utf8').digest('hex')
}

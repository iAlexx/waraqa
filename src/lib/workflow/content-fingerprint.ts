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
          key: typeof r.key === 'string' ? r.key : null,
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
          key: typeof r.key === 'string' ? r.key : null,
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
          key: typeof r.key === 'string' ? r.key : null,
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
    contentClass: typeof data.contentClass === 'string' ? data.contentClass : null,
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
    claimBindings: Array.isArray(data.claimBindings)
      ? data.claimBindings.map((row) => {
          const r = row as Record<string, unknown>
          const claim =
            r.claim && typeof r.claim === 'object' && r.claim !== null && 'id' in r.claim
              ? String((r.claim as { id: unknown }).id)
              : r.claim != null
                ? String(r.claim)
                : null
          return {
            claim,
            required: r.required !== false,
            coveredSection: typeof r.coveredSection === 'string' ? r.coveredSection : null,
          }
        })
      : [],
    guideEnabled: Boolean(data.guideEnabled),
    questions: Array.isArray(data.questions)
      ? data.questions.map((row) => {
          const r = row as Record<string, unknown>
          return {
            key: typeof r.key === 'string' ? r.key : null,
            questionType: r.questionType ?? null,
            prompt: loc(r.prompt as Localized),
            helpText: loc(r.helpText as Localized),
            required: r.required !== false,
            active: r.active !== false,
            options: Array.isArray(r.options)
              ? r.options.map((o) => {
                  const opt = o as Record<string, unknown>
                  return {
                    key: typeof opt.key === 'string' ? opt.key : null,
                    label: loc(opt.label as Localized),
                  }
                })
              : [],
            visibleWhen: r.visibleWhen ?? null,
          }
        })
      : [],
    variants: Array.isArray(data.variants)
      ? data.variants.map((row) => {
          const r = row as Record<string, unknown>
          return {
            key: typeof r.key === 'string' ? r.key : null,
            title: loc(r.title as Localized),
            explanation: loc(r.explanation as Localized),
            active: r.active !== false,
          }
        })
      : [],
    notices: Array.isArray(data.notices)
      ? data.notices.map((row) => {
          const r = row as Record<string, unknown>
          return {
            key: typeof r.key === 'string' ? r.key : null,
            title: loc(r.title as Localized),
            body: loc(r.body as Localized),
            severity: r.severity ?? null,
            active: r.active !== false,
          }
        })
      : [],
    decisionRules: Array.isArray(data.decisionRules)
      ? data.decisionRules.map((row) => {
          const r = row as Record<string, unknown>
          return {
            key: typeof r.key === 'string' ? r.key : null,
            priority: r.priority ?? null,
            active: r.active !== false,
            explanation: loc(r.explanation as Localized),
            when: r.when ?? null,
            effects: Array.isArray(r.effects)
              ? r.effects.map((fx) => {
                  const e = fx as Record<string, unknown>
                  return { type: e.type ?? null, targetKey: e.targetKey ?? null }
                })
              : [],
          }
        })
      : [],
    active: data.active !== false,
    markedOutdated: Boolean(data.markedOutdated),
  }
}

export function hashCriticalContent(data: Record<string, unknown>): string {
  const canonical = buildCriticalCanonical(data)
  const json = JSON.stringify(canonical)
  return createHash('sha256').update(json, 'utf8').digest('hex')
}

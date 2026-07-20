import { isPubliclyEligibleTransaction } from '@/lib/public/featured-transactions'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'
import { toSafePublicLink, type SafePublicUrl } from '@/lib/public/safe-url'
import {
  formatEstimatedDuration,
  formatPublicDate,
  labelAudience,
  labelCurrency,
  labelRequirementType,
} from '@/lib/public/transaction-labels'
import { GOVERNORATES } from '@/lib/governorates'

/** Public DTO — never includes editorial/workflow/private fields. */
export type PublicTransactionDetail = {
  id: number | string
  title: string
  slug: string
  summary: string
  demoLabeled: boolean
  lastReviewedAt: string | null
  lastReviewedLabel: string | null
  category: { name: string; slug: string } | null
  agency: { name: string; slug: string; shortName: string | null } | null
  serviceCenters: PublicServiceCenter[]
  audiences: string[]
  eligibility: string | null
  overview: string | null
  prerequisites: PublicPrerequisite[]
  requiredDocuments: PublicRequiredDocument[]
  steps: PublicStep[]
  fees: PublicFee[]
  duration: string | null
  outcome: string | null
  sources: PublicSourceRef[]
}

export type PublicServiceCenter = {
  name: string
  slug: string
  city: string | null
  governorateLabel: string | null
  address: string | null
  phones: string[]
  workingHours: string | null
}

export type PublicPrerequisite = {
  title: string
  slug: string
  href: string
}

export type PublicRequiredDocument = {
  name: string
  requirementTypeLabel: string
  condition: string | null
  quantity: number | null
  originalRequired: boolean
  copiesRequired: number | null
  certificationRequired: boolean
  notes: string | null
}

export type PublicStep = {
  title: string
  description: string
  locationNote: string | null
}

export type PublicFee = {
  label: string
  amountDisplay: string | null
  notes: string | null
}

export type PublicSourceRef = {
  title: string
  primary: boolean
  citationNote: string | null
  officialLink: SafePublicUrl | null
  archiveLink: SafePublicUrl | null
  referenceNumber: string | null
  lastVerifiedLabel: string | null
}

function isDemoLabel(text: string): boolean {
  return /تجريب|demo|test|qa-|fixture/i.test(text)
}

function isPopulatedObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'id' in value)
}

function governorateLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const hit = GOVERNORATES.find((g) => g.value === value)
  return hit?.label ?? null
}

function mapServiceCenter(raw: unknown): PublicServiceCenter | null {
  if (!isPopulatedObject(raw)) return null
  if (raw._status != null && raw._status !== 'published') return null
  if (raw.active === false) return null
  const name = localizedString(raw.name as LocalizedLike)
  const slug = typeof raw.slug === 'string' ? raw.slug : ''
  if (!name || !slug) return null
  const phones = Array.isArray(raw.phones)
    ? raw.phones
        .map((p) => {
          if (!p || typeof p !== 'object') return ''
          return typeof (p as { number?: unknown }).number === 'string'
            ? String((p as { number: string }).number).trim()
            : ''
        })
        .filter(Boolean)
    : []
  return {
    name,
    slug,
    city: localizedString(raw.city as LocalizedLike) || null,
    governorateLabel: governorateLabel(raw.governorate),
    address: localizedString(raw.address as LocalizedLike) || null,
    phones,
    workingHours: localizedString(raw.workingHours as LocalizedLike) || null,
  }
}

function mapPrerequisite(raw: unknown): PublicPrerequisite | null {
  if (!isPopulatedObject(raw)) return null
  if (!isPubliclyEligibleTransaction(raw)) return null
  const title = localizedString(raw.title as LocalizedLike)
  const slug = typeof raw.slug === 'string' ? raw.slug : ''
  if (!title || !slug) return null
  return {
    title,
    slug,
    href: `/transactions/${encodeURIComponent(slug)}`,
  }
}

function mapRequiredDocument(raw: unknown): PublicRequiredDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const doc = row.document
  if (!isPopulatedObject(doc)) return null
  if (doc._status != null && doc._status !== 'published') return null
  if (doc.active === false) return null
  const name = localizedString(doc.name as LocalizedLike)
  if (!name) return null
  const rtype = typeof row.requirementType === 'string' ? row.requirementType : 'required'
  return {
    name,
    requirementTypeLabel: labelRequirementType(rtype),
    condition: localizedString(row.condition as LocalizedLike) || null,
    quantity: typeof row.quantity === 'number' ? row.quantity : null,
    originalRequired: row.originalRequired === true,
    copiesRequired: typeof row.copiesRequired === 'number' ? row.copiesRequired : null,
    certificationRequired: row.certificationRequired === true,
    notes: localizedString(row.notes as LocalizedLike) || null,
  }
}

function mapStep(raw: unknown): PublicStep | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const title = localizedString(row.title as LocalizedLike)
  const description = localizedString(row.description as LocalizedLike)
  if (!title || !description) return null
  return {
    title,
    description,
    locationNote: localizedString(row.locationNote as LocalizedLike) || null,
  }
}

function mapFee(raw: unknown): PublicFee | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const label = localizedString(row.label as LocalizedLike)
  if (!label) return null
  const amountText = localizedString(row.amountText as LocalizedLike)
  let amountDisplay: string | null = amountText || null
  if (!amountDisplay && typeof row.amount === 'number') {
    const cur = typeof row.currency === 'string' ? labelCurrency(row.currency) : ''
    amountDisplay = `${row.amount} ${cur}`.trim()
  }
  return {
    label,
    amountDisplay,
    notes: localizedString(row.notes as LocalizedLike) || null,
  }
}

function mapSourceRef(raw: unknown): PublicSourceRef | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const source = row.source
  if (!isPopulatedObject(source)) return null
  if (source._status != null && source._status !== 'published') return null
  if (source.active === false) return null
  const title = localizedString(source.title as LocalizedLike)
  if (!title) return null
  return {
    title,
    primary: row.primary === true,
    citationNote: localizedString(row.citationNote as LocalizedLike) || null,
    officialLink: toSafePublicLink(source.officialUrl, title),
    archiveLink: toSafePublicLink(source.archiveUrl, 'نسخة مؤرشفة'),
    referenceNumber:
      typeof source.referenceNumber === 'string' && source.referenceNumber.trim()
        ? source.referenceNumber.trim()
        : null,
    lastVerifiedLabel: formatPublicDate(
      typeof source.lastVerifiedAt === 'string' ? source.lastVerifiedAt : null,
    ),
  }
}

/**
 * Map a Payload transaction (depth ≥ 1–2) to a public detail DTO.
 * Returns null if ineligible or missing required public fields.
 */
export function mapPublicTransactionDetail(
  doc: Record<string, unknown>,
): PublicTransactionDetail | null {
  if (!isPubliclyEligibleTransaction(doc)) return null

  const title = localizedString(doc.title as LocalizedLike)
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  const summary = localizedString(doc.summary as LocalizedLike)
  if (!title || !slug || !summary) return null

  const category =
    isPopulatedObject(doc.category) &&
    (doc.category._status == null || doc.category._status === 'published') &&
    doc.category.active !== false
      ? {
          name: localizedString(doc.category.name as LocalizedLike),
          slug: typeof doc.category.slug === 'string' ? doc.category.slug : '',
        }
      : null
  const categorySafe =
    category && category.name && category.slug ? category : null

  const agencyRaw = doc.agency
  const agency =
    isPopulatedObject(agencyRaw) &&
    (agencyRaw._status == null || agencyRaw._status === 'published') &&
    agencyRaw.active !== false
      ? {
          name: localizedString(agencyRaw.name as LocalizedLike),
          slug: typeof agencyRaw.slug === 'string' ? agencyRaw.slug : '',
          shortName: localizedString(agencyRaw.shortName as LocalizedLike) || null,
        }
      : null
  const agencySafe = agency && agency.name && agency.slug ? agency : null

  const audiences = Array.isArray(doc.audiences)
    ? doc.audiences
        .filter((a): a is string => typeof a === 'string')
        .map(labelAudience)
        .filter(Boolean)
    : []

  const durationGroup =
    doc.estimatedDuration && typeof doc.estimatedDuration === 'object'
      ? (doc.estimatedDuration as Record<string, unknown>)
      : null
  const duration = durationGroup
    ? formatEstimatedDuration({
        minimum: durationGroup.minimum as number | null,
        maximum: durationGroup.maximum as number | null,
        unit: durationGroup.unit as string | null,
        note: localizedString(durationGroup.note as LocalizedLike) || null,
      })
    : null

  const lastReviewedAt = typeof doc.lastReviewedAt === 'string' ? doc.lastReviewedAt : null

  const steps = Array.isArray(doc.steps)
    ? doc.steps.map(mapStep).filter((s): s is PublicStep => Boolean(s))
    : []
  if (steps.length < 1) return null

  return {
    id: doc.id as number | string,
    title,
    slug,
    summary,
    demoLabeled: isDemoLabel(title) || isDemoLabel(slug),
    lastReviewedAt,
    lastReviewedLabel: formatPublicDate(lastReviewedAt),
    category: categorySafe,
    agency: agencySafe,
    serviceCenters: Array.isArray(doc.serviceCenters)
      ? doc.serviceCenters.map(mapServiceCenter).filter((c): c is PublicServiceCenter => Boolean(c))
      : [],
    audiences,
    eligibility: localizedString(doc.eligibility as LocalizedLike) || null,
    overview: null,
    prerequisites: Array.isArray(doc.prerequisiteProcedures)
      ? doc.prerequisiteProcedures
          .map(mapPrerequisite)
          .filter((p): p is PublicPrerequisite => Boolean(p))
      : [],
    requiredDocuments: Array.isArray(doc.requiredDocuments)
      ? doc.requiredDocuments
          .map(mapRequiredDocument)
          .filter((d): d is PublicRequiredDocument => Boolean(d))
      : [],
    steps,
    fees: Array.isArray(doc.fees)
      ? doc.fees.map(mapFee).filter((f): f is PublicFee => Boolean(f))
      : [],
    duration,
    outcome: localizedString(doc.outcome as LocalizedLike) || null,
    sources: Array.isArray(doc.sources)
      ? doc.sources.map(mapSourceRef).filter((s): s is PublicSourceRef => Boolean(s))
      : [],
  }
}

/** Keys that must never appear on a public DTO (test helper). */
export const PUBLIC_DETAIL_FORBIDDEN_KEYS = [
  'internalNotes',
  'searchText',
  'approvedContentHash',
  'approvedVersionId',
  'workflowState',
  'markedOutdated',
  '_status',
  'createdBy',
  'lastUpdatedBy',
  'publishedBy',
  'changeRequestComment',
  'notes',
] as const

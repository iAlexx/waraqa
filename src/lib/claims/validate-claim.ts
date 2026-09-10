import { STABLE_KEY_RE } from '@/lib/guide/types'
import {
  CLAIM_EVIDENCE_RELATIONS,
  CLAIM_KINDS,
  CLAIM_PUBLICATION_PERMISSIONS,
  CLAIM_SCOPE_KINDS,
  CLAIM_STATUSES,
  type ClaimEvidenceInput,
  type ClaimEvidenceRelation,
  type ClaimKind,
  type ClaimPublicationPermission,
  type ClaimScopeKind,
  type ClaimStatus,
  type ClaimValidationInput,
} from '@/lib/claims/types'

function asRows(value: unknown): ClaimEvidenceInput[] {
  return Array.isArray(value) ? (value as ClaimEvidenceInput[]) : []
}

function loc(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec.ar === 'string' && rec.ar.trim()) return rec.ar.trim()
    for (const v of Object.values(rec)) {
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return ''
}

function relationId(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return null
}

function pushUnique(errors: string[], msg: string) {
  if (!errors.includes(msg)) errors.push(msg)
}

function isIsoDateLike(value: unknown): boolean {
  if (value == null || value === '') return false
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string') return false
  const t = Date.parse(value)
  return !Number.isNaN(t)
}

function toTime(value: unknown): number | null {
  if (!isIsoDateLike(value)) return null
  if (value instanceof Date) return value.getTime()
  return Date.parse(String(value))
}

/**
 * Pure Claim schema/business validation (P0-05A).
 * Does not enforce public publication or Decision Engine binding.
 */
export function validateClaimData(data: ClaimValidationInput): string[] {
  const errors: string[] = []

  if (typeof data.key !== 'string' || !STABLE_KEY_RE.test(data.key)) {
    pushUnique(errors, 'مفتاح الادعاء غير صالح.')
  }

  if (!loc(data.statement)) {
    pushUnique(errors, 'نص الادعاء مطلوب.')
  }

  const status = data.status as ClaimStatus | undefined
  if (!(CLAIM_STATUSES as readonly string[]).includes(String(status))) {
    pushUnique(errors, 'حالة الادعاء غير صالحة.')
  }

  const pub = data.publicationPermission as ClaimPublicationPermission | undefined
  if (!(CLAIM_PUBLICATION_PERMISSIONS as readonly string[]).includes(String(pub))) {
    pushUnique(errors, 'صلاحية النشر غير صالحة.')
  }

  if (data.kind != null && data.kind !== '') {
    if (!(CLAIM_KINDS as readonly string[]).includes(String(data.kind))) {
      pushUnique(errors, 'تصنيف الادعاء غير صالح.')
    } else {
      void (data.kind as ClaimKind)
    }
  }

  if (data.scopeKind != null && data.scopeKind !== '') {
    if (!(CLAIM_SCOPE_KINDS as readonly string[]).includes(String(data.scopeKind))) {
      pushUnique(errors, 'نوع نطاق الادعاء غير صالح.')
    } else {
      void (data.scopeKind as ClaimScopeKind)
    }
  }

  if (data.scopeKey != null && data.scopeKey !== '') {
    if (typeof data.scopeKey !== 'string' || !STABLE_KEY_RE.test(data.scopeKey)) {
      pushUnique(errors, 'مفتاح النطاق غير صالح.')
    }
  }

  const evidence = asRows(data.evidence)
  const seenSources = new Set<string>()
  const relationTypes = new Set<ClaimEvidenceRelation>()

  for (const row of evidence) {
    const sourceId = relationId(row.source)
    if (!sourceId) {
      pushUnique(errors, 'كل دليل يجب أن يشير إلى مصدر.')
      continue
    }
    if (seenSources.has(sourceId)) {
      pushUnique(errors, `المصدر مكرر في الأدلة («${sourceId}»).`)
    }
    seenSources.add(sourceId)

    const rel = row.relationType as ClaimEvidenceRelation | undefined
    if (!(CLAIM_EVIDENCE_RELATIONS as readonly string[]).includes(String(rel))) {
      pushUnique(errors, 'نوع علاقة الدليل غير صالح.')
    } else {
      relationTypes.add(rel as ClaimEvidenceRelation)
    }

    if (row.checkedAt != null && row.checkedAt !== '' && !isIsoDateLike(row.checkedAt)) {
      pushUnique(errors, 'تاريخ فحص الدليل غير صالح.')
    }
  }

  const validFrom = toTime(data.validFrom)
  const validUntil = toTime(data.validUntil)
  if (data.validFrom != null && data.validFrom !== '' && validFrom == null) {
    pushUnique(errors, 'تاريخ بداية الصلاحية غير صالح.')
  }
  if (data.validUntil != null && data.validUntil !== '' && validUntil == null) {
    pushUnique(errors, 'تاريخ نهاية الصلاحية غير صالح.')
  }
  if (validFrom != null && validUntil != null && validUntil < validFrom) {
    pushUnique(errors, 'تاريخ نهاية الصلاحية قبل بدايتها.')
  }
  if (data.reviewDueAt != null && data.reviewDueAt !== '' && !isIsoDateLike(data.reviewDueAt)) {
    pushUnique(errors, 'موعد المراجعة غير صالح.')
  }
  if (data.verifiedAt != null && data.verifiedAt !== '' && !isIsoDateLike(data.verifiedAt)) {
    pushUnique(errors, 'تاريخ التوثيق غير صالح.')
  }

  // Status-specific rules — UNKNOWN must not require fabricated evidence/values.
  if (status === 'VERIFIED') {
    if (!relationId(data.reviewedBy)) {
      pushUnique(errors, 'الادعاء الموثّق يتطلب مراجعاً.')
    }
    if (!isIsoDateLike(data.verifiedAt)) {
      pushUnique(errors, 'الادعاء الموثّق يتطلب تاريخ توثيق.')
    }
    if (!relationTypes.has('SUPPORTS') && !relationTypes.has('PARTIALLY_SUPPORTS')) {
      pushUnique(errors, 'الادعاء الموثّق يتطلب دليلاً داعماً واحداً على الأقل.')
    }
  }

  if (status === 'CONFLICTED') {
    if (!relationTypes.has('SUPPORTS') && !relationTypes.has('PARTIALLY_SUPPORTS')) {
      pushUnique(errors, 'الادعاء المتعارض يتطلب مصدراً داعماً.')
    }
    if (!relationTypes.has('CONTRADICTS')) {
      pushUnique(errors, 'الادعاء المتعارض يتطلب مصدراً مناقضاً.')
    }
  }

  // UNKNOWN / DRAFT / etc.: evidence optional; do not invent placeholder values.
  return errors
}

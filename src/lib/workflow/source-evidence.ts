import type { CoveredSection } from './types'

type Localized = string | Record<string, string | null | undefined> | null | undefined

function localizedValue(value: Localized): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  for (const v of Object.values(value)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function relationId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return id != null ? String(id) : null
  }
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  return null
}

export type SourceDocLike = {
  id?: number | string
  active?: boolean | null
  verificationStatus?: string | null
  officialUrl?: string | null
  sourceType?: string | null
}

export type TxSourceRow = {
  source?: number | string | SourceDocLike | null
  primary?: boolean | null
  coveredSections?: CoveredSection[] | string[] | null
}

export type EvidenceInput = {
  sources?: TxSourceRow[] | null
  steps?: unknown[] | null
  fees?: Array<{ amount?: number | null; amountText?: Localized }> | null
  requiredDocuments?: unknown[] | null
  eligibility?: Localized
  serviceCenters?: unknown
  estimatedDuration?: { minimum?: number | null; maximum?: number | null } | null
  outcome?: Localized
  summary?: Localized
}

/**
 * Approve/publish evidence gates. Caller must pass populated source docs when possible.
 */
export function validateSourceEvidence(
  data: EvidenceInput,
  resolvedSources: Map<string, SourceDocLike>,
): string[] {
  const errors: string[] = []
  const rows = data.sources ?? []

  if (!rows.length) {
    errors.push('يجب إضافة مصدر واحد على الأقل.')
    return errors
  }

  const ids = rows.map((r) => relationId(r.source)).filter(Boolean) as string[]
  if (new Set(ids).size !== ids.length) {
    errors.push('لا يجوز تكرار نفس المصدر أكثر من مرة.')
  }

  if (!rows.some((r) => r.primary)) {
    errors.push('يجب تعليم مصدر واحد على الأقل كمصدر أساسي.')
  }

  const covered = new Set<string>()
  for (const row of rows) {
    const id = relationId(row.source)
    if (!id) {
      errors.push('مرجع مصدر مفقود.')
      continue
    }
    const src = resolvedSources.get(id)
    if (!src) {
      errors.push(`المصدر ${id} غير موجود.`)
      continue
    }
    if (src.active === false) {
      errors.push(`المصدر ${id} غير نشط.`)
    }
    const status = src.verificationStatus ?? 'needs_review'
    if (status !== 'verified') {
      errors.push(`المصدر ${id} غير موثّق (الحالة: ${status}).`)
    }
    if (status === 'outdated' || status === 'unavailable') {
      errors.push(`المصدر ${id} غير صالح للنشر (${status}).`)
    }
    const url = typeof src.officialUrl === 'string' ? src.officialUrl : ''
    if (!/^https?:\/\//i.test(url)) {
      errors.push(`المصدر ${id} يحتاج رابطاً رسمياً HTTP/HTTPS صالحاً.`)
    }
    for (const section of row.coveredSections ?? []) {
      covered.add(String(section))
    }
  }

  const needs: Array<{ key: CoveredSection; present: boolean; label: string }> = [
    { key: 'summary', present: Boolean(localizedValue(data.summary)), label: 'الملخص' },
    {
      key: 'eligibility',
      present: Boolean(localizedValue(data.eligibility)),
      label: 'الأهلية',
    },
    {
      key: 'required_documents',
      present: Boolean(data.requiredDocuments?.length),
      label: 'الوثائق المطلوبة',
    },
    { key: 'steps', present: Boolean(data.steps?.length), label: 'الخطوات' },
    { key: 'fees', present: Boolean(data.fees?.length), label: 'الرسوم' },
    {
      key: 'duration',
      present: Boolean(
        data.estimatedDuration &&
          (data.estimatedDuration.minimum != null || data.estimatedDuration.maximum != null),
      ),
      label: 'المدة',
    },
    {
      key: 'service_centers',
      present: Array.isArray(data.serviceCenters)
        ? data.serviceCenters.length > 0
        : Boolean(data.serviceCenters),
      label: 'مراكز الخدمة',
    },
    { key: 'outcome', present: Boolean(localizedValue(data.outcome)), label: 'النتيجة' },
  ]

  for (const n of needs) {
    if (n.present && !covered.has(n.key)) {
      errors.push(`القسم «${n.label}» يحتاج تغطية مصدرية (${n.key}).`)
    }
  }

  if (data.steps?.length && !covered.has('steps')) {
    errors.push('الخطوات تتطلب تغطية مصدرية.')
  }
  if (data.requiredDocuments?.length && !covered.has('required_documents')) {
    errors.push('الوثائق المطلوبة تتطلب تغطية مصدرية.')
  }
  if (data.fees?.length && !covered.has('fees')) {
    errors.push('الرسوم تتطلب تغطية مصدرية.')
  }

  return [...new Set(errors)]
}

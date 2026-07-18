import type { CollectionBeforeValidateHook } from 'payload'

type Localized = string | Record<string, string | null | undefined> | null | undefined

function localizedValue(value: Localized, locale = 'ar'): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  const direct = value[locale]
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  // fallback any non-empty
  for (const v of Object.values(value)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function relationId(
  value: number | string | { id?: number | string } | null | undefined,
): string | null {
  if (value == null) return null
  if (typeof value === 'object') return value.id != null ? String(value.id) : null
  return String(value)
}

type FeeRow = {
  label?: Localized
  amount?: number | null
  amountText?: Localized
}

type DocRow = {
  document?: number | string | { id?: number | string } | null
  requirementType?: string | null
  condition?: Localized
}

type SourceRow = {
  source?: number | string | { id?: number | string } | null
}

type Duration = {
  minimum?: number | null
  maximum?: number | null
}

type ProcedureData = {
  _status?: string | null
  title?: Localized
  summary?: Localized
  category?: unknown
  agency?: unknown
  steps?: Array<unknown> | null
  sources?: SourceRow[] | null
  requiredDocuments?: DocRow[] | null
  fees?: FeeRow[] | null
  estimatedDuration?: Duration | null
  lastReviewedAt?: string | null
  prerequisiteProcedures?: unknown
}

export function validateProcedureData(data: ProcedureData, opts?: { publishing?: boolean }) {
  const publishing = opts?.publishing ?? data._status === 'published'
  const errors: string[] = []

  // Duplicate documents
  const docIds = (data.requiredDocuments ?? [])
    .map((row) => relationId(row.document))
    .filter(Boolean) as string[]
  if (new Set(docIds).size !== docIds.length) {
    errors.push('لا يجوز تكرار نفس الوثيقة أكثر من مرة في المعاملة.')
  }

  // Duplicate sources
  const sourceIds = (data.sources ?? [])
    .map((row) => relationId(row.source))
    .filter(Boolean) as string[]
  if (new Set(sourceIds).size !== sourceIds.length) {
    errors.push('لا يجوز تكرار نفس المصدر أكثر من مرة في المعاملة.')
  }

  // Conditional documents need condition text
  for (const row of data.requiredDocuments ?? []) {
    if (row.requirementType === 'conditional' && !localizedValue(row.condition)) {
      errors.push('الوثائق المشروطة تتطلب نص الشرط.')
    }
  }

  // Fees: amount or amountText
  for (const fee of data.fees ?? []) {
    const hasAmount = typeof fee.amount === 'number' && !Number.isNaN(fee.amount)
    const hasText = Boolean(localizedValue(fee.amountText))
    if (!hasAmount && !hasText) {
      errors.push('كل رسم يحتاج مبلغاً رقمياً أو نص مبلغ.')
    }
  }

  // Duration max >= min
  const dur = data.estimatedDuration
  if (
    dur &&
    typeof dur.minimum === 'number' &&
    typeof dur.maximum === 'number' &&
    dur.maximum < dur.minimum
  ) {
    errors.push('الحد الأقصى للمدة يجب أن يكون أكبر من أو يساوي الحد الأدنى.')
  }

  if (publishing) {
    if (!localizedValue(data.title, 'ar')) {
      errors.push('لنشر المعاملة يجب توفير العنوان بالعربية.')
    }
    if (!relationId(data.category as never)) {
      errors.push('لنشر المعاملة يجب اختيار تصنيف.')
    }
    if (!relationId(data.agency as never)) {
      errors.push('لنشر المعاملة يجب اختيار جهة.')
    }
    if (!localizedValue(data.summary, 'ar')) {
      errors.push('لنشر المعاملة يجب توفير ملخص بالعربية.')
    }
    if (!data.steps?.length) {
      errors.push('لنشر المعاملة يجب إضافة خطوة واحدة على الأقل.')
    }
    if (!data.sources?.length) {
      errors.push('لنشر المعاملة يجب إضافة مصدر واحد على الأقل.')
    }
    if (!data.lastReviewedAt) {
      errors.push('لنشر المعاملة يجب تحديد تاريخ آخر مراجعة.')
    }
  }

  return errors
}

export const validateProcedure: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  const errors = validateProcedureData(data as ProcedureData)
  if (errors.length) {
    throw new Error(errors.join(' '))
  }
  return data
}

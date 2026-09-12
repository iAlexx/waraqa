/** Arabic labels for public transaction enums (no raw enum values in UI). */

export const AUDIENCE_LABELS_AR: Record<string, string> = {
  citizen: 'مواطن',
  resident: 'مقيم',
  student: 'طالب',
  employee: 'موظف',
  business: 'أعمال',
  visitor: 'زائر',
  other: 'أخرى',
}

export const REQUIREMENT_TYPE_LABELS_AR: Record<string, string> = {
  required: 'إلزامي',
  conditional: 'مشروط',
  alternative: 'بديل',
}

export const CURRENCY_LABELS_AR: Record<string, string> = {
  SYP: 'ل.س',
  USD: 'USD',
  EUR: 'EUR',
  other: 'أخرى',
}

export const DURATION_UNIT_LABELS_AR: Record<string, string> = {
  minutes: 'دقيقة',
  hours: 'ساعة',
  business_days: 'يوم عمل',
  calendar_days: 'يوم تقويمي',
  weeks: 'أسبوع',
}

export function labelAudience(value: string): string {
  return AUDIENCE_LABELS_AR[value] ?? value
}

export function labelRequirementType(value: string): string {
  return REQUIREMENT_TYPE_LABELS_AR[value] ?? value
}

export function labelCurrency(value: string): string {
  return CURRENCY_LABELS_AR[value] ?? value
}

export function labelDurationUnit(value: string): string {
  return DURATION_UNIT_LABELS_AR[value] ?? value
}

export function formatEstimatedDuration(opts: {
  minimum?: number | null
  maximum?: number | null
  unit?: string | null
  note?: string | null
}): string | null {
  const unit = opts.unit ? labelDurationUnit(opts.unit) : ''
  const min = typeof opts.minimum === 'number' ? opts.minimum : null
  const max = typeof opts.maximum === 'number' ? opts.maximum : null
  let core = ''
  if (min != null && max != null) {
    core = min === max ? `${min} ${unit}`.trim() : `${min}–${max} ${unit}`.trim()
  } else if (min != null) {
    core = `من ${min} ${unit}`.trim()
  } else if (max != null) {
    core = `حتى ${max} ${unit}`.trim()
  }
  const note = opts.note?.trim() || ''
  if (!core && !note) return null
  if (core && note) return `${core} — ${note}`
  return core || note
}

export function formatPublicDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return null
  }
}

/** Arabic date+time for print/export labels (not a source verification date). */
export function formatPublicDateTime(iso: string | Date | null | undefined): string | null {
  if (iso == null) return null
  try {
    const d = iso instanceof Date ? iso : new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  } catch {
    return null
  }
}

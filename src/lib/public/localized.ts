/** Localized Payload string helpers for public UI. */

export type LocalizedLike = string | Record<string, string | null | undefined> | null | undefined

export function localizedString(value: LocalizedLike, locale = 'ar'): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  const preferred = value[locale]
  if (typeof preferred === 'string' && preferred.trim()) return preferred.trim()
  for (const v of Object.values(value)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

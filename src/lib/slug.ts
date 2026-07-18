/**
 * Canonical slug normalization for Waraqa content.
 * Supports Arabic Unicode letters; no random suffixes.
 */
export function normalizeSlug(input: string): string {
  const trimmed = input.trim().toLowerCase()
  const spaced = trimmed.replace(/[\s_]+/g, '-')
  // Keep Arabic letters, Latin alphanumerics, and hyphens
  const cleaned = spaced.replace(/[^\u0600-\u06FFa-z0-9-]+/g, '-')
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function isValidSlug(value: string): boolean {
  if (!value) return false
  if (value !== normalizeSlug(value)) return false
  if (value.length < 1 || value.length > 120) return false
  return /^[\u0600-\u06FFa-z0-9]+(?:-[\u0600-\u06FFa-z0-9]+)*$/.test(value)
}

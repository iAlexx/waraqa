/** HTTP(S) URL validation for official links. */
export function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function httpUrlMessage(label = 'الرابط'): string {
  return `${label} يجب أن يكون عنوان HTTP أو HTTPS صالحاً.`
}

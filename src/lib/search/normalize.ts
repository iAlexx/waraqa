/**
 * Deterministic Arabic-first search normalization for Syrian public content.
 * Does not mutate stored editorial titles — only query / searchText blobs.
 */

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL = /\u0640/g
const WHITESPACE = /\s+/g

/** Arabic-Indic ٠-٩ and Eastern Arabic-Indic ۰-۹ → Latin 0-9 */
const DIGIT_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

/**
 * Normalize text for matching. Safe for empty/null.
 * Preserves meaning while folding common Arabic orthographic variants.
 */
export function normalizeArabicSearchText(input: string | null | undefined): string {
  if (input == null) return ''
  let s = String(input)

  // NFKC then strip combining marks commonly used as Arabic diacritics
  s = s.normalize('NFKC')
  s = s.replace(ARABIC_DIACRITICS, '')
  s = s.replace(TATWEEL, '')

  // Alef forms → ا
  s = s.replace(/[أإآٱ]/g, 'ا')
  // Persian / Arabic yeh variants → ي
  s = s.replace(/[ىئ]/g, 'ي')
  // Persian kaf → ك
  s = s.replace(/ک/g, 'ك')
  // Teh marbuta → ه for looser matching (common Syrian typing)
  s = s.replace(/ة/g, 'ه')

  s = s.replace(/[٠-٩۰-۹]/g, (ch) => DIGIT_MAP[ch] ?? ch)

  // Latin case fold
  s = s.toLowerCase()

  // Drop most punctuation; keep letters, digits, spaces
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')

  s = s.replace(WHITESPACE, ' ').trim()
  return s
}

/** Collapse for display comparison helpers — same as normalize. */
export function normalizeArabicQuery(input: string | null | undefined): string {
  return normalizeArabicSearchText(input)
}

/** Join multiple fields into one searchable blob (space-separated unique phrases). */
export function buildNormalizedSearchBlob(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const n = normalizeArabicSearchText(part)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out.join(' ')
}

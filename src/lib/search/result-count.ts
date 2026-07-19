/** Small deterministic Arabic result-count wording (not a full pluralization engine). */

export function formatSearchResultCount(total: number): string {
  const n = Math.max(0, Math.floor(total))
  if (n === 0) return 'ما في نتائج'
  if (n === 1) return 'نتيجة واحدة'
  if (n === 2) return 'نتيجتان'
  if (n >= 3 && n <= 10) return `${n} نتائج`
  return `${n} نتيجة`
}

/**
 * P9-A — in-memory document checklist helpers (no persistence).
 * Checked state is keyed by stable document `key` from the Decision Engine result.
 */

export const CHECKLIST_SAFETY_COPY_AR =
  'التحديد هون بس لمساعدتك بالتحضير، وما بيعني إن الجهة الرسمية قبلت الأوراق.'

export const CHECKLIST_CLEAR_ALL_LABEL_AR = 'إلغاء تحديد الكل'

/** Drop checked keys that are no longer in the active document result set. */
export function pruneCheckedDocumentKeys(
  checkedKeys: Iterable<string>,
  activeDocumentKeys: Iterable<string>,
): Set<string> {
  const active = new Set(
    [...activeDocumentKeys].filter((k) => typeof k === 'string' && k.length > 0),
  )
  const next = new Set<string>()
  for (const key of checkedKeys) {
    if (typeof key === 'string' && active.has(key)) next.add(key)
  }
  return next
}

export function toggleCheckedDocumentKey(
  checkedKeys: ReadonlySet<string>,
  key: string,
  checked: boolean,
): Set<string> {
  const next = new Set(checkedKeys)
  if (checked) next.add(key)
  else next.delete(key)
  return next
}

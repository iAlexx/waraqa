/**
 * Deduplicate ranked search candidates by stable document id.
 * Keeps the first (highest-ranked) occurrence. Does not merge different docs that share a title.
 */
export function dedupeRankedByDocumentId<T extends { id: string | number }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const key = String(item.id)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

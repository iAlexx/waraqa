import { describe, expect, it } from 'vitest'

import {
  pruneCheckedDocumentKeys,
  toggleCheckedDocumentKey,
} from '@/lib/guide/checklist-state'

describe('P9-A checklist-state helpers', () => {
  it('G: prunes checked keys that disappear from the result', () => {
    const pruned = pruneCheckedDocumentKeys(['doc_id', 'doc_guardian', 'doc_gone'], [
      'doc_id',
      'doc_guardian',
    ])
    expect([...pruned].sort()).toEqual(['doc_guardian', 'doc_id'])
  })

  it('H: retains still-relevant checked keys', () => {
    const pruned = pruneCheckedDocumentKeys(new Set(['doc_id']), ['doc_id', 'doc_form'])
    expect(pruned.has('doc_id')).toBe(true)
    expect(pruned.has('doc_form')).toBe(false)
  })

  it('I: does not invent checks for new keys', () => {
    const pruned = pruneCheckedDocumentKeys(['doc_id'], ['doc_id', 'doc_new'])
    expect(pruned.has('doc_new')).toBe(false)
    expect(pruned.size).toBe(1)
  })

  it('toggleCheckedDocumentKey checks and unchecks by stable key', () => {
    const checked = toggleCheckedDocumentKey(new Set(), 'doc_id', true)
    expect(checked.has('doc_id')).toBe(true)
    const unchecked = toggleCheckedDocumentKey(checked, 'doc_id', false)
    expect(unchecked.has('doc_id')).toBe(false)
  })
})

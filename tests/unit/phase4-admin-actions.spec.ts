import { describe, expect, it } from 'vitest'

import {
  actorDisplayLabel,
  entityTypeLabelAr,
  getVisibleWorkflowActions,
  parseCoverageAlertLines,
  publicationStatusLabelAr,
  workflowStateLabelAr,
} from '@/lib/workflow/admin-actions'
import { resolvePublicationStatusCellLabel } from '@/components/admin/PublicationStatusCell'

describe('getVisibleWorkflowActions', () => {
  it('researcher draft sees only submit', () => {
    const actions = getVisibleWorkflowActions({ role: 'researcher', workflowState: 'draft' })
    expect(actions.map((a) => a.action)).toEqual(['submitForReview'])
    expect(actions[0]?.tier).toBe('primary')
  })

  it('researcher changes_requested sees only resubmit', () => {
    const actions = getVisibleWorkflowActions({
      role: 'researcher',
      workflowState: 'changes_requested',
    })
    expect(actions.map((a) => a.action)).toEqual(['resubmitForReview'])
  })

  it('researcher sees no mutation actions in review/approved/published/archived', () => {
    for (const state of ['in_review', 'approved', 'published', 'archived'] as const) {
      expect(getVisibleWorkflowActions({ role: 'researcher', workflowState: state })).toEqual([])
    }
  })

  it('reviewer in_review sees approve + requestChanges only (no archive)', () => {
    const actions = getVisibleWorkflowActions({ role: 'reviewer', workflowState: 'in_review' })
    expect(actions.map((a) => a.action).sort()).toEqual(['approve', 'requestChanges'].sort())
    expect(actions.find((a) => a.action === 'approve')?.tier).toBe('primary')
    expect(actions.find((a) => a.action === 'requestChanges')?.tier).toBe('secondary')
  })

  it('reviewer approved sees publish', () => {
    const actions = getVisibleWorkflowActions({ role: 'reviewer', workflowState: 'approved' })
    expect(actions.map((a) => a.action)).toEqual(['publish'])
  })

  it('reviewer published sees unpublish and markOutdated when not outdated', () => {
    const actions = getVisibleWorkflowActions({
      role: 'reviewer',
      workflowState: 'published',
      markedOutdated: false,
    })
    expect(actions.map((a) => a.action).sort()).toEqual(['markOutdated', 'unpublish'].sort())
    expect(actions.find((a) => a.action === 'markOutdated')?.tier).toBe('overflow')
  })

  it('reviewer published hides markOutdated when already outdated', () => {
    const actions = getVisibleWorkflowActions({
      role: 'reviewer',
      workflowState: 'published',
      markedOutdated: true,
    })
    expect(actions.map((a) => a.action)).toEqual(['unpublish'])
  })

  it('reviewer archived does not see restore (admin-only)', () => {
    expect(getVisibleWorkflowActions({ role: 'reviewer', workflowState: 'archived' })).toEqual([])
  })

  it('admin archived sees restore; admin draft does not see impossible publish', () => {
    const archived = getVisibleWorkflowActions({ role: 'admin', workflowState: 'archived' })
    expect(archived.map((a) => a.action)).toEqual(['restoreArchived'])
    const draft = getVisibleWorkflowActions({ role: 'admin', workflowState: 'draft' })
    expect(draft.map((a) => a.action).sort()).toEqual(['archive', 'submitForReview'].sort())
    expect(draft.find((a) => a.action === 'publish')).toBeUndefined()
  })

  it('admin published sees unpublish, archive, markOutdated', () => {
    const actions = getVisibleWorkflowActions({
      role: 'admin',
      workflowState: 'published',
      markedOutdated: false,
    })
    expect(actions.map((a) => a.action).sort()).toEqual(
      ['archive', 'markOutdated', 'unpublish'].sort(),
    )
  })
})

describe('labels', () => {
  it('workflow and publication Arabic labels', () => {
    expect(workflowStateLabelAr('changes_requested')).toBe('تعديلات مطلوبة')
    expect(publicationStatusLabelAr({ status: 'published' })).toBe('منشورة')
    expect(publicationStatusLabelAr({ status: 'draft', hasPublishedVersion: true })).toBe(
      'مسودة مع نسخة منشورة',
    )
    expect(entityTypeLabelAr('transactions')).toBe('المعاملات')
  })

  it('actor prefers display name then email', () => {
    expect(actorDisplayLabel({ displayName: 'مراجع', email: 'a@b.test' })).toBe('مراجع')
    expect(actorDisplayLabel({ name: '', email: 'a@b.test' })).toBe('a@b.test')
  })

  it('parseCoverageAlertLines extracts section lines', () => {
    const lines = parseCoverageAlertLines(
      'القسم «الخطوات» يحتاج تغطية مصدرية (steps). القسم «الرسوم» يحتاج تغطية مصدرية (fees).',
    )
    expect(lines).toContain('الخطوات تحتاج تغطية مصدرية')
    expect(lines).toContain('الرسوم تحتاج تغطية مصدرية')
  })
})

describe('resolvePublicationStatusCellLabel', () => {
  it('passes through Arabic labels from afterRead (does not collapse to —)', () => {
    expect(resolvePublicationStatusCellLabel('مسودة')).toBe('مسودة')
    expect(resolvePublicationStatusCellLabel('منشورة')).toBe('منشورة')
    expect(resolvePublicationStatusCellLabel('مسودة مع نسخة منشورة')).toBe('مسودة مع نسخة منشورة')
  })

  it('derives from _status + publishedAt on the row (not workflowState)', () => {
    expect(
      resolvePublicationStatusCellLabel(undefined, { _status: 'published', workflowState: 'draft' }),
    ).toBe('منشورة')
    expect(
      resolvePublicationStatusCellLabel(undefined, {
        _status: 'draft',
        publishedAt: null,
        workflowState: 'published',
      }),
    ).toBe('مسودة')
    expect(
      resolvePublicationStatusCellLabel(undefined, {
        _status: 'draft',
        publishedAt: '2026-07-19T00:00:00.000Z',
        workflowState: 'approved',
      }),
    ).toBe('مسودة مع نسخة منشورة')
  })
})

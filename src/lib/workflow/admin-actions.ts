import type { WaraqaRole } from '@/access/roles'
import type { WorkflowAction, WorkflowState } from './types'
import { TRANSITION_MATRIX } from './types'

export type ActionTier = 'primary' | 'secondary' | 'overflow'

export type AdminWorkflowActionDef = {
  action: WorkflowAction
  label: string
  tier: ActionTier
  needsComment?: boolean
  needsReason?: boolean
  needsConfirm?: boolean
}

const LABELS: Partial<Record<WorkflowAction, string>> = {
  submitForReview: 'إرسال للمراجعة',
  resubmitForReview: 'إعادة الإرسال',
  requestChanges: 'طلب تعديلات',
  approve: 'اعتماد',
  publish: 'نشر',
  unpublish: 'إلغاء النشر',
  archive: 'أرشفة',
  restoreArchived: 'استعادة من الأرشيف',
  markOutdated: 'وسم كقديم',
}

const CONFIRM_ACTIONS = new Set<WorkflowAction>([
  'publish',
  'unpublish',
  'archive',
  'restoreArchived',
  'markOutdated',
])

/** Roles allowed to invoke each action (mirrors server workflow service). */
const ACTION_ROLES: Partial<Record<WorkflowAction, WaraqaRole[]>> = {
  submitForReview: ['admin', 'reviewer', 'researcher'],
  resubmitForReview: ['admin', 'reviewer', 'researcher'],
  requestChanges: ['admin', 'reviewer'],
  approve: ['admin', 'reviewer'],
  publish: ['admin', 'reviewer'],
  unpublish: ['admin', 'reviewer'],
  archive: ['admin'],
  restoreArchived: ['admin'],
  markOutdated: ['admin', 'reviewer'],
}

const PRIMARY_BY_STATE: Partial<Record<WorkflowState, WorkflowAction>> = {
  draft: 'submitForReview',
  changes_requested: 'resubmitForReview',
  in_review: 'approve',
  approved: 'publish',
}

const SECONDARY = new Set<WorkflowAction>(['requestChanges', 'unpublish'])

const OVERFLOW = new Set<WorkflowAction>(['archive', 'restoreArchived', 'markOutdated'])

export type VisibleActionsInput = {
  role: WaraqaRole | null | undefined
  workflowState: WorkflowState | string | null | undefined
  markedOutdated?: boolean | null
}

function asState(value: unknown): WorkflowState | null {
  if (
    value === 'draft' ||
    value === 'in_review' ||
    value === 'changes_requested' ||
    value === 'approved' ||
    value === 'published' ||
    value === 'archived'
  ) {
    return value
  }
  return null
}

/**
 * Returns only valid, role-allowed workflow actions for Admin UI rendering.
 * Server authorization remains authoritative.
 */
export function getVisibleWorkflowActions(input: VisibleActionsInput): AdminWorkflowActionDef[] {
  const role = input.role
  const state = asState(input.workflowState)
  if (!role || !state) return []

  // Researcher: no mutation chrome while waiting / after approval / published / archived
  if (role === 'researcher') {
    if (state === 'draft') {
      return [
        {
          action: 'submitForReview',
          label: LABELS.submitForReview!,
          tier: 'primary',
        },
      ]
    }
    if (state === 'changes_requested') {
      return [
        {
          action: 'resubmitForReview',
          label: LABELS.resubmitForReview!,
          tier: 'primary',
        },
      ]
    }
    return []
  }

  if (role === 'viewer') return []

  const allowedFromState = TRANSITION_MATRIX[state] ?? {}
  const out: AdminWorkflowActionDef[] = []

  for (const action of Object.keys(allowedFromState) as WorkflowAction[]) {
    const roles = ACTION_ROLES[action]
    if (!roles?.includes(role)) continue

    if (action === 'markOutdated' && input.markedOutdated === true) continue

    const label = LABELS[action]
    if (!label) continue

    let tier: ActionTier = 'secondary'
    if (OVERFLOW.has(action)) tier = 'overflow'
    else if (PRIMARY_BY_STATE[state] === action) tier = 'primary'
    else if (SECONDARY.has(action)) tier = 'secondary'
    else if (action === 'restoreArchived') tier = 'overflow'
    else tier = 'primary'

    // Reviewer archived: only restore when valid — restore is admin-only, so skip for reviewer
    if (role === 'reviewer' && action === 'restoreArchived') continue

    out.push({
      action,
      label,
      tier,
      needsComment: action === 'requestChanges',
      needsReason: action === 'archive',
      needsConfirm: CONFIRM_ACTIONS.has(action),
    })
  }

  // Stable order: primary, secondary, overflow
  const rank = { primary: 0, secondary: 1, overflow: 2 }
  return out.sort((a, b) => rank[a.tier] - rank[b.tier] || a.label.localeCompare(b.label, 'ar'))
}

export function workflowStateLabelAr(state: unknown): string {
  switch (state) {
    case 'draft':
      return 'مسودة'
    case 'in_review':
      return 'قيد المراجعة'
    case 'changes_requested':
      return 'تعديلات مطلوبة'
    case 'approved':
      return 'معتمدة'
    case 'published':
      return 'منشورة'
    case 'archived':
      return 'مؤرشفة'
    default:
      return '—'
  }
}

export function publicationStatusLabelAr(opts: {
  status?: unknown
  hasPublishedVersion?: boolean | null
}): string {
  if (opts.status === 'published') return 'منشورة'
  if (opts.status === 'draft' && opts.hasPublishedVersion) return 'مسودة مع نسخة منشورة'
  if (opts.status === 'draft') return 'مسودة'
  return '—'
}

export function entityTypeLabelAr(value: unknown): string {
  const v = String(value ?? '')
  if (v === 'transactions') return 'المعاملات'
  if (v === 'categories') return 'التصنيفات'
  if (v === 'agencies') return 'الجهات'
  if (v === 'sources') return 'المصادر'
  if (v === 'documents') return 'الوثائق'
  if (v === 'users') return 'المستخدمون'
  return v || '—'
}

export function actorDisplayLabel(user: {
  displayName?: string | null
  name?: string | null
  email?: string | null
  id?: number | string
} | null | undefined): string {
  if (!user) return '—'
  const display = (user.displayName || user.name || '').trim()
  if (display) return display
  if (user.email) return user.email
  if (user.id != null) return `مستخدم ${user.id}`
  return '—'
}

/** Map evidence/API error blobs into short Arabic coverage lines for Admin UI. */
export function parseCoverageAlertLines(message: string): string[] {
  const lines: string[] = []
  const pairs: Array<[RegExp, string]> = [
    [/الخطوات|steps/i, 'الخطوات تحتاج تغطية مصدرية'],
    [/الوثائق المطلوبة|required_documents/i, 'الوثائق المطلوبة تحتاج تغطية مصدرية'],
    [/الرسوم|fees/i, 'الرسوم تحتاج تغطية مصدرية'],
    [/الملخص|summary/i, 'الملخص يحتاج تغطية مصدرية'],
    [/الأهلية|eligibility/i, 'الأهلية تحتاج تغطية مصدرية'],
    [/غير موثّق|needs_review|unverified/i, 'يوجد مصدر غير موثّق'],
  ]
  for (const [re, line] of pairs) {
    if (re.test(message) && !lines.includes(line)) lines.push(line)
  }
  if (!lines.length && message.trim()) {
    // Prefer first sentence without dumping full JSON
    const cleaned = message.replace(/^\[?\{.*"message"\s*:\s*"/i, '').replace(/"\}].*$/i, '')
    lines.push(cleaned.slice(0, 220))
  }
  return lines
}

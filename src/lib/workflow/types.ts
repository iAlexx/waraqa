import { APIError } from 'payload'

export type WorkflowState =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'archived'

export type WorkflowAction =
  | 'submitForReview'
  | 'requestChanges'
  | 'resubmitForReview'
  | 'approve'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restoreArchived'
  | 'restoreRevision'
  | 'overrideReviewDue'
  | 'markOutdated'

export const WORKFLOW_STATES: WorkflowState[] = [
  'draft',
  'in_review',
  'changes_requested',
  'approved',
  'published',
  'archived',
]

export const COVERED_SECTIONS = [
  'summary',
  'eligibility',
  'required_documents',
  'steps',
  'fees',
  'duration',
  'service_centers',
  'outcome',
  'other',
] as const

export type CoveredSection = (typeof COVERED_SECTIONS)[number]

export type VerificationHealth = 'unverified' | 'current' | 'review_due' | 'outdated'

export class WorkflowError extends APIError {
  constructor(message: string, status: 401 | 403 | 409 | 422) {
    super(message, status)
  }
}

/** Transition matrix: fromState → allowed actions (role checks separate). */
export const TRANSITION_MATRIX: Record<
  WorkflowState,
  Partial<Record<WorkflowAction, WorkflowState>>
> = {
  draft: {
    submitForReview: 'in_review',
    archive: 'archived',
  },
  in_review: {
    requestChanges: 'changes_requested',
    approve: 'approved',
    archive: 'archived',
  },
  changes_requested: {
    resubmitForReview: 'in_review',
    archive: 'archived',
  },
  approved: {
    publish: 'published',
    archive: 'archived',
  },
  published: {
    unpublish: 'approved',
    archive: 'archived',
    markOutdated: 'published',
  },
  archived: {
    restoreArchived: 'draft',
  },
}

export function assertTransition(
  from: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  const next = TRANSITION_MATRIX[from]?.[action]
  if (!next) {
    throw new WorkflowError(
      `انتقال غير مسموح: لا يمكن تنفيذ «${action}» من الحالة «${from}».`,
      409,
    )
  }
  return next
}

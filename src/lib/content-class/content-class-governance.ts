/**
 * Governance for contentClass promotion (P0-06).
 * Researchers cannot promote QA_TEST/DEMO → PRODUCTION.
 * Reviewer/admin (active) may change classification.
 */
import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { hasActiveRole, type UserLike } from '@/access/roles'
import {
  isContentClass,
  normalizeContentClass,
  type ContentClass,
} from '@/lib/content-class/types'
import { allowSeedBypass } from '@/lib/qa-seed-guard'

export type ContentClassGovernanceArgs = {
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown> | null
  user: UserLike
  operation: 'create' | 'update'
}

export type ContentClassGovernanceResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

function asClass(value: unknown): ContentClass | null {
  return isContentClass(value) ? value : null
}

/**
 * Apply content-class rules. Mutates a copy of data.
 * Default on create: QA_TEST.
 */
export function applyContentClassGovernance(
  args: ContentClassGovernanceArgs,
): ContentClassGovernanceResult {
  const next = { ...args.data }
  const original = args.originalDoc ?? null
  const prev = asClass(original?.contentClass)
  const rawNext = next.contentClass

  if (args.operation === 'create') {
    if (rawNext == null || rawNext === '') {
      next.contentClass = 'QA_TEST'
    } else if (!isContentClass(rawNext)) {
      return { ok: false, error: 'تصنيف المحتوى غير صالح.' }
    }
  } else if (rawNext !== undefined && rawNext !== null && rawNext !== '') {
    if (!isContentClass(rawNext)) {
      return { ok: false, error: 'تصنيف المحتوى غير صالح.' }
    }
  }

  const nextClass =
    asClass(next.contentClass) ??
    (args.operation === 'update' ? prev : ('QA_TEST' as ContentClass)) ??
    'QA_TEST'

  const classTouched =
    rawNext !== undefined && rawNext !== null && rawNext !== '' && rawNext !== prev

  if (hasActiveRole(args.user, 'researcher')) {
    if (args.operation === 'create') {
      if (nextClass === 'PRODUCTION') {
        return {
          ok: false,
          error: 'لا يمكن للباحث تعيين تصنيف إنتاج. يلزم مراجع أو مدير نشط.',
        }
      }
      next.contentClass = nextClass === 'DEMO' ? 'DEMO' : 'QA_TEST'
      return { ok: true, data: next }
    }

    // Updates: allow non-classification edits on any existing class (including PRODUCTION).
    // Block only explicit classification changes involving PRODUCTION, or promotion to it.
    if (!classTouched) {
      if (prev) next.contentClass = prev
      else next.contentClass = 'QA_TEST'
      return { ok: true, data: next }
    }

    if (nextClass === 'PRODUCTION' || prev === 'PRODUCTION') {
      return {
        ok: false,
        error:
          prev === 'PRODUCTION'
            ? 'لا يمكن للباحث تغيير تصنيف محتوى الإنتاج.'
            : 'لا يمكن للباحث تعيين تصنيف إنتاج. يلزم مراجع أو مدير نشط.',
      }
    }

    next.contentClass = nextClass === 'DEMO' ? 'DEMO' : 'QA_TEST'
    return { ok: true, data: next }
  }

  if (hasActiveRole(args.user, 'admin', 'reviewer')) {
    next.contentClass = nextClass
    return { ok: true, data: next }
  }

  // Inactive / unauthorized — fail closed on PRODUCTION or promotion.
  if (nextClass === 'PRODUCTION' || (prev && prev !== nextClass)) {
    return { ok: false, error: 'غير مصرح بتغيير تصنيف المحتوى.' }
  }
  next.contentClass = normalizeContentClass(nextClass)
  return { ok: true, data: next }
}

/**
 * beforeValidate: enforce contentClass rules.
 * Seed bypass still allows an explicit contentClass; defaults to QA_TEST on create if missing.
 */
export const enforceContentClassGovernance: CollectionBeforeValidateHook = ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (!data) return data

  const next = data as Record<string, unknown>

  if (allowSeedBypass(req)) {
    if (
      operation === 'create' &&
      (next.contentClass == null || next.contentClass === '')
    ) {
      next.contentClass = 'QA_TEST'
    }
    return data
  }

  const governed = applyContentClassGovernance({
    data: next,
    originalDoc: originalDoc as Record<string, unknown> | null | undefined,
    user: req.user as UserLike,
    operation: operation === 'create' ? 'create' : 'update',
  })

  if (!governed.ok) {
    throw new APIError(governed.error, 403)
  }

  Object.assign(data, governed.data)
  return data
}

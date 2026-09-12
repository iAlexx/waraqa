/**
 * P9-E — citizen-facing answer labels + prune answers that are no longer applicable.
 * Never expose raw question/option keys as UI fallback text.
 */

import { visibleQuestions } from '@/lib/guide/evaluate'
import type { GuideAnswers, GuideQuestion } from '@/lib/guide/types'

export const ANSWER_SUMMARY_HEADING_AR = 'إجاباتك'
export const EDIT_ANSWER_LABEL_AR = 'تعديل'

export type GuideAnswerSummaryRow = {
  questionKey: string
  prompt: string
  answerLabel: string
}

/**
 * Resolve a stored answer to human-readable Arabic labels.
 * Returns null when the value is missing/invalid (do not invent; do not leak keys).
 */
export function formatGuideAnswerLabel(
  question: GuideQuestion,
  answers: GuideAnswers,
): string | null {
  const val = answers[question.key]
  if (val == null || val === '') return null

  if (question.questionType === 'boolean') {
    if (val === 'yes') return 'نعم'
    if (val === 'no') return 'لا'
    return null
  }

  if (question.questionType === 'single') {
    if (typeof val !== 'string') return null
    return question.options.find((o) => o.key === val)?.label ?? null
  }

  if (question.questionType === 'multi') {
    if (!Array.isArray(val)) return null
    const labels = val
      .map((k) => question.options.find((o) => o.key === k)?.label)
      .filter((label): label is string => Boolean(label))
    return labels.length > 0 ? labels.join('، ') : null
  }

  return null
}

/**
 * Drop answers for questions that are inactive, unknown, or not currently visible
 * given the remaining answers (iterative fixed point).
 *
 * Why: Decision Engine rules evaluate conditions against the full answers map.
 * A stale answer on a hidden downstream question must not silently fire effects.
 */
export function pruneInapplicableAnswers(
  questions: GuideQuestion[],
  answers: GuideAnswers,
): GuideAnswers {
  const byKey = new Map(questions.map((q) => [q.key, q]))
  let current: GuideAnswers = {}

  // First pass: keep only values that are valid for the live question catalog.
  for (const [key, value] of Object.entries(answers)) {
    const question = byKey.get(key)
    if (!question || !question.active) continue

    if (question.questionType === 'boolean') {
      if (value === 'yes' || value === 'no') current[key] = value
      continue
    }
    if (question.questionType === 'single') {
      if (typeof value === 'string' && question.options.some((o) => o.key === value)) {
        current[key] = value
      }
      continue
    }
    if (question.questionType === 'multi') {
      if (!Array.isArray(value)) continue
      const allowed = new Set(question.options.map((o) => o.key))
      const cleaned = [...new Set(value.filter((v) => typeof v === 'string' && allowed.has(v)))]
      if (cleaned.length > 0) current[key] = cleaned
    }
  }

  // Iterate until only answers for currently visible questions remain.
  for (let guard = 0; guard < questions.length + 2; guard++) {
    const visibleKeys = new Set(visibleQuestions(questions, current).map((q) => q.key))
    let changed = false
    const next: GuideAnswers = {}
    for (const [key, value] of Object.entries(current)) {
      if (visibleKeys.has(key)) next[key] = value
      else changed = true
    }
    current = next
    if (!changed) break
  }

  return current
}

/** Visible answered questions with safe labels (skips unresolved values). */
export function buildGuideAnswerSummaryRows(
  questions: GuideQuestion[],
  answers: GuideAnswers,
): GuideAnswerSummaryRow[] {
  const pruned = pruneInapplicableAnswers(questions, answers)
  return visibleQuestions(questions, pruned)
    .map((q) => {
      const answerLabel = formatGuideAnswerLabel(q, pruned)
      if (!answerLabel) return null
      return {
        questionKey: q.key,
        prompt: q.prompt,
        answerLabel,
      }
    })
    .filter((row): row is GuideAnswerSummaryRow => row != null)
}

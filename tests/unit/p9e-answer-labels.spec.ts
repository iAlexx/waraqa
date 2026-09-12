import { describe, expect, it } from 'vitest'

import { evaluateConditionResult } from '@/lib/guide/evaluate'
import {
  buildGuideAnswerSummaryRows,
  formatGuideAnswerLabel,
  pruneInapplicableAnswers,
} from '@/lib/guide/answer-labels'
import type { GuideQuestion } from '@/lib/guide/types'

function q(partial: Partial<GuideQuestion> & Pick<GuideQuestion, 'key' | 'questionType' | 'prompt'>): GuideQuestion {
  return {
    helpText: null,
    required: true,
    active: true,
    options: [],
    visibleWhen: null,
    ...partial,
  }
}

describe('P9-E answer labels + prune', () => {
  it('formats boolean / single / multi without leaking keys', () => {
    const boolQ = q({ key: 'is_minor', questionType: 'boolean', prompt: 'هل قاصر؟' })
    const singleQ = q({
      key: 'doc_type',
      questionType: 'single',
      prompt: 'نوع الوثيقة',
      options: [
        { key: 'passport', label: 'جواز سفر' },
        { key: 'id_card', label: 'هوية' },
      ],
    })
    const multiQ = q({
      key: 'needs',
      questionType: 'multi',
      prompt: 'احتياجات',
      options: [
        { key: 'photo', label: 'صور' },
        { key: 'stamp', label: 'طابع' },
      ],
    })

    expect(formatGuideAnswerLabel(boolQ, { is_minor: 'no' })).toBe('لا')
    expect(formatGuideAnswerLabel(boolQ, { is_minor: 'yes' })).toBe('نعم')
    expect(formatGuideAnswerLabel(singleQ, { doc_type: 'passport' })).toBe('جواز سفر')
    expect(formatGuideAnswerLabel(multiQ, { needs: ['photo', 'stamp'] })).toBe('صور، طابع')
    expect(formatGuideAnswerLabel(singleQ, { doc_type: 'missing' })).toBeNull()
    expect(formatGuideAnswerLabel(boolQ, { is_minor: 'maybe' })).toBeNull()
  })

  it('summary rows use prompts/labels not raw keys', () => {
    const questions = [
      q({ key: 'is_minor', questionType: 'boolean', prompt: 'هل قاصر؟' }),
      q({
        key: 'doc_type',
        questionType: 'single',
        prompt: 'نوع الوثيقة',
        options: [{ key: 'passport', label: 'جواز سفر' }],
      }),
    ]
    const rows = buildGuideAnswerSummaryRows(questions, {
      is_minor: 'no',
      doc_type: 'passport',
    })
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.prompt)).toEqual(['هل قاصر؟', 'نوع الوثيقة'])
    expect(rows.map((r) => r.answerLabel)).toEqual(['لا', 'جواز سفر'])
    expect(rows.every((r) => !r.answerLabel.includes('_'))).toBe(true)
    expect(rows.map((r) => r.answerLabel).join(' ')).not.toContain('passport')
    expect(rows.map((r) => r.prompt).join(' ')).not.toContain('is_minor')
  })

  it('preserves explicit empty multi [] as answered-empty (not dropped)', () => {
    const questions: GuideQuestion[] = [
      q({
        key: 'needs',
        questionType: 'multi',
        required: false,
        prompt: 'احتياجات',
        options: [
          { key: 'photo', label: 'صور' },
          { key: 'stamp', label: 'طابع' },
        ],
      }),
    ]
    const pruned = pruneInapplicableAnswers(questions, { needs: [] })
    expect(pruned).toEqual({ needs: [] })
    expect(formatGuideAnswerLabel(questions[0]!, { needs: [] })).toBe('لا شيء محدد')
    const rows = buildGuideAnswerSummaryRows(questions, { needs: [] })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.answerLabel).toBe('لا شيء محدد')

    // Decision Engine: answered-empty must not become UNKNOWN for compare ops.
    expect(
      evaluateConditionResult(
        { questionKey: 'needs', operator: 'notEquals', value: 'photo' },
        pruned,
      ),
    ).toBe('MATCH')
    expect(
      evaluateConditionResult(
        { questionKey: 'needs', operator: 'equals', value: 'photo' },
        {},
      ),
    ).toBe('UNKNOWN')
  })

  it('prunes stale downstream answers when earlier answer hides them', () => {
    const questions: GuideQuestion[] = [
      q({ key: 'is_adult', questionType: 'boolean', prompt: 'بالغ؟' }),
      q({
        key: 'guardian',
        questionType: 'boolean',
        prompt: 'موافقة ولي؟',
        visibleWhen: {
          all: [{ questionKey: 'is_adult', operator: 'equals', value: 'no' }],
        },
      }),
    ]

    const pruned = pruneInapplicableAnswers(questions, {
      is_adult: 'yes',
      guardian: 'yes',
    })
    expect(pruned).toEqual({ is_adult: 'yes' })
    expect(pruned).not.toHaveProperty('guardian')
  })
})

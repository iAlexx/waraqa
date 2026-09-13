'use client'

import React from 'react'

import {
  classifyReviewDueAt,
  reviewDueBucketLabelAr,
  type ReviewDueBucket,
} from '@/lib/admin/editorial-dashboard'

type Props = {
  cellData?: unknown
}

function tone(bucket: ReviewDueBucket): { bg: string; color: string; border: string } {
  switch (bucket) {
    case 'overdue':
      return { bg: '#f8e8e8', color: '#5c1a1a', border: '#c45c5c' }
    case 'due_soon':
      return { bg: '#fff4df', color: '#5c4510', border: '#c4a35a' }
    case 'future':
      return { bg: '#e8f3ef', color: '#0b3d2e', border: '#7aab93' }
    case 'missing':
    default:
      return { bg: '#f0f0f0', color: '#555', border: '#bbb' }
  }
}

export function ReviewDueAtCell({ cellData }: Props) {
  const raw =
    typeof cellData === 'string'
      ? cellData
      : cellData instanceof Date
        ? cellData.toISOString()
        : null
  const bucket = classifyReviewDueAt(raw)
  const colors = tone(bucket)
  const label = reviewDueBucketLabelAr(bucket)
  const dateLabel =
    raw && bucket !== 'missing'
      ? new Date(raw).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })
      : null

  return (
    <span
      data-waraqa-review-due-cell={bucket}
      title={dateLabel ? `${label} — ${dateLabel}` : label}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        padding: '2px 8px',
        borderRadius: 4,
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontSize: 12,
        fontWeight: 600,
        minWidth: 72,
      }}
    >
      <span>{label}</span>
      {dateLabel ? (
        <span style={{ fontWeight: 500, fontSize: 11 }} aria-hidden="true">
          {dateLabel}
        </span>
      ) : null}
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {bucket === 'overdue'
          ? 'موعد المراجعة متأخر'
          : bucket === 'due_soon'
            ? 'موعد المراجعة قريب'
            : bucket === 'future'
              ? 'موعد المراجعة في المستقبل'
              : 'لا يوجد موعد مراجعة'}
      </span>
    </span>
  )
}

export default ReviewDueAtCell

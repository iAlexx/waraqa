'use client'

import React from 'react'

import { CONTENT_CLASS_LABELS_AR, isContentClass } from '@/lib/content-class/types'

type Props = {
  cellData?: unknown
}

/** Arabic label for contentClass select values. */
export function ContentClassCell({ cellData }: Props) {
  const label = isContentClass(cellData) ? CONTENT_CLASS_LABELS_AR[cellData] : null

  if (!label) {
    return <span>—</span>
  }

  return (
    <span
      data-waraqa-content-class-cell="1"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        background: '#e8f3ef',
        color: '#0b3d2e',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

export default ContentClassCell

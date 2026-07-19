'use client'

import React from 'react'

import { workflowStateLabelAr } from '@/lib/workflow/admin-actions'

type Props = {
  cellData?: unknown
}

export function WorkflowStateCell({ cellData }: Props) {
  return (
    <span
      data-waraqa-workflow-state-cell="1"
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
      {workflowStateLabelAr(cellData)}
    </span>
  )
}

export default WorkflowStateCell

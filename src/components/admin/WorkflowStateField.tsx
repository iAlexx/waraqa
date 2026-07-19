'use client'

import { useField } from '@payloadcms/ui'
import React from 'react'

import { workflowStateLabelAr } from '@/lib/workflow/admin-actions'

/** Read-only Arabic workflow state badge — not an editable Select. */
export function WorkflowStateField({ path }: { path: string }) {
  const { value } = useField<string>({ path })
  const label = workflowStateLabelAr(value)

  return (
    <div dir="rtl" lang="ar" data-waraqa-workflow-state-field="1">
      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>حالة التحرير</div>
      <div
        style={{
          display: 'inline-block',
          padding: '8px 12px',
          borderRadius: 8,
          background: '#e8f3ef',
          border: '1px solid #0b3d2e',
          fontWeight: 700,
          color: '#0b3d2e',
          fontSize: 14,
        }}
      >
        {label}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666' }}>
        للقراءة فقط — تُغيَّر عبر إجراءات سير العمل فقط.
      </p>
      {/* Hidden input keeps form path populated without an editable select */}
      <input type="hidden" name={path} value={value ?? 'draft'} readOnly />
    </div>
  )
}

export default WorkflowStateField

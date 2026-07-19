'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useMemo } from 'react'

import { publicationStatusLabelAr } from '@/lib/workflow/admin-actions'

/** Read-only Arabic publication status card (separate from editorial workflow state). */
export function PublicationStatusField(_props: { path: string }) {
  const status = useFormFields(([fields]) => fields._status?.value as string | undefined)
  const publishedAt = useFormFields(([fields]) => fields.publishedAt?.value as string | undefined)
  const { initialData } = useDocumentInfo()

  const label = useMemo(() => {
    const st = status ?? (initialData as { _status?: string } | undefined)?._status
    const pub =
      publishedAt ?? (initialData as { publishedAt?: string } | undefined)?.publishedAt
    return publicationStatusLabelAr({
      status: st,
      hasPublishedVersion: st === 'draft' && Boolean(pub),
    })
  }, [status, publishedAt, initialData])

  return (
    <div dir="rtl" lang="ar" data-waraqa-publication-status-field="1">
      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>حالة النشر</div>
      <div
        style={{
          display: 'inline-block',
          padding: '8px 12px',
          borderRadius: 8,
          background: '#f0f2f1',
          border: '1px solid #c5d0cb',
          fontWeight: 700,
          color: '#1a2e28',
          fontSize: 14,
        }}
      >
        {label}
      </div>
    </div>
  )
}

export default PublicationStatusField

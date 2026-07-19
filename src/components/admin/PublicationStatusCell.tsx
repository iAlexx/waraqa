'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'

import { publicationStatusLabelAr } from '@/lib/workflow/admin-actions'

const ARABIC_LABELS = new Set(['مسودة', 'منشورة', 'مسودة مع نسخة منشورة'])

/**
 * List cell for virtual `publicationStatus`.
 * Prefer already-computed Arabic label from afterRead; otherwise derive from
 * `_status` + retained `publishedAt` only (never workflowState).
 */
export function PublicationStatusCell({ cellData, rowData }: DefaultCellComponentProps) {
  const label = resolvePublicationStatusCellLabel(cellData, rowData as Record<string, unknown> | undefined)
  return (
    <span
      data-waraqa-publication-status-cell="1"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        background: '#f0f2f1',
        color: '#1a2e28',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

/** Pure helper — unit-tested. */
export function resolvePublicationStatusCellLabel(
  cellData: unknown,
  rowData?: Record<string, unknown> | null,
): string {
  if (typeof cellData === 'string' && ARABIC_LABELS.has(cellData)) {
    return cellData
  }

  const raw = String(cellData ?? '')
  if (/has published version/i.test(raw)) {
    return publicationStatusLabelAr({ status: 'draft', hasPublishedVersion: true })
  }

  const statusFromRow = rowData?._status
  const status =
    statusFromRow === 'draft' || statusFromRow === 'published'
      ? statusFromRow
      : cellData === 'draft' || cellData === 'published'
        ? cellData
        : undefined

  const publishedAt = rowData?.publishedAt

  return publicationStatusLabelAr({
    status,
    hasPublishedVersion: status === 'draft' && Boolean(publishedAt),
  })
}

export default PublicationStatusCell

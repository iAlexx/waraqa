'use client'

import type { DefaultCellComponentProps } from 'payload'
import React, { useEffect, useState } from 'react'

import { actorDisplayLabel } from '@/lib/workflow/admin-actions'

/**
 * Audit / user relationship list cell.
 * Resolves name → email; shows «النظام» when no actor is stored (system/server).
 */
export function ActorCell({ cellData, rowData }: DefaultCellComponentProps) {
  const [label, setLabel] = useState(() => initialLabel(cellData, rowData))

  useEffect(() => {
    let cancelled = false
    async function run() {
      const resolved = await resolveActorCellLabel(cellData, rowData as Record<string, unknown> | undefined)
      if (!cancelled) setLabel(resolved)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cellData, rowData])

  return <span data-waraqa-actor-cell="1">{label}</span>
}

function initialLabel(cellData: unknown, rowData?: Record<string, unknown>): string {
  if (cellData == null || cellData === '') {
    // metadata fallback while loading
    const meta = rowData?.metadata as { actorLabel?: string } | undefined
    if (meta?.actorLabel) return meta.actorLabel
    return '…'
  }
  if (typeof cellData === 'object') return actorDisplayLabel(cellData as never)
  return '…'
}

export async function resolveActorCellLabel(
  cellData: unknown,
  rowData?: Record<string, unknown> | null,
): Promise<string> {
  if (cellData == null || cellData === '') {
    const meta = rowData?.metadata as { actorLabel?: string } | undefined
    if (typeof meta?.actorLabel === 'string' && meta.actorLabel.trim()) {
      return meta.actorLabel.trim()
    }
    return 'النظام'
  }

  if (typeof cellData === 'object') {
    const label = actorDisplayLabel(cellData as never)
    return label === '—' ? 'النظام' : label
  }

  const id = cellData
  try {
    const res = await fetch(`/api/users/${id}?depth=0`, { credentials: 'include' })
    if (!res.ok) {
      return `مستخدم ${id}`
    }
    const u = (await res.json()) as {
      displayName?: string
      name?: string
      email?: string
      id?: number
    }
    const label = actorDisplayLabel(u)
    return label === '—' ? `مستخدم ${id}` : label
  } catch {
    return `مستخدم ${id}`
  }
}

export default ActorCell

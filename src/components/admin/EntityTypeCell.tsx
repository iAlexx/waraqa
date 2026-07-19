'use client'

import React from 'react'

import { entityTypeLabelAr } from '@/lib/workflow/admin-actions'

type Props = {
  cellData?: unknown
}

export function EntityTypeCell({ cellData }: Props) {
  return <span data-waraqa-entity-type-cell="1">{entityTypeLabelAr(cellData)}</span>
}

export default EntityTypeCell

'use client'

import React from 'react'

import { WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'

/**
 * Admin login / nav brand — official interlaced star + Aref Ruqaa Ink «ورقة»
 * at brand-900. Matches owner-approved BrandMark primary (no temporary ★).
 */
export function AdminLogo() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
      aria-label="ورقة — لوحة الإدارة"
      data-waraqa-admin-logo="1"
    >
      <WaraqaStarMotif tone="gold" size={28} />
      <span data-waraqa-admin-wordmark="">ورقة</span>
    </div>
  )
}

export default AdminLogo

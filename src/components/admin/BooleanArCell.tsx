'use client'

import React from 'react'

type Props = {
  cellData?: boolean | null
}

/** Arabic نعم / لا instead of raw true/false. */
export function BooleanArCell({ cellData }: Props) {
  if (cellData === true) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          background: '#e6f4ef',
          color: '#0b3d2e',
          fontSize: 12,
        }}
      >
        نعم
      </span>
    )
  }
  if (cellData === false) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          background: '#f4e6e6',
          color: '#5c1a1a',
          fontSize: 12,
        }}
      >
        لا
      </span>
    )
  }
  return <span>—</span>
}

export default BooleanArCell

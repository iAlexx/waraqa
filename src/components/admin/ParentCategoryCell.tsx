'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  cellData?: unknown
}

function resolveName(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.ar === 'string' && o.ar.trim()) return o.ar.trim()
    if (typeof o.en === 'string' && o.en.trim()) return o.en.trim()
    if (typeof o.name === 'string') return o.name.trim()
  }
  return ''
}

/** Empty parent → بدون تصنيف أب; otherwise Arabic category name (never bare numeric ID). */
export function ParentCategoryCell({ cellData }: Props) {
  const [label, setLabel] = useState<string>(() => {
    if (cellData == null || cellData === '' || cellData === false) return 'بدون تصنيف أب'
    if (typeof cellData === 'object' && cellData !== null) {
      const name =
        resolveName((cellData as { name?: unknown }).name) ||
        resolveName((cellData as { label?: unknown }).label) ||
        resolveName((cellData as { title?: unknown }).title)
      if (name) return name
    }
    return '…'
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cellData == null || cellData === '' || cellData === false) {
        setLabel('بدون تصنيف أب')
        return
      }
      if (typeof cellData === 'object' && cellData !== null) {
        const name =
          resolveName((cellData as { name?: unknown }).name) ||
          resolveName((cellData as { label?: unknown }).label) ||
          resolveName((cellData as { title?: unknown }).title)
        if (name) {
          setLabel(name)
          return
        }
        const id = (cellData as { id?: unknown }).id
        if (id == null) {
          setLabel('بدون تصنيف أب')
          return
        }
        await fetchName(id)
        return
      }
      await fetchName(cellData)
    }

    async function fetchName(id: unknown) {
      try {
        const res = await fetch(`/api/categories/${id}?depth=0&locale=ar`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) setLabel('تصنيف')
          return
        }
        const doc = (await res.json()) as { name?: unknown; slug?: string }
        const name = resolveName(doc.name) || doc.slug || 'تصنيف'
        if (!cancelled) setLabel(name)
      } catch {
        if (!cancelled) setLabel('تصنيف')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [cellData])

  return (
    <span data-waraqa-parent-category-cell="1" style={{ color: label === 'بدون تصنيف أب' ? '#666' : undefined }}>
      {label}
    </span>
  )
}

export default ParentCategoryCell

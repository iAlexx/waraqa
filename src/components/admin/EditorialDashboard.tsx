'use client'

import React, { useEffect, useId, useState } from 'react'

import type { EditorialDashboardCard } from '@/lib/admin/editorial-dashboard'

type DashboardResponse = {
  ok: boolean
  generatedAt?: string
  cards?: EditorialDashboardCard[]
  message?: string
}

/** Presentational dashboard — unit-testable without Payload hooks. */
export function EditorialDashboardView({
  cards,
  loading,
  error,
  generatedAt,
}: {
  cards: EditorialDashboardCard[] | null
  loading?: boolean
  error?: string | null
  generatedAt?: string | null
}) {
  const headingId = useId()

  if (loading && !cards) {
    return (
      <section
        dir="rtl"
        aria-labelledby={headingId}
        data-waraqa-editorial-dashboard="loading"
        style={{
          margin: '0 0 1.5rem',
          padding: '1rem 1.25rem',
          border: '1px solid #d8e2dc',
          borderRadius: 8,
          background: '#f7faf8',
        }}
      >
        <h2 id={headingId} style={{ margin: 0, fontSize: '1.125rem', color: '#0b3d2e' }}>
          لوحة التحرير
        </h2>
        <p style={{ margin: '0.5rem 0 0', color: '#456' }}>جارٍ التحميل…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section
        dir="rtl"
        aria-labelledby={headingId}
        data-waraqa-editorial-dashboard="error"
        role="alert"
        style={{
          margin: '0 0 1.5rem',
          padding: '1rem 1.25rem',
          border: '1px solid #c45c5c',
          borderRadius: 8,
          background: '#f8e8e8',
        }}
      >
        <h2 id={headingId} style={{ margin: 0, fontSize: '1.125rem', color: '#5c1a1a' }}>
          لوحة التحرير
        </h2>
        <p style={{ margin: '0.5rem 0 0', color: '#5c1a1a' }}>{error}</p>
      </section>
    )
  }

  if (!cards || cards.length === 0) {
    return null
  }

  return (
    <section
      dir="rtl"
      aria-labelledby={headingId}
      data-waraqa-editorial-dashboard="1"
      style={{
        margin: '0 0 1.5rem',
        padding: '1rem 1.25rem',
        border: '1px solid #d8e2dc',
        borderRadius: 8,
        background: '#f7faf8',
      }}
    >
      <header style={{ marginBottom: '0.75rem' }}>
        <h2 id={headingId} style={{ margin: 0, fontSize: '1.125rem', color: '#0b3d2e' }}>
          لوحة التحرير
        </h2>
        <p style={{ margin: '0.35rem 0 0', color: '#456', fontSize: 13 }}>
          أعداد تشغيلية سريعة للفريق التحريري — ليست تحليلات عامة.
          {generatedAt ? (
            <span style={{ display: 'block', marginTop: 4 }}>
              آخر تحديث: {new Date(generatedAt).toLocaleString('ar')}
            </span>
          ) : null}
        </p>
      </header>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))',
        }}
      >
        {cards.map((card) => (
          <li key={card.key}>
            <a
              href={card.href}
              data-dashboard-card={card.key}
              aria-label={`${card.labelAr}: ${card.count}`}
              style={{
                display: 'block',
                minHeight: 72,
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid #c5d6cb',
                background: '#fff',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#0b3d2e',
                  lineHeight: 1.2,
                }}
              >
                {card.count}
              </span>
              <span style={{ display: 'block', marginTop: 4, fontSize: 13, fontWeight: 600 }}>
                {card.labelAr}
              </span>
              {card.hintAr ? (
                <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#567' }}>
                  {card.hintAr}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function EditorialDashboard() {
  const [cards, setCards] = useState<EditorialDashboardCard[] | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin-ops/dashboard', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const body = (await res.json().catch(() => ({}))) as DashboardResponse
        if (!res.ok || !body.ok) {
          if (res.status === 403) {
            // Viewer/researcher: hide dashboard quietly.
            if (!cancelled) {
              setCards(null)
              setError(null)
            }
            return
          }
          throw new Error(body.message || 'تعذّر تحميل لوحة التحرير.')
        }
        if (!cancelled) {
          setCards(body.cards ?? [])
          setGeneratedAt(body.generatedAt ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذّر تحميل لوحة التحرير.')
          setCards(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <EditorialDashboardView
      cards={cards}
      loading={loading}
      error={error}
      generatedAt={generatedAt}
    />
  )
}

export default EditorialDashboard

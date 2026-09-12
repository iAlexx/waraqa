'use client'

import React, { useCallback, useEffect, useId, useState } from 'react'

import type {
  ClaimReadinessDetail,
  ReadinessIssue,
  ReadinessStatus,
  TransactionAdminReadiness,
} from '@/lib/admin/transaction-readiness-types'

type Props = {
  transactionId: string | number
  /** Called after successful workflow actions that reload; optional external refresh trigger. */
  refreshToken?: number
}

function statusTone(status: ReadinessStatus): { bg: string; border: string; color: string } {
  switch (status) {
    case 'READY':
      return { bg: '#e8f3ef', border: '#0b3d2e', color: '#0b3d2e' }
    case 'WARNING':
      return { bg: '#fff4df', border: '#c4a35a', color: '#5c4510' }
    case 'BLOCKED':
      return { bg: '#f8e8e8', border: '#c45c5c', color: '#5c1a1a' }
    case 'UNKNOWN':
    default:
      return { bg: '#f0f0f0', border: '#888', color: '#333' }
  }
}

/** Presentational readiness panel — unit-testable without Payload hooks. */
export function TransactionReadinessView({
  readiness,
  loading,
  error,
  onRefresh,
}: {
  readiness: TransactionAdminReadiness | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
}) {
  const detailsId = useId()
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (loading && !readiness) {
    return (
      <div
        dir="rtl"
        lang="ar"
        data-waraqa-readiness="loading"
        style={panelStyle}
        aria-busy="true"
      >
        جارٍ فحص الجاهزية…
      </div>
    )
  }

  if (error && !readiness) {
    return (
      <div dir="rtl" lang="ar" data-waraqa-readiness="error" role="alert" style={panelStyle}>
        <div style={{ marginBottom: 8 }}>{error}</div>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} style={refreshBtn}>
            إعادة المحاولة
          </button>
        ) : null}
      </div>
    )
  }

  if (!readiness) return null

  const wf = statusTone(readiness.workflow.status)
  const pub = statusTone(readiness.publicEligibility.status)
  const blockers = readiness.actionItems.filter((i) => i.severity === 'blocker')
  const warnings = readiness.actionItems.filter((i) => i.severity === 'warning')

  return (
    <section
      dir="rtl"
      lang="ar"
      data-waraqa-readiness="1"
      data-waraqa-workflow-status={readiness.workflow.status}
      data-waraqa-public-status={readiness.publicEligibility.status}
      aria-label="جاهزية النشر والظهور للعامة"
      style={panelStyle}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <strong style={{ fontSize: 15 }}>جاهزية النشر والظهور</strong>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            data-waraqa-readiness-refresh="1"
            aria-label="تحديث فحص الجاهزية"
            style={refreshBtn}
          >
            {loading ? 'جاري التحديث…' : 'تحديث الفحص'}
          </button>
        ) : null}
      </div>

      <p
        data-waraqa-readiness-saved="1"
        style={{ margin: '0 0 12px', fontSize: 12, color: '#555', lineHeight: 1.5 }}
      >
        يستند هذا الفحص إلى آخر نسخة محفوظة على الخادم — احفظ التغييرات لتحديث فحص الجاهزية. اللوحة
        إعلامية فقط؛ الاعتماد/النشر يُفرض على الخادم مجدداً.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <AxisCard
          title="جاهزية سير العمل / النشر"
          status={readiness.workflow.status}
          label={readiness.workflow.labelAr}
          tone={wf}
        />
        <AxisCard
          title="أهلية الظهور للعامة"
          status={readiness.publicEligibility.status}
          label={readiness.publicEligibility.labelAr}
          tone={pub}
        />
      </div>

      <p
        data-waraqa-content-class-note="1"
        style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.5 }}
      >
        {readiness.publicEligibility.contentClassNoteAr}
      </p>

      {readiness.publicEligibility.storedClaimTrustOk === true &&
      readiness.publicEligibility.liveClaimTrustOk === false ? (
        <div
          role="alert"
          data-waraqa-stale-trust="1"
          style={{
            background: '#f8e8e8',
            border: '1px solid #c45c5c',
            borderRadius: 6,
            padding: '8px 10px',
            marginBottom: 10,
            fontSize: 13,
            color: '#5c1a1a',
          }}
        >
          تعارض: claimTrustOk المخزَّن = نعم لكن التقييم الحيّ يفشل — لا تعتمد المؤشر المخزَّن.
        </div>
      ) : null}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
          المشاكل التي تحتاج معالجة
        </div>
        {!blockers.length && !warnings.length ? (
          <p data-waraqa-readiness-clear="1" style={{ margin: 0, fontSize: 13, color: '#0b3d2e' }}>
            لا مشاكل ظاهرة على النسخة المحفوظة — يبقى التحقق النهائي عند تنفيذ الإجراء على الخادم.
          </p>
        ) : (
          <ul
            data-waraqa-readiness-issues="1"
            style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.65 }}
          >
            {blockers.map((issue) => (
              <IssueItem key={`${issue.code}-${issue.claimKey ?? ''}-${issue.messageAr}`} issue={issue} />
            ))}
            {warnings.map((issue) => (
              <IssueItem key={`${issue.code}-${issue.claimKey ?? ''}-${issue.messageAr}`} issue={issue} />
            ))}
          </ul>
        )}
      </div>

      {readiness.claimDetails.length ? (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            data-waraqa-readiness-details-toggle="1"
            onClick={() => setDetailsOpen((v) => !v)}
            style={{
              ...refreshBtn,
              marginBottom: detailsOpen ? 8 : 0,
            }}
          >
            {detailsOpen ? 'إخفاء تفاصيل الادعاءات' : 'تفاصيل الادعاءات المرتبطة'}
          </button>
          {detailsOpen ? (
            <div id={detailsId} data-waraqa-claim-details="1">
              {readiness.claimDetails.map((c) => (
                <ClaimDetailCard key={`${c.claimKey}-${c.status}`} detail={c} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function AxisCard({
  title,
  status,
  label,
  tone,
}: {
  title: string
  status: ReadinessStatus
  label: string
  tone: { bg: string; border: string; color: string }
}) {
  return (
    <div
      data-waraqa-readiness-axis={title}
      data-status={status}
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 180,
        flex: '1 1 160px',
      }}
    >
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: tone.color }}>{label}</div>
    </div>
  )
}

function IssueItem({ issue }: { issue: ReadinessIssue }) {
  return (
    <li data-waraqa-issue-code={issue.code} data-severity={issue.severity}>
      <span style={{ fontWeight: issue.severity === 'blocker' ? 600 : 500 }}>{issue.messageAr}</span>
      {issue.claimKey ? (
        <span style={{ display: 'block', fontSize: 12, color: '#666' }}>
          المفتاح: {issue.claimKey}
          {issue.claimStatus ? ` · الحالة: ${issue.claimStatus}` : ''}
          {issue.publicationPermission ? ` · إذن النشر: ${issue.publicationPermission}` : ''}
        </span>
      ) : null}
    </li>
  )
}

function ClaimDetailCard({ detail }: { detail: ClaimReadinessDetail }) {
  return (
    <div
      data-waraqa-claim-key={detail.claimKey}
      style={{
        border: '1px solid #ddd',
        borderRadius: 6,
        padding: '10px 12px',
        marginBottom: 8,
        fontSize: 13,
        background: '#fafafa',
      }}
    >
      <div>
        <strong>المطالبة:</strong> {detail.claimKey}
      </div>
      <div>
        <strong>الحالة:</strong> {detail.status}
      </div>
      <div>
        <strong>إذن النشر:</strong> {detail.publicationPermission}
      </div>
      <div>
        <strong>النتيجة:</strong> {detail.outcomeAr}
      </div>
      {detail.reasons.length ? (
        <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
          {detail.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: '#f7f9f8',
  border: '1px solid #c5d0cb',
  borderRadius: 8,
  padding: '12px 14px',
  width: '100%',
}

const refreshBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #bbb',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  fontSize: 12,
}

export function TransactionReadinessPanel({ transactionId, refreshToken = 0 }: Props) {
  const [readiness, setReadiness] = useState<TransactionAdminReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualTick, setManualTick] = useState(0)

  useEffect(() => {
    if (transactionId == null || transactionId === '') return
    let cancelled = false

    void (async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}/readiness`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const data = (await res.json().catch(() => ({}))) as {
          readiness?: TransactionAdminReadiness
          errors?: Array<{ message?: string }>
          message?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setReadiness(null)
          setError(
            data?.errors?.[0]?.message ||
              data?.message ||
              `تعذّر تحميل الجاهزية (HTTP ${res.status})`,
          )
          return
        }
        if (!data.readiness) {
          setReadiness(null)
          setError('استجابة جاهزية غير مكتملة.')
          return
        }
        setError(null)
        setReadiness(data.readiness)
      } catch (e) {
        if (cancelled) return
        setReadiness(null)
        setError(e instanceof Error ? e.message : 'خطأ شبكة')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [transactionId, refreshToken, manualTick])

  const onRefresh = useCallback(() => {
    setLoading(true)
    setManualTick((n) => n + 1)
  }, [])

  return (
    <TransactionReadinessView
      readiness={readiness}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
    />
  )
}

export default TransactionReadinessPanel

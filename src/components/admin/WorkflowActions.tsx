'use client'

import { useAuth, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type { WaraqaRole } from '@/access/roles'
import {
  actorDisplayLabel,
  getVisibleWorkflowActions,
  parseCoverageAlertLines,
  publicationStatusLabelAr,
  workflowStateLabelAr,
  type AdminWorkflowActionDef,
} from '@/lib/workflow/admin-actions'
import type { WorkflowState } from '@/lib/workflow/types'

type DialogMode =
  | { kind: 'confirm'; def: AdminWorkflowActionDef }
  | { kind: 'comment'; def: AdminWorkflowActionDef }
  | { kind: 'reason'; def: AdminWorkflowActionDef }
  | { kind: 'coverage'; lines: string[]; raw: string }
  | null

function roleOf(user: unknown): WaraqaRole | null {
  if (!user || typeof user !== 'object') return null
  const role = (user as { role?: string }).role
  if (role === 'admin' || role === 'reviewer' || role === 'researcher' || role === 'viewer') {
    return role
  }
  return null
}

function resolveLocalized(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.ar === 'string') return o.ar
    if (typeof o.en === 'string') return o.en
  }
  return String(value)
}

export function WorkflowActions() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const workflowState = useFormFields(([fields]) => fields.workflowState?.value as string | undefined)
  const markedOutdated = useFormFields(([fields]) => fields.markedOutdated?.value as boolean | undefined)
  const status = useFormFields(([fields]) => fields._status?.value as string | undefined)
  const changeRequestComment = useFormFields(
    ([fields]) => fields.changeRequestComment?.value as string | undefined,
  )
  const changeRequestedAt = useFormFields(
    ([fields]) => fields.changeRequestedAt?.value as string | undefined,
  )
  const changeRequestedBy = useFormFields(([fields]) => fields.changeRequestedBy?.value as unknown)
  const approvedContentHash = useFormFields(
    ([fields]) => fields.approvedContentHash?.value as string | undefined,
  )
  const publishedAt = useFormFields(([fields]) => fields.publishedAt?.value as string | undefined)

  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [draftText, setDraftText] = useState('')
  const [reviewerLabel, setReviewerLabel] = useState<string>('—')
  const [invalidated, setInvalidated] = useState(false)

  const role = roleOf(user)
  const actions = useMemo(
    () =>
      getVisibleWorkflowActions({
        role,
        workflowState: workflowState as WorkflowState,
        markedOutdated,
      }),
    [role, workflowState, markedOutdated],
  )

  const primary = actions.filter((a) => a.tier === 'primary')
  const secondary = actions.filter((a) => a.tier === 'secondary')
  const overflow = actions.filter((a) => a.tier === 'overflow')

  useEffect(() => {
    let cancelled = false
    async function loadMeta() {
      if (!id) return
      // Reviewer label for changes_requested
      const by = changeRequestedBy
      if (by && typeof by === 'object' && ('email' in by || 'name' in by || 'displayName' in by)) {
        setReviewerLabel(actorDisplayLabel(by as never))
      } else if (by != null) {
        try {
          const res = await fetch(`/api/users/${typeof by === 'object' && by && 'id' in by ? (by as { id: string }).id : by}?depth=0`, {
            credentials: 'include',
          })
          if (res.ok) {
            const u = (await res.json()) as {
              displayName?: string
              name?: string
              email?: string
              id?: number
            }
            if (!cancelled) setReviewerLabel(actorDisplayLabel(u))
          }
        } catch {
          /* ignore */
        }
      }

      // Approval invalidation signal from audit log (no schema migration)
      if (workflowState === 'draft' && !approvedContentHash) {
        try {
          const q = new URLSearchParams({
            'where[and][0][entityId][equals]': String(id),
            'where[and][1][action][equals]': 'approval_invalidated',
            limit: '1',
            depth: '0',
            sort: '-createdAt',
          })
          const res = await fetch(`/api/audit-events?${q}`, { credentials: 'include' })
          if (res.ok) {
            const data = (await res.json()) as { totalDocs?: number }
            if (!cancelled) setInvalidated((data.totalDocs ?? 0) > 0)
          }
        } catch {
          /* ignore */
        }
      } else if (!cancelled) {
        setInvalidated(false)
      }
    }
    void loadMeta()
    return () => {
      cancelled = true
    }
  }, [id, changeRequestedBy, workflowState, approvedContentHash])

  const execute = useCallback(
    async (def: AdminWorkflowActionDef, comment?: string, reason?: string) => {
      if (!id || !user) return
      setBusy(true)
      setMsg(null)
      setDialog(null)
      try {
        const res = await fetch(`/api/transactions/${id}/workflow/${def.action}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment, reason }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          errors?: Array<{ message?: string }>
          message?: string
        }
        if (!res.ok) {
          const err =
            data?.errors?.[0]?.message || data?.message || `فشل الإجراء (HTTP ${res.status})`
          const errText = String(err)
          if (
            (def.action === 'approve' || def.action === 'publish') &&
            /تغطية|مصدر|موثّق|steps|fees|required_documents/i.test(errText)
          ) {
            setDialog({
              kind: 'coverage',
              lines: parseCoverageAlertLines(errText),
              raw: errText,
            })
          } else {
            setMsg(errText)
          }
        } else {
          setMsg('تم بنجاح — جارٍ تحديث الصفحة…')
          window.setTimeout(() => window.location.reload(), 600)
        }
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'خطأ شبكة')
      } finally {
        setBusy(false)
      }
    },
    [id, user],
  )

  const startAction = useCallback((def: AdminWorkflowActionDef) => {
    setDraftText('')
    if (def.needsComment) {
      setDialog({ kind: 'comment', def })
      return
    }
    if (def.needsReason) {
      setDialog({ kind: 'reason', def })
      return
    }
    if (def.needsConfirm) {
      setDialog({ kind: 'confirm', def })
      return
    }
    void execute(def)
  }, [execute])

  if (!id) return null

  const pubLabel = publicationStatusLabelAr({
    status,
    // Only a prior publish stamps publishedAt; do not use approvedAt (approval ≠ published).
    hasPublishedVersion: status === 'draft' && Boolean(publishedAt),
  })

  return (
    <div
      dir="rtl"
      lang="ar"
      data-waraqa-workflow-toolbar="1"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '10px 0 14px',
        width: '100%',
      }}
    >
      {/* Dual status */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard
          title="حالة التحرير"
          value={workflowStateLabelAr(workflowState)}
          tone={workflowState === 'changes_requested' ? 'warn' : 'brand'}
        />
        <StatusCard title="حالة النشر" value={pubLabel} tone="neutral" />
      </div>

      {invalidated ? (
        <div
          role="alert"
          data-waraqa-alert="approval-invalidated"
          style={{
            background: '#f8e8e8',
            border: '1px solid #c45c5c',
            borderRadius: 8,
            padding: '12px 14px',
            color: '#5c1a1a',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          تم إبطال الاعتماد بسبب تعديل جوهري على المحتوى.
        </div>
      ) : null}

      {workflowState === 'changes_requested' ? (
        <div
          data-waraqa-panel="reviewer-notes"
          style={{
            background: '#fff8e8',
            border: '1px solid #c4a35a',
            borderRadius: 8,
            padding: '14px 16px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>ملاحظات المراجع</div>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>
            المراجع: {reviewerLabel}
            {changeRequestedAt
              ? ` · ${new Date(changeRequestedAt).toLocaleString('ar')}`
              : null}
          </div>
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
            {resolveLocalized(changeRequestComment) || '—'}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {primary.map((a) => (
          <ActionButton key={a.action} def={a} variant="primary" busy={busy} onClick={() => startAction(a)} />
        ))}
        {secondary.map((a) => (
          <ActionButton
            key={a.action}
            def={a}
            variant="secondary"
            busy={busy}
            onClick={() => startAction(a)}
          />
        ))}
        {overflow.length ? (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              disabled={busy}
              data-waraqa-overflow-toggle="1"
              onClick={() => setOverflowOpen((v) => !v)}
              style={btnStyle('ghost')}
            >
              المزيد ▾
            </button>
            {overflowOpen ? (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '110%',
                  insetInlineStart: 0,
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  minWidth: 200,
                  zIndex: 40,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: 6,
                }}
              >
                {overflow.map((a) => (
                  <button
                    key={a.action}
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => {
                      setOverflowOpen(false)
                      startAction(a)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'right',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      borderRadius: 4,
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {!actions.length && role === 'researcher' ? (
          <span style={{ fontSize: 13, color: '#666' }}>لا إجراءات متاحة في هذه الحالة لهذا الدور.</span>
        ) : null}
      </div>

      {msg ? (
        <span
          data-waraqa-workflow-msg="1"
          style={{ fontSize: 13, color: msg.includes('نجاح') ? '#0b3d2e' : '#8b1a1a' }}
        >
          {msg}
        </span>
      ) : null}

      {dialog ? (
        <Modal
          onClose={() => setDialog(null)}
          title={
            dialog.kind === 'coverage'
              ? 'تعذّر الاعتماد — تغطية المصادر'
              : dialog.kind === 'comment'
                ? 'طلب تعديلات'
                : dialog.kind === 'reason'
                  ? 'تأكيد مع سبب'
                  : `تأكيد: ${dialog.def.label}`
          }
        >
          {dialog.kind === 'coverage' ? (
            <>
              <ul style={{ margin: '0 0 12px', paddingInlineStart: 18, lineHeight: 1.7 }}>
                {dialog.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <details style={{ fontSize: 12, color: '#666' }}>
                <summary>تفاصيل تقنية</summary>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{dialog.raw}</pre>
              </details>
              <button type="button" style={btnStyle('primary')} onClick={() => setDialog(null)}>
                حسناً
              </button>
            </>
          ) : null}
          {dialog.kind === 'comment' || dialog.kind === 'reason' ? (
            <>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                {dialog.kind === 'comment' ? 'تعليق طلب التعديل (إلزامي)' : 'السبب (إلزامي)'}
              </label>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={btnStyle('primary')}
                  disabled={busy || !draftText.trim()}
                  onClick={() => {
                    if (dialog.kind === 'comment') void execute(dialog.def, draftText.trim())
                    else void execute(dialog.def, undefined, draftText.trim())
                  }}
                >
                  تأكيد
                </button>
                <button type="button" style={btnStyle('ghost')} onClick={() => setDialog(null)}>
                  إلغاء
                </button>
              </div>
            </>
          ) : null}
          {dialog.kind === 'confirm' ? (
            <>
              <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14 }}>
                هل تريد تنفيذ «{dialog.def.label}»؟
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={btnStyle('primary')}
                  disabled={busy}
                  onClick={() => void execute(dialog.def)}
                >
                  تأكيد
                </button>
                <button type="button" style={btnStyle('ghost')} onClick={() => setDialog(null)}>
                  إلغاء
                </button>
              </div>
            </>
          ) : null}
        </Modal>
      ) : null}
    </div>
  )
}

function StatusCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: 'brand' | 'warn' | 'neutral'
}) {
  const bg = tone === 'warn' ? '#fff4df' : tone === 'brand' ? '#e8f3ef' : '#f3f5f4'
  const border = tone === 'warn' ? '#c4a35a' : tone === 'brand' ? '#0b3d2e' : '#c5d0cb'
  return (
    <div
      data-waraqa-status-card={title}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#122' }}>{value}</div>
    </div>
  )
}

function ActionButton({
  def,
  variant,
  busy,
  onClick,
}: {
  def: AdminWorkflowActionDef
  variant: 'primary' | 'secondary'
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      data-waraqa-workflow-action={def.action}
      data-waraqa-tier={def.tier}
      onClick={onClick}
      style={btnStyle(variant)}
    >
      {def.label}
    </button>
  )
}

function btnStyle(variant: 'primary' | 'secondary' | 'ghost'): React.CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '8px 14px',
      borderRadius: 6,
      border: '1px solid #0b3d2e',
      background: '#0b3d2e',
      color: '#fff',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
    }
  }
  if (variant === 'secondary') {
    return {
      padding: '8px 14px',
      borderRadius: 6,
      border: '1px solid #0b3d2e',
      background: '#fff',
      color: '#0b3d2e',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
    }
  }
  return {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #bbb',
    background: '#f7f7f7',
    color: '#333',
    cursor: 'pointer',
    fontSize: 13,
  }
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      data-waraqa-modal="1"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 20,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default WorkflowActions

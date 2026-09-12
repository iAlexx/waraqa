'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { GuideRulePreviewView } from '@/components/admin/GuideRulePreviewView'
import type {
  GuidePreviewCatalogResponse,
  TransactionGuidePreview,
} from '@/lib/admin/guide-preview-types'
import type { GuideAnswers } from '@/lib/guide/types'

type Props = {
  /** Optional override for unit/integration hooks (skip Payload document id). */
  transactionId?: string | number
}

export function GuideRulePreviewPanel(props: Props = {}) {
  const doc = useDocumentInfo()
  const transactionId = props.transactionId ?? doc.id

  const [catalog, setCatalog] = useState<GuidePreviewCatalogResponse | null>(null)
  const [preview, setPreview] = useState<TransactionGuidePreview | null>(null)
  const [answers, setAnswers] = useState<GuideAnswers>({})
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const canLoad = transactionId != null && transactionId !== ''

  useEffect(() => {
    if (!canLoad) return
    let cancelled = false

    /* eslint-disable react-hooks/set-state-in-effect -- Admin catalog fetch after mount / reload tick */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */

    void (async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}/guide-preview`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const data = (await res.json().catch(() => ({}))) as {
          preview?: GuidePreviewCatalogResponse
          errors?: Array<{ message?: string }>
          message?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setCatalog(null)
          setError(
            data?.errors?.[0]?.message ||
              data?.message ||
              `تعذّر تحميل معاينة الدليل (HTTP ${res.status})`,
          )
          return
        }
        if (!data.preview) {
          setCatalog(null)
          setError('استجابة معاينة غير مكتملة.')
          return
        }
        setError(null)
        setCatalog(data.preview)
        setPreview(null)
      } catch (e) {
        if (cancelled) return
        setCatalog(null)
        setError(e instanceof Error ? e.message : 'خطأ شبكة')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canLoad, transactionId, reloadTick])

  const runEvaluate = useCallback(async () => {
    if (!canLoad) return
    setEvaluating(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/guide-preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        preview?: TransactionGuidePreview
        errors?: Array<{ message?: string }>
        message?: string
      }
      if (!res.ok) {
        setPreview(null)
        setError(
          data?.errors?.[0]?.message ||
            data?.message ||
            `تعذّر تشغيل المعاينة (HTTP ${res.status})`,
        )
        return
      }
      if (!data.preview) {
        setPreview(null)
        setError('استجابة معاينة غير مكتملة.')
        return
      }
      setPreview(data.preview)
      setAnswers(data.preview.sanitizedAnswers)
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : 'خطأ شبكة')
    } finally {
      setEvaluating(false)
    }
  }, [answers, canLoad, transactionId])

  const onReset = useCallback(() => {
    setAnswers({})
    setPreview(null)
    setError(null)
  }, [])

  const emptyNotice = useMemo(() => {
    if (canLoad) return null
    return 'احفظ المعاملة أولاً لتفعيل معاينة القواعد.'
  }, [canLoad])

  if (emptyNotice) {
    return (
      <div dir="rtl" lang="ar" data-waraqa-guide-preview="unsaved" style={panelStyle}>
        {emptyNotice}
      </div>
    )
  }

  return (
    <GuideRulePreviewView
      catalog={catalog}
      preview={preview}
      answers={answers}
      onAnswersChange={setAnswers}
      loading={loading}
      evaluating={evaluating}
      error={error}
      onReloadCatalog={() => setReloadTick((n) => n + 1)}
      onEvaluate={() => void runEvaluate()}
      onReset={onReset}
    />
  )
}

export default GuideRulePreviewPanel

const panelStyle: React.CSSProperties = {
  background: '#f7f9f8',
  border: '1px solid #c5d0cb',
  borderRadius: 8,
  padding: '12px 14px',
  width: '100%',
  marginBottom: 16,
}

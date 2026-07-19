import { headers as getHeaders } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@payload-config'
import { getUserRole, isUserActive, type UserLike } from '@/access/roles'
import { getServerEnv } from '@/lib/env'
import { computeVerificationHealth } from '@/lib/workflow/review-schedule'
import { verifyPreviewToken } from '@/lib/workflow/preview-token'
import { validateSourceEvidence } from '@/lib/workflow/source-evidence'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'معاينة داخلية — ورقة',
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function TransactionPreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams
  const payload = await getPayload({ config })
  const headerList = await getHeaders()
  const { user } = await payload.auth({ headers: headerList })

  if (!user || !isUserActive(user as UserLike)) {
    return (
      <main dir="rtl" lang="ar" style={pageStyle}>
        <Banner />
        <p style={{ color: '#8b1a1a' }}>غير مصرّح — يجب تسجيل الدخول لمعاينة المسودات.</p>
      </main>
    )
  }

  const role = getUserRole(user as UserLike)
  const env = getServerEnv()
  const secret = env.PREVIEW_SECRET || env.PAYLOAD_SECRET

  if (token) {
    const parsed = verifyPreviewToken(secret, token)
    if (!parsed || parsed.id !== String(id) || parsed.uid !== String(user.id)) {
      return (
        <main dir="rtl" lang="ar" style={pageStyle}>
          <Banner />
          <p style={{ color: '#8b1a1a' }}>رمز المعاينة غير صالح أو منتهٍ.</p>
        </main>
      )
    }
  } else if (role !== 'admin' && role !== 'reviewer' && role !== 'researcher') {
    return (
      <main dir="rtl" lang="ar" style={pageStyle}>
        <Banner />
        <p style={{ color: '#8b1a1a' }}>غير مصرّح بالمعاينة لهذا الدور دون رمز صالح.</p>
      </main>
    )
  }

  let doc: Record<string, unknown>
  try {
    doc = (await payload.findByID({
      collection: 'transactions',
      id,
      depth: 1,
      draft: true,
      user,
      overrideAccess: false,
    })) as unknown as Record<string, unknown>
  } catch {
    notFound()
  }

  if (role === 'viewer') {
    return (
      <main dir="rtl" lang="ar" style={pageStyle}>
        <Banner />
        <p style={{ color: '#8b1a1a' }}>المشاهد لا يمكنه معاينة المسودات.</p>
      </main>
    )
  }

  const title =
    typeof doc.title === 'object' && doc.title && 'ar' in (doc.title as object)
      ? String((doc.title as { ar?: string }).ar ?? '')
      : String(doc.title ?? '')

  const summary =
    typeof doc.summary === 'object' && doc.summary && 'ar' in (doc.summary as object)
      ? String((doc.summary as { ar?: string }).ar ?? '')
      : String(doc.summary ?? '')

  const health = computeVerificationHealth({
    markedOutdated: Boolean(doc.markedOutdated),
    lastReviewedAt: doc.lastReviewedAt as string | null,
    reviewDueAt: doc.reviewDueAt as string | null,
  })

  const resolved = new Map()
  for (const row of (doc.sources as Array<{ source?: { id?: string | number } }>) ?? []) {
    const s = row.source
    if (s && typeof s === 'object' && s.id != null) resolved.set(String(s.id), s)
  }
  const coverageErrors = validateSourceEvidence(doc as never, resolved)

  return (
    <main dir="rtl" lang="ar" style={pageStyle}>
      <Banner />
      <h1 style={{ fontSize: 28, margin: '16px 0 8px' }}>{title || 'بدون عنوان'}</h1>
      <p style={{ color: '#334' }}>{summary}</p>
      <dl style={{ display: 'grid', gap: 8, marginTop: 24 }}>
        <Row label="حالة سير العمل" value={String(doc.workflowState ?? 'draft')} />
        <Row label="حالة النشر" value={String(doc._status ?? 'draft')} />
        <Row label="صحة التحقق" value={health} />
        <Row label="موعد المراجعة" value={String(doc.reviewDueAt ?? '—')} />
        <Row label="نشط" value={doc.active === false ? 'لا' : 'نعم'} />
      </dl>
      {coverageErrors.length ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>تحذيرات تغطية المصادر</h2>
          <ul>
            {coverageErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p style={{ marginTop: 24, color: '#0b3d2e' }}>لا تحذيرات تغطية مصادر ظاهرة.</p>
      )}
      {role === 'admin' || role === 'reviewer' || role === 'researcher' ? (
        doc.changeRequestComment ? (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18 }}>تعليق طلب التعديل</h2>
            <p>{String(doc.changeRequestComment)}</p>
          </section>
        ) : null
      ) : null}
      {(role === 'admin' || role === 'reviewer') && doc.internalNotes ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>ملاحظات داخلية</h2>
          <p>{String(doc.internalNotes)}</p>
        </section>
      ) : null}
    </main>
  )
}

function Banner() {
  return (
    <div
      style={{
        background: '#f4e6c8',
        border: '1px solid #c4a35a',
        padding: '12px 16px',
        borderRadius: 6,
        fontWeight: 600,
      }}
    >
      معاينة داخلية — هالمحتوى غير منشور
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <dt style={{ fontWeight: 600, minWidth: 140 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '24px 16px 48px',
  fontFamily: 'system-ui, Segoe UI, Tahoma, sans-serif',
  background: 'linear-gradient(180deg, #f7faf8 0%, #eef5f1 100%)',
  minHeight: '100vh',
}

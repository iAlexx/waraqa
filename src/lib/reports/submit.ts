import type { Payload, PayloadRequest } from 'payload'

import { getPublicTransactionWhere } from '@/access'
import { liveEvaluatePublicTransactionClaimTrust } from '@/lib/claims/public-claim-trust'
import { writeAuditEvent } from '@/lib/workflow/audit'

import { cleanupExpiredReportRateBuckets, consumeReportRateLimit } from './rate-limit'
import type { ValidatedPublicReport } from './validate-submit'

export type SubmitReportResult =
  | { ok: true; discarded?: boolean }
  | {
      ok: false
      code: 'not_found' | 'rate_limited' | 'unavailable'
      message: string
      retryAfterSec?: number
    }

/**
 * Create a user report only when the Transaction is publicly eligible
 * under the same P0-05 / P0-06 gates as the public detail page.
 */
export async function assertPubliclyReportableTransaction(
  payload: Payload,
  slug: string,
  req?: PayloadRequest,
): Promise<{ ok: true; id: number | string; title: string } | { ok: false }> {
  const normalized = slug.trim()
  if (!normalized || normalized.length > 160) return { ok: false }

  try {
    const found = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        and: [{ slug: { equals: normalized } }, getPublicTransactionWhere()],
      },
    })

    const doc = found.docs[0] as
      | { id: number | string; title?: unknown; contentClass?: unknown }
      | undefined
    if (!doc) return { ok: false }

    if (!(await liveEvaluatePublicTransactionClaimTrust(payload, doc as Record<string, unknown>))) {
      return { ok: false }
    }

    const title =
      typeof doc.title === 'string'
        ? doc.title
        : typeof (doc.title as { ar?: string } | undefined)?.ar === 'string'
          ? (doc.title as { ar: string }).ar
          : normalized

    return { ok: true, id: doc.id, title }
  } catch {
    return { ok: false }
  }
}

export async function submitPublicUserReport(opts: {
  payload: Payload
  req?: PayloadRequest
  data: ValidatedPublicReport
  identityHash: string
}): Promise<SubmitReportResult> {
  const { payload, req, data, identityHash } = opts

  // Honeypot: pretend success, do not persist.
  if (data.honeypotTriggered) {
    return { ok: true, discarded: true }
  }

  // Occasional cleanup (cheap best-effort).
  if (Math.random() < 0.02) {
    void cleanupExpiredReportRateBuckets(payload)
  }

  let rate: Awaited<ReturnType<typeof consumeReportRateLimit>>
  try {
    rate = await consumeReportRateLimit(payload, identityHash)
  } catch {
    return {
      ok: false,
      code: 'unavailable',
      message: 'تعذّر إرسال البلاغ حالياً. حاول مرة ثانية بعد قليل.',
    }
  }

  if (!rate.ok) {
    return {
      ok: false,
      code: 'rate_limited',
      message: 'وصلت إلى الحد الأقصى للبلاغات حالياً. حاول لاحقاً.',
      retryAfterSec: rate.retryAfterSec,
    }
  }

  const tx = await assertPubliclyReportableTransaction(payload, data.transactionSlug, req)
  if (!tx.ok) {
    return {
      ok: false,
      code: 'not_found',
      message: 'تعذّر إرسال البلاغ لهذه المعاملة.',
    }
  }

  try {
    const created = await payload.create({
      collection: 'user-reports',
      data: {
        transaction: Number(tx.id),
        section: data.section,
        message: data.message,
        sourceUrl: data.sourceUrl || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        consentAccepted: true,
        status: 'open',
      },
      overrideAccess: true,
      context: { publicReportSubmit: true },
      req,
    })

    try {
      await writeAuditEvent(payload, {
        req,
        actorId: null,
        action: 'report_received',
        entityType: 'user-reports',
        entityId: created.id,
        transactionId: tx.id,
        summary: 'بلاغ مواطن جديد',
        metadata: { toState: 'open' },
      })
    } catch {
      // Report already stored — audit failure must not fail citizen submit.
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      code: 'unavailable',
      message: 'تعذّر إرسال البلاغ حالياً. حاول مرة ثانية بعد قليل.',
    }
  }
}

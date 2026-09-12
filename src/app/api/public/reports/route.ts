import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@payload-config'
import { getServerEnv } from '@/lib/env'
import { clientIpFromHeaders, hashReportIdentity } from '@/lib/reports/identity-hash'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { validatePublicReportSubmit } from '@/lib/reports/validate-submit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function json(
  body: Record<string, unknown>,
  status: number,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, { status, headers })
}

/**
 * Phase 10 — public changed-information report submission.
 * Anonymous POST only. No public reads. No attachments.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(
      { ok: false, code: 'validation', message: 'طلب غير صالح.' },
      400,
    )
  }

  // Reject multipart / attachment attempts by content-type check.
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    return json(
      { ok: false, code: 'validation', message: 'لا يُسمح بالمرفقات.' },
      400,
    )
  }

  const validated = validatePublicReportSubmit(body)
  if (!validated.ok) {
    return json(
      {
        ok: false,
        code: 'validation',
        message: validated.message,
        fields: validated.fields,
      },
      400,
    )
  }

  try {
    const env = getServerEnv()
    const payload = await getPayload({ config })
    const identityHash = hashReportIdentity({
      secret: env.PAYLOAD_SECRET,
      ip: clientIpFromHeaders(request.headers),
      userAgent: request.headers.get('user-agent'),
    })

    const result = await submitPublicUserReport({
      payload,
      data: validated.data,
      identityHash,
    })

    if (!result.ok) {
      if (result.code === 'rate_limited') {
        return json(
          { ok: false, code: 'rate_limited', message: result.message },
          429,
          result.retryAfterSec
            ? { 'Retry-After': String(result.retryAfterSec) }
            : undefined,
        )
      }
      if (result.code === 'not_found') {
        return json({ ok: false, code: 'not_found', message: result.message }, 404)
      }
      return json({ ok: false, code: 'unavailable', message: result.message }, 503)
    }

    // Success — do not return internal report IDs.
    return json(
      {
        ok: true,
        message: 'شكراً لك. استلمنا بلاغك وسيراجعه فريق ورقة.',
      },
      201,
    )
  } catch {
    return json(
      {
        ok: false,
        code: 'unavailable',
        message: 'تعذّر إرسال البلاغ حالياً. حاول مرة ثانية بعد قليل.',
      },
      503,
    )
  }
}

/** Disallow enumeration / accidental GETs. */
export async function GET(): Promise<NextResponse> {
  return json({ ok: false, message: 'غير متاح.' }, 405)
}

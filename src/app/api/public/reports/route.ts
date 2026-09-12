import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@payload-config'
import { getServerEnv } from '@/lib/env'
import { hashReportIdentity, trustedClientIpFromHeaders } from '@/lib/reports/identity-hash'
import {
  contentLengthExceedsLimit,
  isJsonContentType,
  isMultipartContentType,
} from '@/lib/reports/request-guards'
import { submitPublicUserReport } from '@/lib/reports/submit'
import { REPORT_LIMITS } from '@/lib/reports/types'
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
 *
 * Rate limit: IP-derived HMAC bucket (User-Agent excluded). Requires a
 * trustworthy proxy IP (Vercel x-forwarded-for / x-real-ip); otherwise 503.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') || ''

  if (isMultipartContentType(contentType)) {
    return json(
      { ok: false, code: 'validation', message: 'لا يُسمح بالمرفقات.' },
      400,
    )
  }

  if (!isJsonContentType(contentType)) {
    return json(
      { ok: false, code: 'validation', message: 'يُقبل JSON فقط.' },
      415,
    )
  }

  const lengthCheck = contentLengthExceedsLimit(request.headers.get('content-length'))
  if (lengthCheck === 'invalid') {
    return json({ ok: false, code: 'validation', message: 'طلب غير صالح.' }, 400)
  }
  if (lengthCheck === 'too_large') {
    return json(
      { ok: false, code: 'validation', message: 'الطلب كبير جداً.' },
      413,
    )
  }

  let rawText: string
  try {
    rawText = await request.text()
  } catch {
    return json({ ok: false, code: 'validation', message: 'طلب غير صالح.' }, 400)
  }

  if (rawText.length > REPORT_LIMITS.maxRequestBytes) {
    return json(
      { ok: false, code: 'validation', message: 'الطلب كبير جداً.' },
      413,
    )
  }

  let body: unknown
  try {
    body = JSON.parse(rawText) as unknown
  } catch {
    return json({ ok: false, code: 'validation', message: 'طلب غير صالح.' }, 400)
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
    const trusted = trustedClientIpFromHeaders(request.headers)
    if (!trusted.ok) {
      return json(
        {
          ok: false,
          code: 'unavailable',
          message: 'تعذّر إرسال البلاغ حالياً. حاول مرة ثانية بعد قليل.',
        },
        503,
      )
    }

    const identityHash = hashReportIdentity({
      secret: env.PAYLOAD_SECRET,
      ip: trusted.ip,
    })

    const payload = await getPayload({ config })
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
      if (result.code === 'validation') {
        return json(
          {
            ok: false,
            code: 'validation',
            message: result.message,
            fields: result.fields,
          },
          400,
        )
      }
      return json({ ok: false, code: 'unavailable', message: result.message }, 503)
    }

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

export async function GET(): Promise<NextResponse> {
  return json({ ok: false, message: 'غير متاح.' }, 405)
}

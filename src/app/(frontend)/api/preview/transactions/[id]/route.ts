import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@payload-config'
import { hasActiveRole, type UserLike } from '@/access/roles'
import { getServerEnv } from '@/lib/env'
import { signPreviewToken } from '@/lib/workflow/preview-token'

/** Issue a short-lived preview token for an authenticated editorial user. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const headerList = await getHeaders()
  const { user } = await payload.auth({ headers: headerList })

  if (!user || !hasActiveRole(user as UserLike, 'admin', 'reviewer', 'researcher')) {
    return NextResponse.json(
      { message: user ? 'غير مصرّح.' : 'يجب تسجيل الدخول.' },
      { status: user ? 403 : 401 },
    )
  }

  const env = getServerEnv()
  const secret = env.PREVIEW_SECRET || env.PAYLOAD_SECRET
  const token = signPreviewToken(secret, {
    id,
    uid: String(user.id),
    ttlSeconds: 900,
  })

  return NextResponse.json({
    token,
    url: `/preview/transactions/${id}?token=${encodeURIComponent(token)}`,
    expiresInSeconds: 900,
  })
}

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getServerEnv } from '@/lib/env'
import config from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HealthBody = {
  status: 'ok' | 'error'
  database: 'ok' | 'error'
}

export async function GET(): Promise<NextResponse<HealthBody>> {
  try {
    getServerEnv()

    const payload = await getPayload({ config })
    // Lightweight connectivity check without exposing internals.
    await payload.find({
      collection: 'users',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    return NextResponse.json(
      { status: 'ok', database: 'ok' },
      { status: 200 },
    )
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'error' },
      { status: 503 },
    )
  }
}

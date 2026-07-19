import { createHmac, timingSafeEqual } from 'node:crypto'

export type PreviewTokenPayload = {
  id: string
  uid: string
  exp: number
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64url')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

export function signPreviewToken(
  secret: string,
  payload: Omit<PreviewTokenPayload, 'exp'> & { ttlSeconds?: number },
): string {
  const exp = Math.floor(Date.now() / 1000) + (payload.ttlSeconds ?? 900)
  const body: PreviewTokenPayload = { id: String(payload.id), uid: String(payload.uid), exp }
  const data = b64url(JSON.stringify(body))
  const sig = createHmac('sha256', secret).update(data).digest()
  return `${data}.${b64url(sig)}`
}

export function verifyPreviewToken(
  secret: string,
  token: string,
  opts?: { nowSeconds?: number },
): PreviewTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expected = createHmac('sha256', secret).update(data).digest()
  let got: Buffer
  try {
    got = fromB64url(sig)
  } catch {
    return null
  }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null
  try {
    const body = JSON.parse(fromB64url(data).toString('utf8')) as PreviewTokenPayload
    const now = opts?.nowSeconds ?? Math.floor(Date.now() / 1000)
    if (!body.id || !body.uid || typeof body.exp !== 'number') return null
    if (body.exp < now) return null
    return body
  } catch {
    return null
  }
}

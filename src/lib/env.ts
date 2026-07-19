import { z } from 'zod'

/**
 * Server-only environment contract (Phase 1).
 * Never import this module from Client Components.
 */

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_DIRECT: z.string().min(1, 'DATABASE_URL_DIRECT is required'),
  PAYLOAD_SECRET: z
    .string()
    .min(32, 'PAYLOAD_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_SERVER_URL: z.string().url('NEXT_PUBLIC_SERVER_URL must be a valid URL'),
  /** Server-only signed draft preview tokens (Phase 4). */
  PREVIEW_SECRET: z
    .string()
    .min(32, 'PREVIEW_SECRET must be at least 32 characters')
    .optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | null = null

export function resetServerEnvCacheForTests(): void {
  cached = null
}

export function getServerEnv(): ServerEnv {
  if (cached) {
    return cached
  }

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    PREVIEW_SECRET: process.env.PREVIEW_SECRET || undefined,
  })

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid server environment: ${details}`)
  }

  cached = parsed.data
  return cached
}

export function getPublicEnv(): { NEXT_PUBLIC_SERVER_URL: string } {
  const url = process.env.NEXT_PUBLIC_SERVER_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_SERVER_URL is required')
  }
  return { NEXT_PUBLIC_SERVER_URL: url }
}

import { z } from 'zod'

import {
  looksLikeUnsafeMarkup,
  sanitizeMessage,
  sanitizeOptionalContactEmail,
  sanitizeOptionalContactPhone,
  sanitizeOptionalSourceUrl,
  sanitizePlainText,
} from './sanitize'
import { REPORT_LIMITS, REPORT_SECTIONS, type ReportSection } from './types'

const emailSchema = z
  .string()
  .max(REPORT_LIMITS.contactEmailMax)
  .email('البريد الإلكتروني غير صالح.')
  .optional()
  .or(z.literal(''))

export const publicReportSubmitSchema = z.object({
  transactionSlug: z
    .string()
    .trim()
    .min(1, 'المعاملة مطلوبة.')
    .max(160, 'معرّف المعاملة غير صالح.'),
  section: z.enum(REPORT_SECTIONS),
  message: z
    .string()
    .min(1, 'اكتب ما يبدو غير صحيح.')
    .max(REPORT_LIMITS.messageMax + 200),
  encountered: z
    .string()
    .min(1, 'اكتب ما واجهته.')
    .max(REPORT_LIMITS.encounteredMax + 200),
  /** Optional — numeric id or empty; validated against transaction centers server-side. */
  serviceCenterId: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/), z.literal(''), z.null()])
    .optional(),
  sourceUrl: z.string().max(REPORT_LIMITS.sourceUrlMax + 50).optional().or(z.literal('')),
  contactEmail: emailSchema,
  contactPhone: z
    .string()
    .max(REPORT_LIMITS.contactPhoneMax + 20)
    .optional()
    .or(z.literal('')),
  consent: z.literal(true),
  /** Honeypot — must be empty for humans. */
  website: z.string().max(200).optional().or(z.literal('')),
})

export type ValidatedPublicReport = {
  transactionSlug: string
  section: ReportSection
  message: string
  encountered: string
  serviceCenterId: number | null
  sourceUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  consent: true
  honeypotTriggered: boolean
}

export type ReportValidationFailure = {
  ok: false
  code: 'validation'
  message: string
  fields?: Record<string, string>
}

export type ReportValidationSuccess = {
  ok: true
  data: ValidatedPublicReport
}

function parseOptionalCenterId(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export function validatePublicReportSubmit(
  body: unknown,
): ReportValidationSuccess | ReportValidationFailure {
  const parsed = publicReportSubmitSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !fields[key]) {
        fields[key] = issue.message
      }
    }
    return {
      ok: false,
      code: 'validation',
      message: 'تحقق من الحقول المطلوبة ثم أعد المحاولة.',
      fields,
    }
  }

  const raw = parsed.data
  const honeypot = sanitizePlainText(raw.website ?? '', 200)
  if (honeypot.length > 0) {
    return {
      ok: true,
      data: {
        transactionSlug: raw.transactionSlug.trim(),
        section: raw.section,
        message: '',
        encountered: '',
        serviceCenterId: null,
        sourceUrl: null,
        contactEmail: null,
        contactPhone: null,
        consent: true,
        honeypotTriggered: true,
      },
    }
  }

  for (const [field, value] of [
    ['message', raw.message],
    ['encountered', raw.encountered],
  ] as const) {
    if (looksLikeUnsafeMarkup(value)) {
      return {
        ok: false,
        code: 'validation',
        message: 'النص يجب أن يكون نصاً عادياً بدون تنسيق HTML.',
        fields: { [field]: 'أزل الوسوم أو الروابط البرمجية من النص.' },
      }
    }
  }

  const message = sanitizeMessage(raw.message)
  if (message.length < REPORT_LIMITS.messageMin) {
    return {
      ok: false,
      code: 'validation',
      message: 'وصف المعلومة قصير جداً.',
      fields: { message: `اكتب على الأقل ${REPORT_LIMITS.messageMin} حرفاً.` },
    }
  }

  const encountered = sanitizePlainText(raw.encountered, REPORT_LIMITS.encounteredMax)
  if (encountered.length < REPORT_LIMITS.encounteredMin) {
    return {
      ok: false,
      code: 'validation',
      message: 'وصف ما واجهته قصير جداً.',
      fields: { encountered: `اكتب على الأقل ${REPORT_LIMITS.encounteredMin} حرفاً.` },
    }
  }

  const contactEmail = sanitizeOptionalContactEmail(raw.contactEmail)
  if (raw.contactEmail && raw.contactEmail.trim() && !contactEmail) {
    return {
      ok: false,
      code: 'validation',
      message: 'البريد الإلكتروني غير صالح.',
      fields: { contactEmail: 'البريد الإلكتروني غير صالح.' },
    }
  }
  if (contactEmail) {
    const emailCheck = z.string().email().safeParse(contactEmail)
    if (!emailCheck.success) {
      return {
        ok: false,
        code: 'validation',
        message: 'البريد الإلكتروني غير صالح.',
        fields: { contactEmail: 'البريد الإلكتروني غير صالح.' },
      }
    }
  }

  const contactPhone = sanitizeOptionalContactPhone(raw.contactPhone)
  const sourceUrlRaw = typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : ''
  let sourceUrl: string | null = null
  if (sourceUrlRaw) {
    sourceUrl = sanitizeOptionalSourceUrl(sourceUrlRaw)
    if (!sourceUrl) {
      return {
        ok: false,
        code: 'validation',
        message: 'رابط المصدر غير صالح.',
        fields: { sourceUrl: 'استخدم رابط http أو https فقط.' },
      }
    }
  }

  const serviceCenterId = parseOptionalCenterId(raw.serviceCenterId)
  if (
    raw.serviceCenterId != null &&
    raw.serviceCenterId !== '' &&
    serviceCenterId == null
  ) {
    return {
      ok: false,
      code: 'validation',
      message: 'مركز الخدمة غير صالح.',
      fields: { serviceCenterId: 'اختر مركزاً من قائمة المعاملة فقط.' },
    }
  }

  return {
    ok: true,
    data: {
      transactionSlug: raw.transactionSlug.trim(),
      section: raw.section,
      message,
      encountered,
      serviceCenterId,
      sourceUrl,
      contactEmail,
      contactPhone,
      consent: true,
      honeypotTriggered: false,
    },
  }
}

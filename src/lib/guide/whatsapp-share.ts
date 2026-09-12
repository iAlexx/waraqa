/**
 * P9-D — client-side WhatsApp share for a personalized guide result.
 * Pure helpers only: no DOM, no localStorage, no answer serialization.
 */

import { DEMO_PUBLIC_LABEL_AR } from '@/lib/content-class/types'
import { sanitizePublicHttpUrl } from '@/lib/public/safe-url'

/** Raw Arabic message length before URL encoding (WhatsApp query-friendly). */
export const WHATSAPP_SHARE_MAX_RAW_CHARS = 1500

export const WHATSAPP_SHARE_BUTTON_LABEL_AR = 'مشاركة عبر واتساب'

export const WHATSAPP_SHARE_INTRO_AR = 'هاي قائمة معاملتي من ورقة:'

export const WHATSAPP_SHARE_DOCS_HEADING_AR = 'الأوراق المطلوبة:'

export const WHATSAPP_SHARE_STEPS_HEADING_AR = 'الخطوات:'

export const WHATSAPP_SHARE_NOTICE_HEADING_AR = 'ملاحظة مهمة:'

export const WHATSAPP_SHARE_VERIFIED_LABEL_AR = 'آخر تحقق:'

export const WHATSAPP_SHARE_DETAILS_LABEL_AR = 'التفاصيل والمصدر:'

export const WHATSAPP_SHARE_MORE_ON_WARAQA_AR = 'شوف باقي التفاصيل على ورقة:'

export const WHATSAPP_SHARE_DISCLAIMER_AR =
  'ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.'

const DEFAULT_MAX_DOCUMENTS = 8
const DEFAULT_MAX_STEPS = 6

export type WhatsAppShareListItem = {
  title: string
}

export type WhatsAppShareNoticeItem = {
  title: string
  body?: string | null
  severity?: string | null
}

export type WhatsAppShareInput = {
  title: string
  /** Public relative path only, e.g. `/transactions/slug` — never answers. */
  detailHref: string
  /** Canonical site origin from `NEXT_PUBLIC_SERVER_URL`. */
  siteOrigin: string | null | undefined
  documents: WhatsAppShareListItem[]
  steps: WhatsAppShareListItem[]
  notices?: WhatsAppShareNoticeItem[]
  lastReviewedLabel?: string | null
  demoLabeled?: boolean
  maxDocumentItems?: number
  maxStepItems?: number
  maxRawChars?: number
}

export type WhatsAppShareOk = {
  ok: true
  message: string
  whatsappUrl: string
  publicUrl: string
}

export type WhatsAppShareFail = {
  ok: false
  reason: 'missing_title' | 'unsafe_url' | 'message_too_long'
}

export type WhatsAppShareResult = WhatsAppShareOk | WhatsAppShareFail

function normalizeTitle(title: string): string | null {
  const t = title.trim()
  return t.length > 0 ? t : null
}

/**
 * Absolute public transaction detail URL. Fail closed on missing/invalid origin
 * or unsafe relative path (no query/hash, http(s) only).
 */
export function resolvePublicTransactionAbsoluteUrl(
  siteOrigin: string | null | undefined,
  detailHref: string,
): string | null {
  if (typeof detailHref !== 'string') return null
  const path = detailHref.trim()
  if (!path.startsWith('/transactions/')) return null
  if (path.includes('?') || path.includes('#') || path.includes('//')) return null
  if (path.length > 512) return null

  const originRaw = typeof siteOrigin === 'string' ? siteOrigin.trim() : ''
  if (!originRaw) return null
  const origin = sanitizePublicHttpUrl(originRaw.replace(/\/+$/, ''))
  if (!origin) return null

  try {
    const base = new URL(origin)
    const absolute = new URL(path, base)
    if (absolute.origin !== base.origin) return null
    if (absolute.search || absolute.hash) return null
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return null
    return absolute.toString()
  } catch {
    return null
  }
}

function numberedList(items: string[]): string {
  return items.map((title, i) => `${i + 1}. ${title}`).join('\n')
}

function pickCriticalNotice(notices: WhatsAppShareNoticeItem[] | undefined): string | null {
  if (!notices || notices.length < 1) return null
  const warning =
    notices.find((n) => n.severity === 'warning' && n.title.trim()) ??
    notices.find((n) => n.title.trim())
  if (!warning) return null
  const title = warning.title.trim()
  const body = typeof warning.body === 'string' ? warning.body.trim() : ''
  // Keep notice short — title only unless body is tiny.
  if (body && body.length <= 80 && !body.includes('\n')) {
    return `${title} — ${body}`
  }
  return title
}

function joinSections(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join('\n\n')
}

function buildMessageParts(params: {
  title: string
  publicUrl: string
  documentTitles: string[]
  stepTitles: string[]
  noticeLine: string | null
  lastReviewedLabel: string | null
  demoLabeled: boolean
  truncated: boolean
}): string {
  const docsBlock =
    params.documentTitles.length > 0
      ? `${WHATSAPP_SHARE_DOCS_HEADING_AR}\n${numberedList(params.documentTitles)}`
      : null
  const stepsBlock =
    params.stepTitles.length > 0
      ? `${WHATSAPP_SHARE_STEPS_HEADING_AR}\n${numberedList(params.stepTitles)}`
      : null
  const noticeBlock = params.noticeLine
    ? `${WHATSAPP_SHARE_NOTICE_HEADING_AR}\n${params.noticeLine}`
    : null
  const verified =
    params.lastReviewedLabel && params.lastReviewedLabel.trim()
      ? `${WHATSAPP_SHARE_VERIFIED_LABEL_AR} ${params.lastReviewedLabel.trim()}`
      : null

  return joinSections([
    WHATSAPP_SHARE_INTRO_AR,
    params.demoLabeled ? DEMO_PUBLIC_LABEL_AR : null,
    `المعاملة: ${params.title}`,
    docsBlock,
    stepsBlock,
    noticeBlock,
    verified,
    params.truncated ? WHATSAPP_SHARE_MORE_ON_WARAQA_AR : null,
    `${WHATSAPP_SHARE_DETAILS_LABEL_AR}\n${params.publicUrl}`,
    WHATSAPP_SHARE_DISCLAIMER_AR,
  ])
}

/**
 * Build a WhatsApp `wa.me` share URL from a successful public guide result.
 * Does not accept answers, checklist state, or internal keys.
 */
export function buildWhatsAppShare(input: WhatsAppShareInput): WhatsAppShareResult {
  const title = normalizeTitle(input.title)
  if (!title) return { ok: false, reason: 'missing_title' }

  const publicUrl = resolvePublicTransactionAbsoluteUrl(input.siteOrigin, input.detailHref)
  if (!publicUrl) return { ok: false, reason: 'unsafe_url' }

  const maxDocs = input.maxDocumentItems ?? DEFAULT_MAX_DOCUMENTS
  const maxSteps = input.maxStepItems ?? DEFAULT_MAX_STEPS
  const maxRaw = input.maxRawChars ?? WHATSAPP_SHARE_MAX_RAW_CHARS

  const allDocs = input.documents
    .map((d) => d.title.trim())
    .filter((t) => t.length > 0)
    .slice(0, Math.max(0, maxDocs))
  const allSteps = input.steps
    .map((s) => s.title.trim())
    .filter((t) => t.length > 0)
    .slice(0, Math.max(0, maxSteps))

  const noticeLine = pickCriticalNotice(input.notices)
  const lastReviewedLabel =
    typeof input.lastReviewedLabel === 'string' && input.lastReviewedLabel.trim()
      ? input.lastReviewedLabel.trim()
      : null
  const demoLabeled = Boolean(input.demoLabeled)

  let documentTitles = [...allDocs]
  let stepTitles = [...allSteps]
  let includeNotice = Boolean(noticeLine)
  let truncated =
    allDocs.length <
      input.documents.map((d) => d.title.trim()).filter(Boolean).length ||
    allSteps.length < input.steps.map((s) => s.title.trim()).filter(Boolean).length

  const assemble = () =>
    buildMessageParts({
      title,
      publicUrl,
      documentTitles,
      stepTitles,
      noticeLine: includeNotice ? noticeLine : null,
      lastReviewedLabel,
      demoLabeled,
      truncated,
    })

  let message = assemble()

  // Shrink by item boundaries until under the raw length budget.
  while (message.length > maxRaw) {
    if (stepTitles.length > 0) {
      stepTitles = stepTitles.slice(0, -1)
      truncated = true
      message = assemble()
      continue
    }
    if (includeNotice) {
      includeNotice = false
      truncated = true
      message = assemble()
      continue
    }
    if (documentTitles.length > 1) {
      documentTitles = documentTitles.slice(0, -1)
      truncated = true
      message = assemble()
      continue
    }
    if (documentTitles.length === 1) {
      documentTitles = []
      truncated = true
      message = assemble()
      continue
    }
    // Last resort: drop verification line by rebuilding without it once.
    if (lastReviewedLabel) {
      message = buildMessageParts({
        title,
        publicUrl,
        documentTitles: [],
        stepTitles: [],
        noticeLine: null,
        lastReviewedLabel: null,
        demoLabeled,
        truncated: true,
      })
      if (message.length <= maxRaw) break
    }
    // Absolute floor: title + URL + disclaimer (+ demo). If still too long, fail closed
    // only if title alone blows the budget (extremely long CMS title).
    message = buildMessageParts({
      title,
      publicUrl,
      documentTitles: [],
      stepTitles: [],
      noticeLine: null,
      lastReviewedLabel: null,
      demoLabeled,
      truncated: true,
    })
    if (message.length > maxRaw) {
      // Soft-trim title at a word/space boundary without cutting the URL/disclaimer.
      const maxTitle = Math.max(24, maxRaw - (message.length - title.length) - 1)
      const soft =
        title.length > maxTitle
          ? `${title.slice(0, maxTitle).replace(/\s+\S*$/, '').trimEnd()}…`
          : title
      message = buildMessageParts({
        title: soft || title.slice(0, maxTitle),
        publicUrl,
        documentTitles: [],
        stepTitles: [],
        noticeLine: null,
        lastReviewedLabel: null,
        demoLabeled,
        truncated: true,
      })
    }
    break
  }

  // Guarantee URL + disclaimer survive.
  if (!message.includes(publicUrl) || !message.includes(WHATSAPP_SHARE_DISCLAIMER_AR)) {
    return { ok: false, reason: 'unsafe_url' }
  }
  if (message.length > maxRaw) {
    return { ok: false, reason: 'message_too_long' }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

  return {
    ok: true,
    message,
    whatsappUrl,
    publicUrl,
  }
}

/** Decode the `text` query from a WhatsApp share href (tests / QA). */
export function decodeWhatsAppShareText(whatsappUrl: string): string | null {
  try {
    const u = new URL(whatsappUrl)
    if (u.protocol !== 'https:' || u.hostname !== 'wa.me') return null
    const text = u.searchParams.get('text')
    return text
  } catch {
    return null
  }
}

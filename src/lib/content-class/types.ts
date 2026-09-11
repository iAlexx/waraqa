/**
 * P0-06 — explicit content isolation classes.
 * Independent of verification / claimTrustOk / publication status.
 */
export const CONTENT_CLASSES = ['PRODUCTION', 'DEMO', 'QA_TEST'] as const
export type ContentClass = (typeof CONTENT_CLASSES)[number]

export const CONTENT_CLASS_LABELS_AR: Record<ContentClass, string> = {
  PRODUCTION: 'إنتاج',
  DEMO: 'عرض تجريبي',
  QA_TEST: 'اختبار QA',
}

/** Visible public demo marker (Arabic). */
export const DEMO_PUBLIC_LABEL_AR = 'بيانات تجريبية للعرض — ليست معلومات رسمية'

export function isContentClass(value: unknown): value is ContentClass {
  return typeof value === 'string' && (CONTENT_CLASSES as readonly string[]).includes(value)
}

/** Fail-closed: missing/unknown → treat as QA_TEST (never public). */
export function normalizeContentClass(value: unknown): ContentClass {
  if (isContentClass(value)) return value
  return 'QA_TEST'
}

export const contentClassFieldOptions = CONTENT_CLASSES.map((value) => ({
  label: CONTENT_CLASS_LABELS_AR[value],
  value,
}))

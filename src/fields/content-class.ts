import type { Field } from 'payload'

import { contentClassFieldOptions } from '@/lib/content-class/types'

/** Shared contentClass select for Transactions / Claims / Sources (P0-06). */
export function contentClassField(overrides?: Partial<Field>): Field {
  return {
    name: 'contentClass',
    type: 'select',
    label: 'تصنيف المحتوى',
    required: true,
    defaultValue: 'QA_TEST',
    localized: false,
    index: true,
    enumName: 'content_class',
    options: contentClassFieldOptions,
    admin: {
      position: 'sidebar',
      description:
        'عزل المحتوى: إنتاج / عرض تجريبي / اختبار. مستقل عن التوثيق وclaimTrustOk. الافتراضي: اختبار QA. الترقية إلى إنتاج للمراجع/المدير فقط.',
      components: {
        Cell: '/components/admin/ContentClassCell#ContentClassCell',
      },
    },
    ...overrides,
  } as Field
}

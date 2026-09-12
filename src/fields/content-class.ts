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
        'عزل المحتوى — لا يثبت صحة المعلومة ولا يغني عن توثيق الادعاءات. PRODUCTION: للمحتوى العام المعتمد (ليس تحققاً تلقائياً). DEMO: يظهر بتحذير واضح. QA_TEST: لا يظهر للعامة أبداً. مستقل عن claimTrustOk وعن حالة التحرير. الترقية إلى PRODUCTION للمراجع/المدير فقط.',
      components: {
        Cell: '/components/admin/ContentClassCell#ContentClassCell',
      },
    },
    ...overrides,
  } as Field
}

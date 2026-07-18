import type { CollectionConfig } from 'payload'

import {
  adminOnlyDelete,
  canEditContent,
  contentUpdateAccess,
  publicPublishedRead,
} from '@/access'
import {
  activeField,
  auditFields,
  canonicalSlugField,
  localizedText,
  localizedTextarea,
} from '@/fields/common'
import { enforcePublishAuthorization, populateAuditFields } from '@/hooks/content'
import { GOVERNORATES } from '@/lib/governorates'

export const ServiceCenters: CollectionConfig = {
  slug: 'service-centers',
  dbName: 'svc_centers',
  labels: {
    singular: 'مركز خدمة',
    plural: 'مراكز الخدمة',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'agency', 'governorate', 'active', 'updatedAt'],
    group: 'المحتوى',
  },
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },
  access: {
    read: publicPublishedRead,
    create: canEditContent,
    update: contentUpdateAccess,
    delete: adminOnlyDelete,
  },
  hooks: {
    beforeChange: [enforcePublishAuthorization, populateAuditFields],
  },
  fields: [
    localizedText('name', 'الاسم', { required: true }),
    canonicalSlugField(),
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      label: 'الجهة',
      required: true,
      index: true,
      localized: false,
    },
    {
      name: 'governorate',
      dbName: 'gov',
      type: 'select',
      label: 'المحافظة',
      required: true,
      localized: false,
      options: [...GOVERNORATES],
      admin: {
        description: 'قائمة ثابتة — لا يُستنتج موقع المستخدم تلقائياً.',
      },
    },
    localizedText('city', 'المدينة', { required: true }),
    localizedTextarea('address', 'العنوان', { required: true }),
    {
      name: 'phones',
      type: 'array',
      label: 'أرقام الهاتف',
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'الرقم',
          required: true,
          localized: false,
        },
      ],
    },
    localizedTextarea('workingHours', 'ساعات العمل'),
    localizedTextarea('accessibilityNotes', 'ملاحظات إمكانية الوصول'),
    {
      name: 'latitude',
      type: 'number',
      label: 'خط العرض',
      localized: false,
      min: -90,
      max: 90,
      validate: (value: unknown) => {
        if (value == null || value === '') return true
        const n = Number(value)
        if (Number.isNaN(n) || n < -90 || n > 90) {
          return 'خط العرض يجب أن يكون بين -90 و 90.'
        }
        return true
      },
    },
    {
      name: 'longitude',
      type: 'number',
      label: 'خط الطول',
      localized: false,
      min: -180,
      max: 180,
      validate: (value: unknown) => {
        if (value == null || value === '') return true
        const n = Number(value)
        if (Number.isNaN(n) || n < -180 || n > 180) {
          return 'خط الطول يجب أن يكون بين -180 و 180.'
        }
        return true
      },
    },
    activeField(),
    ...auditFields(),
  ],
}

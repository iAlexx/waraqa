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
  officialUrlField,
} from '@/fields/common'
import { enforcePublishAuthorization, populateAuditFields } from '@/hooks/content'

export const Agencies: CollectionConfig = {
  slug: 'agencies',
  labels: {
    singular: 'جهة',
    plural: 'الجهات',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'active', 'updatedAt'],
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
    localizedText('shortName', 'الاسم المختصر'),
    canonicalSlugField(),
    {
      name: 'type',
      type: 'select',
      label: 'النوع',
      required: true,
      localized: false,
      options: [
        { label: 'وزارة', value: 'ministry' },
        { label: 'مديرية', value: 'directorate' },
        { label: 'مؤسسة عامة', value: 'public_institution' },
        { label: 'بلدية', value: 'municipality' },
        { label: 'نقابة', value: 'syndicate' },
        { label: 'جامعة', value: 'university' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    localizedTextarea('description', 'الوصف'),
    officialUrlField('officialWebsite', 'الموقع الرسمي'),
    {
      name: 'contactEmail',
      type: 'email',
      label: 'البريد للتواصل',
      localized: false,
    },
    {
      name: 'phones',
      type: 'array',
      label: 'أرقام الهاتف',
      labels: { singular: 'رقم', plural: 'أرقام' },
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
    localizedTextarea('mainAddress', 'العنوان الرئيسي'),
    activeField(),
    ...auditFields(),
  ],
}

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

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: {
    singular: 'وثيقة',
    plural: 'الوثائق',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'documentType', 'active', 'updatedAt'],
    group: 'المحتوى',
    description: 'وثائق يحتاجها المواطن للمعاملات — ليست ملفات مرفوعة.',
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
      name: 'aliases',
      type: 'array',
      label: 'أسماء بديلة',
      fields: [localizedText('value', 'القيمة', { required: true })],
    },
    localizedTextarea('description', 'الوصف'),
    {
      name: 'documentType',
      dbName: 'dtype',
      type: 'select',
      label: 'نوع الوثيقة',
      localized: false,
      options: [
        { label: 'هوية', value: 'identity' },
        { label: 'سجل مدني', value: 'civil_record' },
        { label: 'طلب', value: 'application' },
        { label: 'صورة شخصية', value: 'photograph' },
        { label: 'إيصال', value: 'receipt' },
        { label: 'شهادة', value: 'certificate' },
        { label: 'موافقة', value: 'approval' },
        { label: 'عقد', value: 'contract' },
        { label: 'نموذج', value: 'form' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    localizedTextarea('validityNote', 'ملاحظة الصلاحية'),
    {
      name: 'reusable',
      type: 'checkbox',
      label: 'قابلة لإعادة الاستخدام',
      defaultValue: false,
      localized: false,
    },
    activeField(),
    ...auditFields(),
  ],
}

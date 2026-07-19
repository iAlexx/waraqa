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
  sortOrderField,
} from '@/fields/common'
import {
  enforcePublishAuthorization,
  populateAuditFields,
  preventSelfParent,
} from '@/hooks/content'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'تصنيف',
    plural: 'التصنيفات',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent', 'active', 'updatedAt'],
    group: 'المحتوى',
  },
  versions: {
    drafts: {
      autosave: false,
    },
    maxPerDoc: 20,
  },
  access: {
    read: publicPublishedRead,
    create: canEditContent,
    update: contentUpdateAccess,
    delete: adminOnlyDelete,
  },
  hooks: {
    beforeValidate: [preventSelfParent],
    beforeChange: [enforcePublishAuthorization, populateAuditFields],
  },
  fields: [
    localizedText('name', 'الاسم', { required: true }),
    canonicalSlugField(),
    localizedTextarea('description', 'الوصف'),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'التصنيف الأب',
      localized: false,
      admin: {
        components: {
          Cell: '/components/admin/ParentCategoryCell#ParentCategoryCell',
        },
        description: 'اتركه فارغاً إن لم يكن هناك تصنيف أب (يُعرض: بدون تصنيف أب).',
      },
    },
    sortOrderField(),
    {
      name: 'featured',
      type: 'checkbox',
      label: 'مميّز',
      defaultValue: false,
      localized: false,
      admin: { position: 'sidebar' },
    },
    activeField(),
    ...auditFields(),
  ],
}

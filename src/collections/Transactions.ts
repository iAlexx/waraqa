import type { CollectionConfig } from 'payload'

import {
  adminOnlyDelete,
  canEditContent,
  contentUpdateAccess,
  editorialFieldAccess,
  publicPublishedRead,
} from '@/access'
import {
  activeField,
  auditFields,
  canonicalSlugField,
  localizedText,
  localizedTextarea,
} from '@/fields/common'
import {
  enforcePublishAuthorization,
  populateAuditFields,
  preventSelfPrerequisite,
} from '@/hooks/content'
import { stripPrivateEditorialFields } from '@/hooks/public-strip'
import { validateProcedure } from '@/lib/procedure-validation'

/**
 * Central guidance collection.
 * Roadmap slug: `transactions` (Arabic: المعاملات).
 * Owner Phase 3 brief preferred `procedures` — documented conflict; roadmap wins.
 */
export const Transactions: CollectionConfig = {
  slug: 'transactions',
  dbName: 'tx',
  labels: {
    singular: 'معاملة',
    plural: 'المعاملات',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'category', 'agency', '_status', 'active', 'updatedAt'],
    group: 'المحتوى',
    description: 'المعاملات الإدارية — مجموعة Phase 3 المركزية (slug: transactions).',
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
    beforeValidate: [preventSelfPrerequisite, validateProcedure],
    beforeChange: [enforcePublishAuthorization, populateAuditFields],
    afterRead: [stripPrivateEditorialFields],
  },
  fields: [
    localizedText('title', 'العنوان', { required: true }),
    canonicalSlugField(),
    localizedTextarea('summary', 'الملخص', {
      required: true,
      admin: { description: 'ملخص قصير للعرض العام.' },
    }),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: 'التصنيف',
      required: true,
      index: true,
      localized: false,
    },
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
      name: 'serviceCenters',
      type: 'relationship',
      relationTo: 'service-centers',
      label: 'مراكز الخدمة',
      hasMany: true,
      localized: false,
    },
    {
      name: 'audiences',
      type: 'select',
      label: 'الجمهور',
      hasMany: true,
      localized: false,
      enumName: 'tx_audience',
      options: [
        { label: 'مواطن', value: 'citizen' },
        { label: 'مقيم', value: 'resident' },
        { label: 'طالب', value: 'student' },
        { label: 'موظف', value: 'employee' },
        { label: 'أعمال', value: 'business' },
        { label: 'زائر', value: 'visitor' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    localizedTextarea('eligibility', 'الأهلية'),
    {
      name: 'aliases',
      type: 'array',
      label: 'أسماء بديلة (للبحث لاحقاً)',
      fields: [localizedText('value', 'القيمة', { required: true })],
    },
    {
      name: 'requiredDocuments',
      dbName: 'req_docs',
      type: 'array',
      label: 'الوثائق المطلوبة',
      labels: { singular: 'وثيقة', plural: 'وثائق' },
      fields: [
        {
          name: 'document',
          type: 'relationship',
          relationTo: 'documents',
          label: 'الوثيقة',
          required: true,
          localized: false,
        },
        {
          name: 'requirementType',
          dbName: 'rtype',
          type: 'select',
          label: 'نوع المتطلب',
          required: true,
          localized: false,
          options: [
            { label: 'إلزامي', value: 'required' },
            { label: 'مشروط', value: 'conditional' },
            { label: 'بديل', value: 'alternative' },
          ],
        },
        localizedTextarea('condition', 'الشرط', {
          admin: { condition: (_, siblingData) => siblingData?.requirementType === 'conditional' },
        }),
        {
          name: 'quantity',
          type: 'number',
          label: 'الكمية',
          defaultValue: 1,
          min: 1,
          localized: false,
        },
        {
          name: 'originalRequired',
          type: 'checkbox',
          label: 'الأصل مطلوب',
          defaultValue: false,
          localized: false,
        },
        {
          name: 'copiesRequired',
          type: 'number',
          label: 'عدد النسخ',
          defaultValue: 0,
          min: 0,
          localized: false,
        },
        {
          name: 'certificationRequired',
          type: 'checkbox',
          label: 'تصديق مطلوب',
          defaultValue: false,
          localized: false,
        },
        localizedTextarea('notes', 'ملاحظات'),
      ],
    },
    {
      name: 'steps',
      dbName: 'steps',
      type: 'array',
      label: 'الخطوات',
      labels: { singular: 'خطوة', plural: 'خطوات' },
      required: true,
      minRows: 1,
      fields: [
        localizedText('title', 'عنوان الخطوة', { required: true }),
        localizedTextarea('description', 'وصف الخطوة', { required: true }),
        localizedText('locationNote', 'ملاحظة المكان'),
      ],
    },
    {
      name: 'fees',
      dbName: 'fees',
      type: 'array',
      label: 'الرسوم',
      fields: [
        localizedText('label', 'التسمية', { required: true }),
        {
          name: 'amount',
          type: 'number',
          label: 'المبلغ',
          min: 0,
          localized: false,
        },
        {
          name: 'currency',
          dbName: 'cur',
          type: 'select',
          label: 'العملة',
          localized: false,
          options: [
            { label: 'ل.س', value: 'SYP' },
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'أخرى', value: 'other' },
          ],
        },
        localizedText('amountText', 'نص المبلغ'),
        localizedTextarea('notes', 'ملاحظات'),
      ],
    },
    {
      name: 'estimatedDuration',
      type: 'group',
      label: 'المدة المتوقعة',
      fields: [
        {
          name: 'minimum',
          type: 'number',
          label: 'الحد الأدنى',
          min: 0,
          localized: false,
        },
        {
          name: 'maximum',
          type: 'number',
          label: 'الحد الأقصى',
          min: 0,
          localized: false,
        },
        {
          name: 'unit',
          dbName: 'unit',
          type: 'select',
          label: 'الوحدة',
          localized: false,
          options: [
            { label: 'دقائق', value: 'minutes' },
            { label: 'ساعات', value: 'hours' },
            { label: 'أيام عمل', value: 'business_days' },
            { label: 'أيام تقويمية', value: 'calendar_days' },
            { label: 'أسابيع', value: 'weeks' },
          ],
        },
        localizedText('note', 'ملاحظة'),
      ],
    },
    localizedTextarea('outcome', 'النتيجة'),
    {
      name: 'prerequisiteProcedures',
      type: 'relationship',
      relationTo: 'transactions',
      label: 'معاملات سابقة مطلوبة',
      hasMany: true,
      localized: false,
      filterOptions: ({ id }) => {
        if (!id) return true
        return { id: { not_equals: id } }
      },
    },
    {
      name: 'sources',
      dbName: 'srcs',
      type: 'array',
      label: 'المصادر',
      labels: { singular: 'مصدر', plural: 'مصادر' },
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'source',
          type: 'relationship',
          relationTo: 'sources',
          label: 'المصدر',
          required: true,
          localized: false,
        },
        {
          name: 'primary',
          type: 'checkbox',
          label: 'أساسي',
          defaultValue: false,
          localized: false,
        },
        localizedText('citationNote', 'ملاحظة الاقتباس'),
      ],
    },
    {
      name: 'lastReviewedAt',
      type: 'date',
      label: 'آخر مراجعة',
      localized: false,
      admin: {
        description: 'مطلوب قبل النشر.',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'ملاحظات داخلية',
      localized: false,
      access: {
        read: editorialFieldAccess,
        update: editorialFieldAccess,
      },
      admin: {
        description: 'لا تُعاد أبداً في طلبات REST العامة المجهولة.',
      },
    },
    activeField(),
    ...auditFields(),
  ],
}

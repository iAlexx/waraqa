import type { CollectionConfig } from 'payload'

import { canReviewContent, isAdmin } from '@/access'

/**
 * Immutable editorial audit log. Only server workflow code may create rows
 * (via overrideAccess + context.auditWrite).
 */
export const AuditEvents: CollectionConfig = {
  slug: 'audit-events',
  dbName: 'audit_ev',
  labels: {
    singular: 'حدث تدقيق',
    plural: 'أحداث التدقيق',
  },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['action', 'entityType', 'entityId', 'actor', 'createdAt'],
    group: 'النظام',
    description: 'سجل تدقيق غير قابل للتعديل — يُكتب من خادم سير العمل فقط.',
  },
  defaultSort: '-createdAt',
  access: {
    read: canReviewContent,
    create: () => false,
    update: () => false,
    delete: () => false,
    admin: ({ req: { user } }) => Boolean(user && isAdmin({ req: { user } } as never)),
  },
  fields: [
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      label: 'المنفّذ',
      localized: false,
      admin: {
        components: {
          Cell: '/components/admin/ActorCell#ActorCell',
        },
      },
    },
    {
      name: 'action',
      type: 'select',
      label: 'الإجراء',
      required: true,
      localized: false,
      enumName: 'audit_action',
      options: [
        { label: 'إنشاء مسودة', value: 'draft_created' },
        { label: 'إرسال للمراجعة', value: 'submitted_for_review' },
        { label: 'طلب تعديلات', value: 'changes_requested' },
        { label: 'إعادة إرسال', value: 'resubmitted_for_review' },
        { label: 'اعتماد', value: 'approved' },
        { label: 'إبطال اعتماد', value: 'approval_invalidated' },
        { label: 'نشر', value: 'published' },
        { label: 'إلغاء نشر', value: 'unpublished' },
        { label: 'أرشفة', value: 'archived' },
        { label: 'استعادة أرشيف', value: 'archive_restored' },
        { label: 'استعادة نسخة', value: 'revision_restored' },
        { label: 'تجاوز موعد مراجعة', value: 'review_date_overridden' },
        { label: 'وسم قديم', value: 'marked_outdated' },
        { label: 'بلاغ مواطن', value: 'report_received' },
        { label: 'مراجعة بلاغ', value: 'report_in_review' },
        { label: 'إغلاق بلاغ', value: 'report_resolved' },
        { label: 'رفض بلاغ', value: 'report_rejected' },
        { label: 'بلاغ مزعج', value: 'report_marked_spam' },
        { label: 'تغيير حالة بلاغ', value: 'report_status_changed' },
      ],
    },
    {
      name: 'entityType',
      type: 'text',
      label: 'نوع الكيان',
      required: true,
      localized: false,
      admin: {
        components: {
          Cell: '/components/admin/EntityTypeCell#EntityTypeCell',
        },
      },
    },
    {
      name: 'entityId',
      type: 'text',
      label: 'معرّف الكيان',
      required: true,
      localized: false,
      index: true,
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      label: 'المعاملة',
      localized: false,
    },
    {
      name: 'entityVersionId',
      type: 'text',
      label: 'معرّف النسخة',
      localized: false,
    },
    {
      name: 'summary',
      type: 'text',
      label: 'الملخص',
      required: true,
      localized: false,
      maxLength: 500,
    },
    {
      name: 'beforeReference',
      type: 'text',
      label: 'مرجع قبل',
      localized: false,
      admin: { readOnly: true },
    },
    {
      name: 'afterReference',
      type: 'text',
      label: 'مرجع بعد',
      localized: false,
      admin: { readOnly: true },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'بيانات وصفية آمنة',
      localized: false,
    },
  ],
  timestamps: true,
}

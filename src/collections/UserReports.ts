import type { CollectionConfig, FieldAccess } from 'payload'

import { canReviewContent, isAdmin } from '@/access'
import { hasActiveRole, type UserLike } from '@/access/roles'

import { enforceUserReportTriage } from '@/lib/reports/triage'
import { REPORT_SECTION_LABELS_AR, REPORT_STATUS_LABELS_AR } from '@/lib/reports/types'

const contactFieldAccess: FieldAccess = ({ req: { user } }) =>
  hasActiveRole(user as UserLike, 'admin', 'reviewer')

/**
 * Phase 10 — citizen changed-information reports.
 * Public create only via POST /api/public/reports (overrideAccess + context).
 * Never publicly readable. Contact fields are reviewer/admin only.
 *
 * Schema MVP note vs roadmap §14.13:
 * - `message` = what appears incorrect (required)
 * - `encountered` = what the citizen encountered (required)
 * - `reportedValue` / `suggestedValue` intentionally omitted — collapsed into
 *   message + encountered for a simpler Arabic form
 * - `assignedTo` Phase 11 — optional active admin/reviewer only; public cannot set
 * - `serviceCenter` optional; public submit only accepts centers linked to the
 *   target Transaction (server-validated)
 *
 * Hard delete: admin-only. Audit events are retained by entityId string after
 * deletion (immutable audit-events collection). Prefer terminal status over
 * delete for routine triage.
 */
export const UserReports: CollectionConfig = {
  slug: 'user-reports',
  dbName: 'usr_rpt',
  labels: {
    singular: 'بلاغ',
    plural: 'بلاغات المواطنين',
  },
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['transaction', 'section', 'status', 'assignedTo', 'createdAt', 'resolvedAt'],
    group: 'المحتوى',
    description:
      'بلاغات المواطنين عن معلومات تغيّرت — ليست محتوى عاماً. بيانات التواصل محمية للمراجع/المدير فقط. الحذف النهائي للمدير فقط؛ الأفضل إغلاق البلاغ بحالة نهائية.',
  },
  defaultSort: '-createdAt',
  access: {
    read: canReviewContent,
    create: () => false,
    update: canReviewContent,
    delete: isAdmin,
    admin: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin', 'reviewer'),
  },
  hooks: {
    // Audit for editorial status transitions is written inside enforceUserReportTriage
    // (before persist). Failures abort the update — no silent unlogged terminal state.
    beforeChange: [enforceUserReportTriage],
  },
  fields: [
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      label: 'المعاملة',
      required: true,
      index: true,
      localized: false,
      admin: {
        description:
          'المعاملة التي يخصّها البلاغ. الحذف النهائي للمعاملة مقيّد طالما توجد بلاغات مرتبطة (RESTRICT).',
      },
    },
    {
      name: 'section',
      type: 'select',
      label: 'القسم المعني',
      required: true,
      localized: false,
      enumName: 'usr_rpt_section',
      options: (
        Object.keys(REPORT_SECTION_LABELS_AR) as Array<keyof typeof REPORT_SECTION_LABELS_AR>
      ).map((value) => ({ label: REPORT_SECTION_LABELS_AR[value], value })),
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'ما المعلومة التي تبدو غير صحيحة؟',
      required: true,
      localized: false,
      maxLength: 2000,
      admin: {
        description: 'نص عادي من المواطن — لا يُعرض للعامة. (يعادل reportedValue في الخارطة المبسّطة)',
        readOnly: true,
      },
    },
    {
      name: 'encountered',
      type: 'textarea',
      label: 'ماذا واجهتَ على أرض الواقع؟',
      required: true,
      localized: false,
      maxLength: 2000,
      admin: {
        description: 'وصف ما واجهه المواطن — نص عادي.',
        readOnly: true,
      },
    },
    {
      name: 'serviceCenter',
      type: 'relationship',
      relationTo: 'service-centers',
      label: 'مركز الخدمة (اختياري)',
      localized: false,
      admin: {
        description: 'اختياري — يُقبل فقط إن كان مرتبطاً بالمعاملة عند الإرسال العام.',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      label: 'رابط مصدر (اختياري)',
      localized: false,
      maxLength: 500,
      admin: { readOnly: true },
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'بريد للتواصل (محمي)',
      localized: false,
      access: {
        read: contactFieldAccess,
        update: contactFieldAccess,
      },
      admin: {
        description: 'اختياري — للمتابعة بشأن البلاغ فقط. لا يُعرض للعامة.',
        readOnly: true,
      },
    },
    {
      name: 'contactPhone',
      type: 'text',
      label: 'هاتف للتواصل (محمي)',
      localized: false,
      maxLength: 40,
      access: {
        read: contactFieldAccess,
        update: contactFieldAccess,
      },
      admin: {
        description: 'اختياري — للمتابعة بشأن البلاغ فقط. لا يُعرض للعامة.',
        readOnly: true,
      },
    },
    {
      name: 'consentAccepted',
      type: 'checkbox',
      label: 'موافقة على معالجة البلاغ',
      required: true,
      defaultValue: false,
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'الحالة',
      required: true,
      defaultValue: 'open',
      localized: false,
      index: true,
      enumName: 'usr_rpt_status',
      options: (
        Object.keys(REPORT_STATUS_LABELS_AR) as Array<keyof typeof REPORT_STATUS_LABELS_AR>
      ).map((value) => ({ label: REPORT_STATUS_LABELS_AR[value], value })),
      admin: {
        position: 'sidebar',
        description: 'مفتوح → قيد المراجعة → تم الحل / مرفوض / مزعج.',
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: 'مُعيَّن إلى',
      localized: false,
      index: true,
      filterOptions: {
        and: [{ isActive: { equals: true } }, { role: { in: ['admin', 'reviewer'] } }],
      },
      admin: {
        position: 'sidebar',
        description:
          'اختياري — مدير أو مراجع نشط فقط. المواطن لا يتحكم بالتعيين. الباحث غير قابل للتعيين.',
      },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
      label: 'ملاحظات داخلية',
      localized: false,
      maxLength: 2000,
      admin: {
        description: 'ملاحظات الفريق — لا تُرسل للمواطن تلقائياً.',
      },
    },
    {
      name: 'resolutionSummary',
      type: 'textarea',
      label: 'ملخص الحل / سبب الرفض',
      localized: false,
      maxLength: 1000,
      admin: {
        description:
          'مطلوب عند الانتقال إلى تم الحل أو مرفوض. لا يُعاد ختمه عند تعديلات لاحقة في نفس الحالة المغلقة.',
      },
    },
    {
      name: 'lastResolutionSummary',
      type: 'textarea',
      label: 'آخر سبب إغلاق (محفوظ)',
      localized: false,
      maxLength: 1000,
      admin: {
        readOnly: true,
        description: 'يُحفظ عند الإغلاق ويبقى بعد إعادة الفتح — السجل التفصيلي في أحداث التدقيق.',
      },
    },
    {
      name: 'resolvedAt',
      type: 'date',
      label: 'تاريخ الإغلاق',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'resolvedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أُغلق بواسطة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}

import type { CollectionAfterChangeHook, CollectionConfig, FieldAccess } from 'payload'

import { canReviewContent, isAdmin } from '@/access'
import { hasActiveRole, type UserLike } from '@/access/roles'

import {
  enforceUserReportTriage,
  writeUserReportStatusAudit,
  relationId,
} from '@/lib/reports/triage'
import { REPORT_SECTION_LABELS_AR, REPORT_STATUS_LABELS_AR } from '@/lib/reports/types'

const contactFieldAccess: FieldAccess = ({ req: { user } }) =>
  hasActiveRole(user as UserLike, 'admin', 'reviewer')

const reportReadAccess = canReviewContent
const reportUpdateAccess = canReviewContent

/**
 * Phase 10 — citizen changed-information reports.
 * Public create only via POST /api/public/reports (overrideAccess + context).
 * Never publicly readable. Contact fields are reviewer/admin only.
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
    defaultColumns: ['transaction', 'section', 'status', 'createdAt', 'resolvedAt'],
    group: 'المحتوى',
    description:
      'بلاغات المواطنين عن معلومات تغيّرت — ليست محتوى عاماً. بيانات التواصل محمية للمراجع/المدير فقط.',
  },
  defaultSort: '-createdAt',
  access: {
    read: reportReadAccess,
    create: () => false,
    update: reportUpdateAccess,
    delete: isAdmin,
    admin: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin', 'reviewer'),
  },
  hooks: {
    beforeChange: [enforceUserReportTriage],
    afterChange: [
      (async ({ doc, previousDoc, operation, req, context }) => {
        if (context?.publicReportSubmit === true) return doc
        if (operation !== 'update') return doc
        const from = (previousDoc?.status as string) || 'open'
        const to = (doc?.status as string) || from
        if (from === to) return doc
        try {
          await writeUserReportStatusAudit({
            req,
            reportId: doc.id,
            transactionId: relationId(doc.transaction),
            fromStatus: from as never,
            toStatus: to as never,
            resolutionNote:
              typeof doc.resolutionSummary === 'string' ? doc.resolutionSummary : null,
          })
        } catch {
          /* non-fatal */
        }
        return doc
      }) satisfies CollectionAfterChangeHook,
    ],
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
        description: 'المعاملة التي يخصّها البلاغ.',
      },
    },
    {
      name: 'section',
      type: 'select',
      label: 'القسم المعني',
      required: true,
      localized: false,
      enumName: 'usr_rpt_section',
      options: (Object.keys(REPORT_SECTION_LABELS_AR) as Array<keyof typeof REPORT_SECTION_LABELS_AR>).map(
        (value) => ({ label: REPORT_SECTION_LABELS_AR[value], value }),
      ),
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'وصف البلاغ',
      required: true,
      localized: false,
      maxLength: 2000,
      admin: {
        description: 'نص عادي من المواطن — لا يُعرض للعامة.',
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
        description: 'اختياري — للمتابعة بشأن البلاغ فقط. لا يُعرض للعامة. لا تُعدّل من لوحة التحرير عادةً.',
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
      options: (Object.keys(REPORT_STATUS_LABELS_AR) as Array<keyof typeof REPORT_STATUS_LABELS_AR>).map(
        (value) => ({ label: REPORT_STATUS_LABELS_AR[value], value }),
      ),
      admin: {
        position: 'sidebar',
        description: 'مفتوح → قيد المراجعة → تم الحل / مرفوض / مزعج.',
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
        description: 'مطلوب عند الإغلاق أو الرفض.',
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

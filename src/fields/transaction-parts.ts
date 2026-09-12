import type { Field } from 'payload'

import { editorialFieldAccess } from '@/access'
import { hasActiveRole, type UserLike } from '@/access/roles'
import { COVERED_SECTIONS } from '@/lib/workflow/types'
import { localizedText, localizedTextarea } from './common'
import { stableKeyField } from './guide-fields'

/** Reusable required-document array fields (Phase 3 shape preserved). */
export function requiredDocumentFields(): Field[] {
  return [
    stableKeyField({
      required: false,
      admin: {
        description:
          'مفتاح تقني للدليل التفاعلي (ليس نصاً للمواطن). يُملأ تلقائياً عند الحفظ إن تُرك فارغاً. لا تغيّره بعد ربطه بالقواعد إلا عند الضرورة.',
      },
    }),
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'documents',
      label: 'الوثيقة',
      required: true,
      localized: false,
      admin: {
        description: 'معلومة للمواطن عبر بطاقة الوثيقة المرتبطة.',
      },
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
      admin: {
        description: 'يساعد الدليل والنتيجة — لا يعني بحد ذاته أن الجهة الرسمية قبلت الورقة.',
      },
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
  ]
}

export function stepFields(): Field[] {
  return [
    stableKeyField({
      required: false,
      admin: {
        description:
          'مفتاح تقني للدليل التفاعلي. يُملأ تلقائياً عند الحفظ إن تُرك فارغاً. لا تغيّره بعد ربطه بالقواعد إلا عند الضرورة.',
      },
    }),
    localizedText('title', 'عنوان الخطوة', {
      required: true,
      admin: { description: 'يظهر هذا النص للمواطن.' },
    }),
    localizedTextarea('description', 'وصف الخطوة', {
      required: true,
      admin: { description: 'يظهر هذا النص للمواطن.' },
    }),
    localizedText('locationNote', 'ملاحظة المكان'),
  ]
}

export function feeFields(): Field[] {
  return [
    stableKeyField({
      required: false,
      admin: {
        description:
          'مفتاح تقني للدليل التفاعلي. يُملأ تلقائياً عند الحفظ إن تُرك فارغاً. لا تغيّره بعد ربطه بالقواعد إلا عند الضرورة.',
      },
    }),
    localizedText('label', 'التسمية', {
      required: true,
      admin: { description: 'يظهر هذا النص للمواطن.' },
    }),
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
  ]
}

export function sourceReferenceFields(): Field[] {
  return [
    {
      name: 'source',
      type: 'relationship',
      relationTo: 'sources',
      label: 'المصدر',
      required: true,
      localized: false,
      admin: {
        description:
          'مرجع قابل للاقتباس. المصدر ≠ الادعاء. ملء مصدر لا يثبت صحة المحتوى ولا يُجيز النشر وحده.',
      },
    },
    {
      name: 'primary',
      type: 'checkbox',
      label: 'أساسي',
      defaultValue: false,
      localized: false,
      admin: {
        description: 'تلميح تحريري للمصدر الرئيسي — ليس اعتماداً رسمياً ولا بديلاً عن ربط الادعاءات.',
      },
    },
    {
      name: 'coveredSections',
      dbName: 'cov_sec',
      type: 'select',
      label: 'الأقسام المغطاة',
      hasMany: true,
      localized: false,
      enumName: 'tx_cov_sec',
      options: COVERED_SECTIONS.map((value) => ({
        label: value,
        value,
      })),
      admin: {
        description: 'أقسام المحتوى التي يدعمها هذا المصدر (مفاتيح ثابتة للنظام — ليست نصاً للمواطن).',
      },
    },
    localizedText('citationNote', 'ملاحظة الاقتباس', {
      admin: { description: 'اختياري — يظهر للفريق التحريري؛ ليس دليلاً على التحقق.' },
    }),
  ]
}

/**
 * P0-05B1 — minimum transaction↔claim binding for publication governance.
 * Transaction-level required claims (optional coveredSection for later section binding).
 * Does not retrofit every document/step/fee/rule row yet.
 */
export function claimBindingFields(): Field[] {
  return [
    {
      name: 'claim',
      type: 'relationship',
      relationTo: 'claims',
      label: 'الادعاء',
      required: true,
      localized: false,
      admin: {
        description: 'الادعاء ≠ المصدر. اختر ادعاءً موثّقاً؛ المصدر وحده لا يكفي للنشر العام.',
      },
    },
    {
      name: 'required',
      type: 'checkbox',
      label: 'مطلوب للنشر الموثوق',
      defaultValue: true,
      localized: false,
      admin: {
        description:
          'إن وُسم مطلوباً فيجب أن يقيَّم AUTHORITATIVE عند الاعتماد/النشر. WARNING_ONLY لا يكفي. هذا لا يغيّر تصنيف المحتوى (contentClass).',
      },
    },
    {
      name: 'coveredSection',
      type: 'select',
      label: 'قسم مرتبط (اختياري)',
      localized: false,
      enumName: 'tx_cov_sec',
      options: COVERED_SECTIONS.map((value) => ({ label: value, value })),
      admin: {
        description: 'تلميح تحريري لربط القسم — ليس بديلاً عن تغطية المصادر ولا عن ثقة الادعاء.',
      },
    },
  ]
}

/** Workflow metadata that belongs in the editorial «المراجعة والنشر» tab (not sidebar). */
export function workflowPanelFields(): Field[] {
  return [
    {
      name: 'changeRequestComment',
      type: 'textarea',
      label: 'تعليق طلب التعديل',
      localized: false,
      access: {
        read: editorialFieldAccess,
      },
      admin: {
        readOnly: true,
        description: 'ظاهر للباحث داخل لوحة الإدارة — غير متاح للعامة.',
      },
    },
    {
      name: 'reviewDueOverrideReason',
      type: 'textarea',
      label: 'سبب تجاوز موعد المراجعة',
      localized: false,
      access: {
        read: editorialFieldAccess,
      },
      admin: {
        readOnly: true,
        description: 'يُسجَّل عند تجاوز الموعد من المدير — للقراءة فقط هنا.',
      },
    },
    {
      name: 'archiveReason',
      type: 'textarea',
      label: 'سبب الأرشفة',
      localized: false,
      access: {
        read: editorialFieldAccess,
      },
      admin: {
        readOnly: true,
        description: 'سبب موثّق للأرشفة عبر سير العمل — ليس حذفاً نهائياً. الأرشفة مفضّلة على الحذف.',
      },
    },
  ]
}

/** Sidebar workflow chrome (status, audit stamps, review schedule). */
export function workflowSidebarFields(): Field[] {
  return [
    {
      name: 'workflowState',
      dbName: 'wf_state',
      type: 'select',
      label: 'حالة التحرير',
      required: true,
      defaultValue: 'draft',
      localized: false,
      index: true,
      enumName: 'tx_wf_state',
      options: [
        { label: 'مسودة', value: 'draft' },
        { label: 'قيد المراجعة', value: 'in_review' },
        { label: 'تعديلات مطلوبة', value: 'changes_requested' },
        { label: 'معتمدة', value: 'approved' },
        { label: 'منشورة', value: 'published' },
        { label: 'مؤرشفة', value: 'archived' },
      ],
      access: {
        // Never editable via Admin field control — workflow service only.
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: 'تُغيَّر عبر أزرار سير العمل فقط — ليست تعديلاً يدوياً للحالة.',
        position: 'sidebar',
        components: {
          Field: '/components/admin/WorkflowStateField#WorkflowStateField',
          Cell: '/components/admin/WorkflowStateCell#WorkflowStateCell',
        },
      },
    },
    {
      name: 'submittedForReviewAt',
      type: 'date',
      label: 'تاريخ الإرسال للمراجعة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'submittedForReviewBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أُرسل للمراجعة بواسطة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'changeRequestedAt',
      type: 'date',
      label: 'تاريخ طلب التعديل',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'changeRequestedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'طلب التعديل بواسطة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'approvedAt',
      type: 'date',
      label: 'تاريخ الاعتماد',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'اعتمد بواسطة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'approvedContentHash',
      type: 'text',
      label: 'بصمة الاعتماد',
      localized: false,
      access: {
        read: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin', 'reviewer'),
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'تقني — مخفي عن الباحث. يُكتب عبر سير العمل فقط.',
      },
    },
    {
      name: 'approvedVersionId',
      type: 'text',
      label: 'معرّف نسخة الاعتماد',
      localized: false,
      access: {
        read: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin', 'reviewer'),
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reviewIntervalDays',
      type: 'number',
      label: 'فترة المراجعة (أيام، اختياري)',
      min: 1,
      localized: false,
      admin: {
        description: 'إن وُجد يتجاوز verificationPolicyDays من إعدادات الموقع.',
        position: 'sidebar',
      },
    },
    {
      name: 'reviewDueAt',
      type: 'date',
      label: 'موعد المراجعة القادمة',
      localized: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'يُحسب عند الاعتماد/النشر. المدير فقط يتجاوزه بسبب موثّق.',
      },
    },
    {
      name: 'markedOutdated',
      type: 'checkbox',
      label: 'موسوم كقديم',
      defaultValue: false,
      localized: false,
      admin: {
        position: 'sidebar',
        description:
          'يخفي المعاملة عن العامة حتى عند كونها منشورة. الأرشفة عبر سير العمل مفضّلة على الحذف النهائي.',
        readOnly: true,
      },
    },
    {
      name: 'archivedAt',
      type: 'date',
      label: 'تاريخ الأرشفة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'archivedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أُرشف بواسطة',
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'workflowSchemaVersion',
      type: 'number',
      label: 'إصدار مخطط السير',
      defaultValue: 1,
      localized: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ]
}

/** Phase 4 editorial workflow fields on transactions (sidebar + panel). */
export function workflowFields(): Field[] {
  return [...workflowSidebarFields(), ...workflowPanelFields()]
}

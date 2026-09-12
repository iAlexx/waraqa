import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import {
  adminOnlyDelete,
  canEditContent,
  contentUpdateAccess,
  editorialFieldAccess,
  publicTransactionRead,
} from '@/access'
import {
  activeField,
  auditFields,
  canonicalSlugField,
  localizedText,
  localizedTextarea,
} from '@/fields/common'
import { contentClassField } from '@/fields/content-class'
import { guideAuthoringFields, guideEnabledField } from '@/fields/guide-fields'
import { enforceContentClassGovernance } from '@/lib/content-class/content-class-governance'
import {
  claimBindingFields,
  feeFields,
  requiredDocumentFields,
  sourceReferenceFields,
  stepFields,
  workflowPanelFields,
  workflowSidebarFields,
} from '@/fields/transaction-parts'
import {
  enforcePublishAuthorization,
  enforceWorkflowFieldGuard,
  invalidateApprovalOnCriticalEdit,
  populateAuditFields,
  preventSelfPrerequisite,
} from '@/hooks/content'
import { stripPrivateEditorialFields } from '@/hooks/public-strip'
import { attachPublicationStatusLabel } from '@/hooks/publication-status-label'
import { ensureStableContentKeys } from '@/lib/guide/ensure-keys'
import { validateGuideOnTransaction } from '@/lib/guide/validate-guide'
import { validateProcedure } from '@/lib/procedure-validation'
import { populateSearchText } from '@/lib/search/populate-search-text'
import {
  runTransactionWorkflowAction,
  type WorkflowRunInput,
} from '@/lib/workflow/transaction-workflow'
import { WorkflowError, type WorkflowAction } from '@/lib/workflow/types'
import { evaluateTransactionAdminReadiness } from '@/lib/admin/transaction-readiness'
import { hasActiveRole, type UserLike } from '@/access/roles'

const WORKFLOW_ACTIONS = new Set<WorkflowAction>([
  'submitForReview',
  'requestChanges',
  'resubmitForReview',
  'approve',
  'publish',
  'unpublish',
  'archive',
  'restoreArchived',
  'restoreRevision',
  'overrideReviewDue',
  'markOutdated',
])

async function handleWorkflowEndpoint(req: PayloadRequest) {
  const user = req.user as UserLike
  if (!user) throw new APIError('يجب تسجيل الدخول.', 401)

  const id = req.routeParams?.id
  const actionParam = req.routeParams?.action
  if (id == null || typeof actionParam !== 'string' || !WORKFLOW_ACTIONS.has(actionParam as WorkflowAction)) {
    throw new APIError('إجراء أو معرّف غير صالح.', 422)
  }

  let body: Record<string, unknown> = {}
  try {
    if (typeof req.json === 'function') {
      body = (await req.json()) as Record<string, unknown>
    }
  } catch {
    body = {}
  }

  const input: WorkflowRunInput = {
    payload: req.payload,
    req,
    id: Array.isArray(id) ? id[0] : id,
    action: actionParam as WorkflowAction,
    user,
    comment: typeof body.comment === 'string' ? body.comment : undefined,
    reason: typeof body.reason === 'string' ? body.reason : undefined,
    expectedUpdatedAt:
      typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined,
    versionId: body.versionId as string | number | undefined,
    reviewDueAt: typeof body.reviewDueAt === 'string' ? body.reviewDueAt : undefined,
  }

  try {
    const doc = await runTransactionWorkflowAction(input)
    return Response.json({ doc })
  } catch (err) {
    if (err instanceof WorkflowError || err instanceof APIError) throw err
    throw new APIError(err instanceof Error ? err.message : 'فشل إجراء سير العمل.', 422)
  }
}

async function handleReadinessEndpoint(req: PayloadRequest) {
  const user = req.user as UserLike
  if (!user) throw new APIError('يجب تسجيل الدخول.', 401)
  if (!hasActiveRole(user, 'admin', 'reviewer', 'researcher')) {
    throw new APIError('غير مصرّح بعرض تفاصيل الجاهزية.', 403)
  }

  const id = req.routeParams?.id
  if (id == null) throw new APIError('معرّف غير صالح.', 422)

  const readiness = await evaluateTransactionAdminReadiness(
    req.payload,
    Array.isArray(id) ? id[0] : id,
    req,
  )
  return Response.json({ readiness })
}

/**
 * Central guidance collection.
 * Roadmap slug: `transactions` (Arabic: المعاملات).
 * Phase 4 extends workflow only — does not rebuild Phase 3 schema.
 * P11-A: admin tabs/groups + editorial help only (unnamed tabs — flat stored shape).
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
    defaultColumns: [
      'title',
      'slug',
      'workflowState',
      'contentClass',
      'category',
      'agency',
      'publicationStatus',
      'active',
      'updatedAt',
    ],
    group: 'المحتوى',
    description:
      'المعاملات الإدارية — نظّم المحتوى عبر التبويبات. التصنيف والنشر وسير العمل في الشريط الجانبي. المحتوى المعبّأ ليس موثّقاً تلقائياً.',
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/WorkflowActions#WorkflowActions'],
      },
    },
  },
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },
  endpoints: [
    {
      path: '/:id/workflow/:action',
      method: 'post',
      handler: handleWorkflowEndpoint,
    },
    {
      path: '/:id/readiness',
      method: 'get',
      handler: handleReadinessEndpoint,
    },
  ],
  access: {
    read: publicTransactionRead,
    create: canEditContent,
    update: contentUpdateAccess,
    delete: adminOnlyDelete,
  },
  hooks: {
    beforeValidate: [
      enforceContentClassGovernance,
      preventSelfPrerequisite,
      validateProcedure,
      validateGuideOnTransaction,
    ],
    beforeChange: [
      ensureStableContentKeys,
      enforceWorkflowFieldGuard,
      enforcePublishAuthorization,
      invalidateApprovalOnCriticalEdit,
      populateAuditFields,
      populateSearchText,
    ],
    afterRead: [attachPublicationStatusLabel, stripPrivateEditorialFields],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'الأساسيات',
          description: 'هوية المعاملة كما تظهر في القوائم والبحث — أبقِ المعرّف (slug) مستقراً.',
          fields: [
            localizedText('title', 'العنوان', {
              required: true,
              admin: { description: 'يظهر هذا النص للمواطن في العنوان والقوائم.' },
            }),
            canonicalSlugField(),
            localizedTextarea('summary', 'الملخص', {
              required: true,
              admin: {
                description: 'ملخص قصير يظهر للمواطن. تعبئته لا تعني أن المعلومة موثّقة.',
              },
            }),
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              label: 'التصنيف',
              required: true,
              index: true,
              localized: false,
              admin: {
                description: 'تصنيف للمواطن والتنقّل — قيمة تنظيمية داخل النظام أيضاً.',
              },
            },
            {
              name: 'agency',
              type: 'relationship',
              relationTo: 'agencies',
              label: 'الجهة',
              required: true,
              index: true,
              localized: false,
              admin: {
                description: 'الجهة المرتبطة بالمعاملة كما تُعرض للمواطن.',
              },
            },
            {
              name: 'serviceCenters',
              type: 'relationship',
              relationTo: 'service-centers',
              label: 'مراكز الخدمة',
              hasMany: true,
              localized: false,
              admin: {
                description: 'معلومة للمواطن عن أماكن التنفيذ إن وُجدت.',
              },
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
              admin: {
                description: 'لمن تُوجَّه هذه المعاملة — معلومة تنظيمية/عرضية للمواطن.',
              },
            },
            {
              name: 'aliases',
              type: 'array',
              label: 'أسماء بديلة (للبحث)',
              admin: {
                description: 'أسماء شائعة تساعد البحث. ليست عنواناً رسمياً بديلاً.',
              },
              fields: [localizedText('value', 'القيمة', { required: true })],
            },
          ],
        },
        {
          label: 'محتوى الخدمة',
          description: 'نصوص وشروط يراها المواطن — لا تُعدّ موثّقة لمجرد تعبئتها.',
          fields: [
            localizedTextarea('eligibility', 'الأهلية', {
              admin: { description: 'معلومة للمواطن عن من يحق له تقديم الطلب.' },
            }),
            localizedTextarea('outcome', 'النتيجة', {
              admin: { description: 'معلومة للمواطن عن ناتج المعاملة المتوقع.' },
            }),
            {
              name: 'estimatedDuration',
              type: 'group',
              label: 'المدة المتوقعة',
              admin: {
                description: 'تقدير للمواطن — ليس تعهداً رسمياً من الجهة.',
              },
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
              admin: {
                description: 'معلومة للمواطن عن معاملات يجب إنجازها أولاً.',
              },
            },
          ],
        },
        {
          label: 'المتطلبات والخطوات',
          description: 'وثائق وخطوات ورسوم للمواطن. النوع/المفتاح التقني قيم داخلية للنظام.',
          fields: [
            {
              name: 'requiredDocuments',
              dbName: 'req_docs',
              type: 'array',
              label: 'الوثائق المطلوبة',
              labels: { singular: 'وثيقة', plural: 'وثائق' },
              admin: {
                description:
                  'قائمة للمواطن. نوع المتطلب والمفتاح المستقر قيم داخلية للدليل — لا تعني موافقة رسمية.',
              },
              fields: requiredDocumentFields(),
            },
            {
              name: 'steps',
              dbName: 'steps',
              type: 'array',
              label: 'الخطوات',
              labels: { singular: 'خطوة', plural: 'خطوات' },
              required: true,
              minRows: 1,
              admin: {
                description: 'خطوات يراها المواطن. المفتاح المستقر تقني للدليل التفاعلي.',
              },
              fields: stepFields(),
            },
            {
              name: 'fees',
              dbName: 'fees',
              type: 'array',
              label: 'الرسوم',
              admin: {
                description:
                  'معلومة للمواطن عن الرسوم. تعبئتها لا تثبت أن الرسوم سارية دون مصدر وادعاء موثوق.',
              },
              fields: feeFields(),
            },
          ],
        },
        {
          label: 'الدليل التفاعلي',
          description:
            'أسئلة وخيارات وقواعد ومتغيرات النتيجة. المفاتيح المستقرة تقنية — لا تغيّرها بعد الربط إلا عند الضرورة.',
          fields: [...guideAuthoringFields()],
        },
        {
          label: 'المصادر والأدلة',
          description:
            'المصدر ≠ الادعاء. التحقق من الادعاء ≠ تصنيف المحتوى. ملء مصدر لا يُجيز النشر وحده.',
          fields: [
            {
              name: 'sources',
              dbName: 'srcs',
              type: 'array',
              label: 'المصادر',
              labels: { singular: 'مصدر', plural: 'مصادر' },
              required: true,
              minRows: 1,
              admin: {
                description:
                  'مراجع قابلة للاقتباس. مطلوبة للنشر. لا تغني عن ربط الادعاءات المطلوبة ولا عن ثقة الادعاء الحيّة.',
              },
              fields: sourceReferenceFields(),
            },
            {
              name: 'claimBindings',
              dbName: 'clm_b',
              type: 'array',
              label: 'ربط الادعاءات',
              labels: { singular: 'ربط ادعاء', plural: 'ربط ادعاءات' },
              admin: {
                description:
                  'ادعاءات مطلوبة تشارك في فحوصات ثقة النشر (خادم). المصدر وحده لا يكفي. VERIFIED على الادعاء ≠ نشر المعاملة تلقائياً. contentClass مستقل عن هذه الروابط.',
              },
              fields: claimBindingFields(),
            },
          ],
        },
        {
          label: 'المراجعة والنشر',
          description:
            'مراجعة تحريرية. PRODUCTION لا يعني التحقق تلقائياً. حالة التحرير وتصنيف المحتوى في الشريط الجانبي.',
          fields: [
            {
              name: 'lastReviewedAt',
              type: 'date',
              label: 'آخر مراجعة',
              localized: false,
              admin: {
                description:
                  'تاريخ آخر مراجعة تحريرية. مطلوب قبل النشر. لا يثبت وحده صحة كل الادعاءات.',
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
                description:
                  'للفريق فقط — لا تُعاد للعامة. لا تبطل الاعتماد ولا تغيّر contentClass.',
              },
            },
            ...workflowPanelFields(),
          ],
        },
        {
          label: 'إعدادات متقدمة',
          description: 'حقول تقنية/مولَّدة — ليست جزءاً من التدفق التحريري اليومي.',
          fields: [
            {
              name: 'searchText',
              type: 'textarea',
              label: 'نص البحث (مولَّد)',
              localized: false,
              index: true,
              admin: {
                readOnly: true,
                description:
                  'قيمة داخلية للنظام — مولَّدة تلقائياً للبحث. لا تُعرض للعامة عبر REST.',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'publicationStatus',
      type: 'text',
      label: 'حالة النشر',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'ملخّص عرضي لحالة المسودة/النشر — يُشتق تلقائياً وليس بديلاً عن سير العمل.',
        components: {
          Cell: '/components/admin/PublicationStatusCell#PublicationStatusCell',
          Field: '/components/admin/PublicationStatusField#PublicationStatusField',
        },
      },
    },
    {
      name: 'claimTrustOk',
      type: 'checkbox',
      label: 'ثقة الادعاءات سليمة',
      defaultValue: false,
      localized: false,
      index: true,
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'مؤشر تحريري مخزَّن فقط — ليست سلطة الثقة النهائية. العرض العام يعيد تقييم الادعاءات والمصادر حياً. لا يغني عن contentClass.',
        components: {
          Cell: '/components/admin/BooleanArCell#BooleanArCell',
        },
      },
    },
    guideEnabledField(),
    ...workflowSidebarFields(),
    contentClassField(),
    activeField(),
    ...auditFields(),
  ],
}

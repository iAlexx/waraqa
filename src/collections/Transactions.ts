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
import {
  feeFields,
  requiredDocumentFields,
  sourceReferenceFields,
  stepFields,
  workflowFields,
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
import { validateProcedure } from '@/lib/procedure-validation'
import { populateSearchText } from '@/lib/search/populate-search-text'
import {
  runTransactionWorkflowAction,
  type WorkflowRunInput,
} from '@/lib/workflow/transaction-workflow'
import { WorkflowError, type WorkflowAction } from '@/lib/workflow/types'
import type { UserLike } from '@/access/roles'

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

/**
 * Central guidance collection.
 * Roadmap slug: `transactions` (Arabic: المعاملات).
 * Phase 4 extends workflow only — does not rebuild Phase 3 schema.
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
      'category',
      'agency',
      'publicationStatus',
      'active',
      'updatedAt',
    ],
    group: 'المحتوى',
    description: 'المعاملات الإدارية — سير تحريري Phase 4 على نموذج Phase 3.',
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
  ],
  access: {
    read: publicTransactionRead,
    create: canEditContent,
    update: contentUpdateAccess,
    delete: adminOnlyDelete,
  },
  hooks: {
    beforeValidate: [preventSelfPrerequisite, validateProcedure],
    beforeChange: [
      enforceWorkflowFieldGuard,
      enforcePublishAuthorization,
      invalidateApprovalOnCriticalEdit,
      populateAuditFields,
      populateSearchText,
    ],
    afterRead: [attachPublicationStatusLabel, stripPrivateEditorialFields],
  },
  fields: [
    localizedText('title', 'العنوان', { required: true }),
    canonicalSlugField(),
    localizedTextarea('summary', 'الملخص', {
      required: true,
      admin: { description: 'ملخص قصير للعرض العام.' },
    }),
    {
      name: 'searchText',
      type: 'textarea',
      label: 'نص البحث (مولَّد)',
      localized: false,
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
        description:
          'Phase 6 — نص مطبَّع مولَّد تلقائياً للمرشّحين. يُزال من الاستجابات العامة عبر afterRead.',
      },
    },
    {
      name: 'publicationStatus',
      type: 'text',
      label: 'حالة النشر',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: {
          Cell: '/components/admin/PublicationStatusCell#PublicationStatusCell',
          Field: '/components/admin/PublicationStatusField#PublicationStatusField',
        },
      },
    },
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
      fields: stepFields(),
    },
    {
      name: 'fees',
      dbName: 'fees',
      type: 'array',
      label: 'الرسوم',
      fields: feeFields(),
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
      fields: sourceReferenceFields(),
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
        description: 'لا تُعاد أبداً في طلبات REST العامة المجهولة. لا تبطل الاعتماد.',
      },
    },
    ...workflowFields(),
    activeField(),
    ...auditFields(),
  ],
}

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
  officialUrlField,
} from '@/fields/common'
import { enforcePublishAuthorization, populateAuditFields } from '@/hooks/content'
import { stripPrivateEditorialFields } from '@/hooks/public-strip'

export const Sources: CollectionConfig = {
  slug: 'sources',
  dbName: 'sources',
  labels: {
    singular: 'مصدر',
    plural: 'المصادر',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'slug',
      'sourceType',
      'verificationStatus',
      'active',
      'updatedAt',
    ],
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
    afterRead: [stripPrivateEditorialFields],
    afterChange: [
      async ({ doc, req, context }) => {
        if (context?.claimTrustRecompute === true) return doc
        try {
          const { recomputeClaimTrustForSourceId } = await import('@/lib/claims/recompute-claim-trust')
          await recomputeClaimTrustForSourceId(req.payload, doc.id, req)
        } catch {
          // Non-blocking: approve/publish and public Where still fail closed.
        }
        return doc
      },
    ],
  },
  fields: [
    localizedText('title', 'العنوان', { required: true }),
    canonicalSlugField(),
    {
      name: 'sourceType',
      dbName: 'stype',
      type: 'select',
      label: 'نوع المصدر',
      required: true,
      localized: false,
      options: [
        { label: 'صفحة رسمية', value: 'official_webpage' },
        { label: 'قانون', value: 'law' },
        { label: 'مرسوم', value: 'decree' },
        { label: 'قرار', value: 'decision' },
        { label: 'تعميم', value: 'circular' },
        { label: 'نموذج رسمي', value: 'official_form' },
        { label: 'PDF رسمي', value: 'official_pdf' },
        { label: 'إعلان', value: 'announcement' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      label: 'الجهة',
      index: true,
      localized: false,
    },
    officialUrlField('officialUrl', 'الرابط الرسمي', { required: true }),
    officialUrlField('archiveUrl', 'رابط الأرشيف'),
    {
      name: 'referenceNumber',
      type: 'text',
      label: 'رقم المرجع',
      localized: false,
    },
    {
      name: 'issuedAt',
      type: 'date',
      label: 'تاريخ الإصدار',
      localized: false,
    },
    {
      name: 'lastVerifiedAt',
      type: 'date',
      label: 'آخر تحقق',
      localized: false,
    },
    {
      name: 'verificationStatus',
      dbName: 'vstatus',
      type: 'select',
      label: 'حالة التحقق',
      required: true,
      defaultValue: 'needs_review',
      localized: false,
      options: [
        { label: 'يحتاج مراجعة', value: 'needs_review' },
        { label: 'موثّق', value: 'verified' },
        { label: 'قديم', value: 'outdated' },
        { label: 'غير متاح', value: 'unavailable' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'ملاحظات داخلية',
      localized: true,
      access: {
        read: editorialFieldAccess,
        update: editorialFieldAccess,
      },
      admin: {
        description: 'ملاحظات تحريرية — لا تُعرض للعامة.',
      },
    },
    activeField(),
    ...auditFields(),
  ],
}

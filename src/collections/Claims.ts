import type { CollectionConfig } from 'payload'

import {
  adminOnlyDelete,
  authenticatedEditorialRead,
  canEditContent,
  contentUpdateAccess,
  editorialFieldAccess,
} from '@/access'
import {
  activeField,
  auditFields,
  localizedText,
  localizedTextarea,
} from '@/fields/common'
import { enforcePublishAuthorization, populateAuditFields } from '@/hooks/content'
import {
  claimReviewerFieldAccess,
  enforceClaimGovernanceAndValidate,
} from '@/lib/claims/claim-governance'
import {
  CLAIM_EVIDENCE_RELATIONS,
  CLAIM_KINDS,
  CLAIM_PUBLICATION_PERMISSIONS,
  CLAIM_SCOPE_KINDS,
  CLAIM_STATUSES,
} from '@/lib/claims/types'
import { STABLE_KEY_RE } from '@/lib/guide/types'

/**
 * First-class Claim / Evidence foundation (P0-05A).
 *
 * IMPLEMENTED NOW: storage of discrete government-service facts, evidence links to
 * existing Sources, status, publication permission (data only), review metadata,
 * researcher vs reviewer/admin governance for verification + publication permission.
 *
 * NOT IMPLEMENTED YET: public publication enforcement, Decision Engine binding,
 * citizen-facing conflict/unknown warnings, review queues, Golden Demo content.
 */
export const Claims: CollectionConfig = {
  slug: 'claims',
  dbName: 'claims',
  labels: {
    singular: 'ادعاء',
    plural: 'الادعاءات',
  },
  admin: {
    useAsTitle: 'key',
    defaultColumns: [
      'key',
      'statement',
      'status',
      'publicationPermission',
      'transaction',
      'updatedAt',
    ],
    group: 'المحتوى',
    description:
      'أسس ادعاءات/أدلة — التخزين فقط في هذه المرحلة. لا تفرض صلاحية النشر على الواجهة العامة بعد.',
  },
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },
  access: {
    // Editorial-only until P0-05B wires publicationPermission into public loaders.
    read: authenticatedEditorialRead,
    create: canEditContent,
    update: contentUpdateAccess,
    delete: adminOnlyDelete,
  },
  hooks: {
    beforeValidate: [enforceClaimGovernanceAndValidate],
    beforeChange: [enforcePublishAuthorization, populateAuditFields],
    afterChange: [
      async ({ doc, req, context }) => {
        if (context?.claimTrustRecompute === true) return doc
        try {
          const { recomputeClaimTrustForClaimId } = await import('@/lib/claims/recompute-claim-trust')
          await recomputeClaimTrustForClaimId(req.payload, doc.id, req)
        } catch {
          // Do not block claim save if recompute fails — public gate still fail-closes on next publish.
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      label: 'المفتاح المستقر',
      required: true,
      unique: true,
      index: true,
      localized: false,
      admin: {
        description: 'معرّف برمجي ثابت (a-z, 0-9, _). لربط لاحق بالمتطلبات/القواعد.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !STABLE_KEY_RE.test(value)) {
          return 'مفتاح الادعاء غير صالح.'
        }
        return true
      },
    },
    localizedText('statement', 'نص الادعاء', {
      required: true,
      admin: {
        description: 'صياغة موجزة لواقعة خدمة حكومية قابلة للتحقق مستقلاً.',
      },
    }),
    localizedTextarea('editorialNotes', 'ملاحظات تحريرية', {
      access: {
        read: editorialFieldAccess,
        update: editorialFieldAccess,
      },
      admin: {
        description: 'ملاحظات داخلية — ليست قيمة حكومية ولا تُعرض للعامة.',
      },
    }),
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      label: 'المعاملة المرتبطة',
      index: true,
      localized: false,
      admin: {
        description: 'ربط اختياري بالمعاملة المالكة. لا يُلزم كل حقول المعاملة بادعاءات بعد.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      label: 'تصنيف الادعاء',
      localized: false,
      enumName: 'ckind',
      options: CLAIM_KINDS.map((value) => ({ label: value, value })),
      admin: {
        description: 'تصنيف خفيف للتصفية — ليس أنطولوجيا كاملة.',
      },
    },
    {
      name: 'scopeKind',
      type: 'select',
      label: 'نوع النطاق (لاحقاً)',
      localized: false,
      enumName: 'scope_k',
      options: CLAIM_SCOPE_KINDS.map((value) => ({ label: value, value })),
      admin: {
        description: 'تلميح ربط لاحق (وثيقة/خطوة/رسم/قاعدة دليل…) — دون إعادة هيكلة الحقول الآن.',
      },
    },
    {
      name: 'scopeKey',
      type: 'text',
      label: 'مفتاح النطاق (لاحقاً)',
      localized: false,
      admin: {
        description: 'مثل مفتاح وثيقة/خطوة/قاعدة. اختياري في P0-05A.',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'حالة الادعاء',
      required: true,
      defaultValue: 'DRAFT',
      localized: false,
      enumName: 'claim_status',
      options: CLAIM_STATUSES.map((value) => ({ label: value, value })),
      admin: {
        description:
          'UNKNOWN و CONFLICTED حالتان صالحتان — لا تُختزلان إلى verified boolean. VERIFIED للمراجع/المدير فقط.',
      },
    },
    {
      name: 'publicationPermission',
      type: 'select',
      label: 'صلاحية النشر',
      required: true,
      defaultValue: 'INTERNAL_ONLY',
      localized: false,
      enumName: 'claim_pub',
      options: CLAIM_PUBLICATION_PERMISSIONS.map((value) => ({ label: value, value })),
      access: {
        // Researchers get default INTERNAL_ONLY on create; cannot grant PUBLIC/BLOCKED.
        create: claimReviewerFieldAccess,
        update: claimReviewerFieldAccess,
      },
      admin: {
        description:
          'بيانات فقط في P0-05A. PUBLIC / PUBLIC_WITH_WARNING / BLOCKED للمراجع/المدير فقط.',
      },
    },
    {
      name: 'evidence',
      dbName: 'claim_ev',
      type: 'array',
      label: 'الأدلة (مصادر)',
      labels: { singular: 'دليل', plural: 'أدلة' },
      admin: {
        description: 'يربط بمصادر موجودة. يدعم SUPPORTS و CONTRADICTS معاً (تعارض).',
      },
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
          name: 'relationType',
          type: 'select',
          label: 'نوع العلاقة',
          required: true,
          localized: false,
          enumName: 'claim_rel',
          options: CLAIM_EVIDENCE_RELATIONS.map((value) => ({ label: value, value })),
        },
        localizedTextarea('note', 'ملاحظة الدليل'),
        {
          name: 'quoteOrLocator',
          type: 'text',
          label: 'اقتباس / موضع في المصدر',
          localized: false,
        },
        {
          name: 'checkedAt',
          type: 'date',
          label: 'تاريخ الفحص',
          localized: false,
          admin: {
            date: { pickerAppearance: 'dayOnly' },
          },
        },
      ],
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'راجعه',
      localized: false,
      access: {
        update: claimReviewerFieldAccess,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'يُعيَّن تلقائياً عند التوثيق من المراجع/المدير النشط.',
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      label: 'تاريخ التوثيق',
      localized: false,
      access: {
        update: claimReviewerFieldAccess,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'طابع زمني من الخادم عند الانتقال إلى VERIFIED.',
      },
    },
    {
      name: 'validFrom',
      type: 'date',
      label: 'صالح من',
      localized: false,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'صالح حتى',
      localized: false,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'reviewDueAt',
      type: 'date',
      label: 'موعد المراجعة القادمة',
      localized: false,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    activeField(),
    ...auditFields(),
  ],
}

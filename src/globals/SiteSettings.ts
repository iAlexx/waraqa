import type { GlobalConfig } from 'payload'

import { getUserRole, isUserActive, type UserLike } from '@/access/roles'
import { localizedText, localizedTextarea } from '@/fields/common'
import { httpUrlMessage, isHttpUrl } from '@/lib/urls'

function isEditorial(user: UserLike): boolean {
  if (!isUserActive(user)) return false
  const role = getUserRole(user)
  return role === 'admin' || role === 'reviewer' || role === 'researcher'
}

/**
 * Site Settings — Phase 3 core + Phase 5 public-home fields.
 * Public UI maps only safe fields via `loadPublicSiteSettings`.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'إعدادات الموقع',
  admin: {
    group: 'النظام',
    description: 'إعدادات عامة للمنصة — تُستهلك في الواجهة العامة (Phase 5).',
  },
  access: {
    // Public shell needs anonymous read; private fields use field-level access.
    read: () => true,
    update: ({ req: { user } }) => isEditorial(user as UserLike),
  },
  fields: [
    localizedText('siteName', 'اسم الموقع', { required: true }),
    localizedText('tagline', 'الشعار النصي'),
    localizedTextarea('independenceDisclaimer', 'بيان الاستقلالية', { required: true }),
    localizedTextarea('footerDisclaimer', 'تنويه التذييل'),
    {
      name: 'contactEmail',
      type: 'email',
      label: 'بريد التواصل',
      localized: false,
    },
    {
      name: 'supportPhone',
      type: 'text',
      label: 'هاتف الدعم (اختياري)',
      localized: false,
    },
    {
      name: 'verificationPolicyDays',
      type: 'number',
      label: 'أيام سياسة التحقق',
      defaultValue: 90,
      min: 1,
      localized: false,
      access: {
        read: ({ req: { user } }) => isEditorial(user as UserLike),
      },
      admin: {
        description: 'مهلة مراجعة تحريرية داخلية — ليست موعداً عاماً.',
      },
    },
    {
      name: 'maintenanceMode',
      type: 'checkbox',
      label: 'وضع الصيانة',
      defaultValue: false,
      localized: false,
      admin: {
        description: 'يعرض رسالة صيانة على الواجهة العامة — لوحة /admin تبقى متاحة.',
      },
    },
    {
      name: 'searchExamples',
      type: 'array',
      label: 'أمثلة البحث (الصفحة الرئيسية)',
      labels: { singular: 'مثال', plural: 'أمثلة' },
      admin: {
        description: 'شرائح أمثلة تحت حقل البحث — نص عربي قصير.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          label: 'النص',
          required: true,
          localized: true,
          maxLength: 80,
        },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'روابط التواصل',
      labels: { singular: 'رابط', plural: 'روابط' },
      admin: {
        description: 'لا تُعرض للعامة إلا إن وُجدت روابط HTTP(S) صالحة.',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'التسمية',
          required: true,
          localized: true,
          maxLength: 60,
        },
        {
          name: 'url',
          type: 'text',
          label: 'الرابط',
          required: true,
          localized: false,
          validate: (value: unknown) => {
            if (typeof value !== 'string' || !isHttpUrl(value)) return httpUrlMessage()
            return true
          },
        },
      ],
    },
    {
      name: 'homePageSections',
      type: 'group',
      label: 'أقسام الصفحة الرئيسية',
      fields: [
        {
          name: 'showCategories',
          type: 'checkbox',
          label: 'إظهار التصنيفات',
          defaultValue: true,
          localized: false,
        },
        {
          name: 'showFeatured',
          type: 'checkbox',
          label: 'إظهار المعاملات المختارة',
          defaultValue: true,
          localized: false,
        },
        {
          name: 'showHowItWorks',
          type: 'checkbox',
          label: 'إظهار كيف بتشتغل ورقة',
          defaultValue: true,
          localized: false,
        },
        {
          name: 'showTrust',
          type: 'checkbox',
          label: 'إظهار قسم الثقة',
          defaultValue: true,
          localized: false,
        },
      ],
    },
    {
      name: 'featuredTransactions',
      type: 'relationship',
      relationTo: 'transactions',
      hasMany: true,
      label: 'معاملات مختارة (الصفحة الرئيسية)',
      localized: false,
      admin: {
        description: 'يُعرض ٤–٦ عند التوفّر — فقط السجلات العامة الصالحة.',
      },
    },
  ],
}

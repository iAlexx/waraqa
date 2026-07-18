import type { GlobalConfig } from 'payload'

import { getUserRole, isUserActive, type UserLike } from '@/access/roles'
import { localizedText, localizedTextarea } from '@/fields/common'

/**
 * Minimal Phase 3 Site Settings (roadmap §14.15 / Phase 3 tasks).
 * No public home UI wiring — Phase 5+ consumes these fields.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'إعدادات الموقع',
  admin: {
    group: 'النظام',
    description: 'إعدادات عامة للمنصة — بدون واجهة عامة في Phase 3.',
  },
  access: {
    read: ({ req: { user } }) => {
      // CMS users only in Phase 3 (public shell still uses hardcoded footer until Phase 5).
      return Boolean(user && isUserActive(user as UserLike))
    },
    update: ({ req: { user } }) => {
      if (!isUserActive(user as UserLike)) return false
      const role = getUserRole(user as UserLike)
      return role === 'admin' || role === 'reviewer' || role === 'researcher'
    },
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
        description: 'علم داخلي فقط في Phase 3 — لا يغيّر الواجهة العامة بعد.',
      },
    },
    {
      name: 'featuredTransactions',
      type: 'relationship',
      relationTo: 'transactions',
      hasMany: true,
      label: 'معاملات مميّزة (لاحقاً للصفحة الرئيسية)',
      localized: false,
      admin: {
        description: 'يُستهلك في Phase 5 — لا واجهة عامة في Phase 3.',
      },
    },
  ],
}

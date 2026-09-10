import type { Field } from 'payload'

import { localizedText, localizedTextarea } from './common'

/** Stable machine key for guide rules and public DTO references. */
export function stableKeyField(overrides?: Partial<Field>): Field {
  const base: Field = {
    name: 'key',
    type: 'text',
    label: 'المفتاح المستقر',
    required: true,
    localized: false,
    index: true,
    admin: {
      description: 'أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط (مثال: first_time). لا يُغيّر بعد النشر.',
    },
  }
  return { ...base, ...overrides } as Field
}

const CONDITION_OPERATORS = [
  { label: 'يساوي', value: 'equals' },
  { label: 'لا يساوي', value: 'notEquals' },
  { label: 'يتضمن', value: 'includes' },
  { label: 'موجود (مجاب)', value: 'exists' },
] as const

function conditionRowFields(): Field[] {
  return [
    {
      name: 'questionKey',
      type: 'text',
      label: 'مفتاح السؤال',
      required: true,
      localized: false,
    },
    {
      name: 'operator',
      dbName: 'op',
      type: 'select',
      label: 'العامل',
      required: true,
      localized: false,
      options: [...CONDITION_OPERATORS],
    },
    {
      name: 'value',
      type: 'text',
      label: 'القيمة',
      localized: false,
      admin: {
        description: 'مطلوبة لـ equals / notEquals / includes. لمفتاح الخيار أو نعم/لا.',
      },
    },
  ]
}

function conditionGroupFields(): Field[] {
  return [
    {
      name: 'all',
      type: 'array',
      label: 'كل الشروط (AND)',
      labels: { singular: 'شرط', plural: 'شروط' },
      fields: conditionRowFields(),
    },
    {
      name: 'any',
      type: 'array',
      label: 'أي شرط (OR)',
      labels: { singular: 'شرط', plural: 'شروط' },
      fields: conditionRowFields(),
    },
  ]
}

const EFFECT_TYPES = [
  { label: 'تضمين وثيقة', value: 'includeDocument' },
  { label: 'استبعاد وثيقة', value: 'excludeDocument' },
  { label: 'تضمين خطوة', value: 'includeStep' },
  { label: 'استبعاد خطوة', value: 'excludeStep' },
  { label: 'تضمين رسم', value: 'includeFee' },
  { label: 'استبعاد رسم', value: 'excludeFee' },
  { label: 'تضمين ملاحظة', value: 'includeNotice' },
  { label: 'استبعاد ملاحظة', value: 'excludeNotice' },
  { label: 'اختيار متغير', value: 'selectVariant' },
] as const

/** Phase 8 guide authoring fields on transactions (additive). */
export function guideFields(): Field[] {
  return [
    {
      name: 'guideEnabled',
      type: 'checkbox',
      label: 'تفعيل الدليل التفاعلي للعامة',
      defaultValue: false,
      localized: false,
      admin: {
        description:
          'يظهر زر «ابدأ الدليل التفاعلي» فقط عند التفعيل ووجود إعداد دليل صالح بدون أخطاء.',
        position: 'sidebar',
      },
    },
    {
      type: 'collapsible',
      label: 'الدليل التفاعلي (المرحلة ٨)',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'questions',
          dbName: 'questions',
          type: 'array',
          label: 'أسئلة الدليل',
          labels: { singular: 'سؤال', plural: 'أسئلة' },
          fields: [
            stableKeyField(),
            {
              name: 'questionType',
              dbName: 'qtype',
              type: 'select',
              label: 'نوع السؤال',
              required: true,
              localized: false,
              defaultValue: 'single',
              options: [
                { label: 'اختيار واحد', value: 'single' },
                { label: 'اختيار متعدد', value: 'multi' },
                { label: 'نعم / لا', value: 'boolean' },
              ],
            },
            localizedText('prompt', 'نص السؤال', { required: true }),
            localizedTextarea('helpText', 'نص مساعدة'),
            {
              name: 'required',
              type: 'checkbox',
              label: 'إلزامي',
              defaultValue: true,
              localized: false,
            },
            {
              name: 'active',
              type: 'checkbox',
              label: 'نشط',
              defaultValue: true,
              localized: false,
            },
            {
              name: 'options',
              dbName: 'qopts',
              type: 'array',
              label: 'الخيارات',
              labels: { singular: 'خيار', plural: 'خيارات' },
              admin: {
                condition: (_, sibling) =>
                  sibling?.questionType === 'single' || sibling?.questionType === 'multi',
              },
              fields: [stableKeyField(), localizedText('label', 'التسمية', { required: true })],
            },
            {
              name: 'visibleWhen',
              type: 'group',
              label: 'يظهر عندما',
              fields: conditionGroupFields(),
            },
          ],
        },
        {
          name: 'variants',
          dbName: 'variants',
          type: 'array',
          label: 'متغيرات النتيجة',
          labels: { singular: 'متغير', plural: 'متغيرات' },
          fields: [
            stableKeyField(),
            localizedText('title', 'العنوان', { required: true }),
            localizedTextarea('explanation', 'شرح اختياري'),
            {
              name: 'active',
              type: 'checkbox',
              label: 'نشط',
              defaultValue: true,
              localized: false,
            },
          ],
        },
        {
          name: 'notices',
          dbName: 'notices',
          type: 'array',
          label: 'ملاحظات التحضير',
          labels: { singular: 'ملاحظة', plural: 'ملاحظات' },
          fields: [
            stableKeyField(),
            localizedText('title', 'العنوان', { required: true }),
            localizedTextarea('body', 'النص', { required: true }),
            {
              name: 'severity',
              dbName: 'sev',
              type: 'select',
              label: 'الأهمية',
              localized: false,
              defaultValue: 'info',
              options: [
                { label: 'معلومة', value: 'info' },
                { label: 'تنبيه', value: 'warning' },
              ],
            },
            {
              name: 'active',
              type: 'checkbox',
              label: 'نشط',
              defaultValue: true,
              localized: false,
            },
          ],
        },
        {
          name: 'decisionRules',
          dbName: 'dec_rules',
          type: 'array',
          label: 'قواعد القرار',
          labels: { singular: 'قاعدة', plural: 'قواعد' },
          fields: [
            stableKeyField(),
            {
              name: 'priority',
              type: 'number',
              label: 'الأولوية',
              required: true,
              defaultValue: 100,
              min: 0,
              localized: false,
              admin: {
                description: 'الأقل يُنفَّذ أولاً؛ الأعلى لاحقاً (يتجاوز عند التعارض).',
              },
            },
            {
              name: 'active',
              type: 'checkbox',
              label: 'نشطة',
              defaultValue: true,
              localized: false,
            },
            localizedTextarea('explanation', 'شرح للمستخدم عند التفعيل'),
            {
              name: 'when',
              type: 'group',
              label: 'الشروط',
              fields: conditionGroupFields(),
            },
            {
              name: 'effects',
              dbName: 'fx',
              type: 'array',
              label: 'التأثيرات',
              required: true,
              minRows: 1,
              fields: [
                {
                  name: 'type',
                  dbName: 'fx_type',
                  type: 'select',
                  label: 'النوع',
                  required: true,
                  localized: false,
                  options: [...EFFECT_TYPES],
                },
                {
                  name: 'targetKey',
                  type: 'text',
                  label: 'مفتاح الهدف',
                  required: true,
                  localized: false,
                  admin: {
                    description: 'مفتاح وثيقة / خطوة / رسم / ملاحظة / متغير.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

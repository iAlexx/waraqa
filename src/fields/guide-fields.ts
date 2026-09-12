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
      description:
        'قيمة تقنية للنظام (وليس نصاً للمواطن). أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط. لا تغيّره بعد ربطه بالقواعد أو بعد استخدام الدليل إلا عند الضرورة — التغيير قد يكسر القواعد أو التقدّم المحفوظ على أجهزة المواطنين.',
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
      admin: {
        description: 'المفتاح المستقر للسؤال (تقني) — ليس نص السؤال الظاهر للمواطن.',
      },
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
        description:
          'مطلوبة لـ equals / notEquals / includes. استخدم مفتاح الخيار أو yes/no للأسئلة المنطقية.',
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

/** Sidebar toggle — kept outside main guide tab content for quick access. */
export function guideEnabledField(): Field {
  return {
    name: 'guideEnabled',
    type: 'checkbox',
    label: 'تفعيل الدليل التفاعلي للعامة',
    defaultValue: false,
    localized: false,
    admin: {
      description:
        'يظهر زر «ابدأ الدليل التفاعلي» للمواطن فقط عند التفعيل ووجود أسئلة/قواعد صالحة بدون أخطاء.',
      position: 'sidebar',
      components: {
        Cell: '/components/admin/BooleanArCell#BooleanArCell',
      },
    },
  }
}

/** Guide authoring fields (questions / variants / notices / rules) — schema-stable. */
export function guideAuthoringFields(): Field[] {
  return [
    {
      name: 'guideRulePreview',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/GuideRulePreviewPanel#GuideRulePreviewPanel',
        },
      },
    },
    {
      name: 'questions',
      dbName: 'questions',
      type: 'array',
      label: 'أسئلة الدليل',
      labels: { singular: 'سؤال', plural: 'أسئلة' },
      admin: {
        description:
          'أسئلة يراها المواطن في الدليل التفاعلي. المفتاح المستقر تقني؛ نص السؤال هو ما يظهر للعامة.',
      },
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
        localizedText('prompt', 'نص السؤال', {
          required: true,
          admin: { description: 'يظهر هذا النص للمواطن.' },
        }),
        localizedTextarea('helpText', 'نص مساعدة', {
          admin: { description: 'اختياري — مساعدة قصيرة للمواطن تحت السؤال.' },
        }),
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
          admin: {
            description: 'الأسئلة غير النشطة لا تظهر في الدليل العام.',
          },
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
            description: 'التسمية للمواطن؛ المفتاح تقني للقواعد.',
          },
          fields: [
            stableKeyField(),
            localizedText('label', 'التسمية', {
              required: true,
              admin: { description: 'يظهر هذا النص للمواطن.' },
            }),
          ],
        },
        {
          name: 'visibleWhen',
          type: 'group',
          label: 'يظهر عندما',
          admin: {
            description: 'شروط ظهور السؤال حسب إجابات سابقة (مفاتيح تقنية).',
          },
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
      admin: {
        description: 'مسارات نتيجة اختيارية يختارها محرك القرار عبر selectVariant.',
      },
      fields: [
        stableKeyField(),
        localizedText('title', 'العنوان', {
          required: true,
          admin: { description: 'يظهر هذا النص للمواطن في النتيجة عند اختيار المتغير.' },
        }),
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
      admin: {
        description: 'ملاحظات/تنبيهات يمكن تضمينها في نتيجة الدليل حسب القواعد.',
      },
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
      admin: {
        description:
          'منطق التضمين/الاستبعاد حسب الإجابات. استخدم مفاتيح الوثائق/الخطوات/الرسوم/الملاحظات/المتغيرات — لا تغيّر المفاتيح المرتبطة دون مراجعة.',
      },
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
        localizedTextarea('explanation', 'شرح للمستخدم عند التفعيل', {
          admin: {
            description: 'اختياري — قد يظهر كسبب («لماذا») في نتيجة الدليل.',
          },
        }),
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
                description: 'المفتاح المستقر لوثيقة / خطوة / رسم / ملاحظة / متغير.',
              },
            },
          ],
        },
      ],
    },
  ]
}

/**
 * Phase 8 guide fields (enabled toggle + authoring arrays).
 * Prefer `guideEnabledField` + `guideAuthoringFields` when placing into admin tabs.
 */
export function guideFields(): Field[] {
  return [guideEnabledField(), ...guideAuthoringFields()]
}

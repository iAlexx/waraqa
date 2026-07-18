import type {
  CheckboxField,
  DateField,
  Field,
  NumberField,
  RelationshipField,
  TextField,
  TextareaField,
} from 'payload'

import { isValidSlug, normalizeSlug } from '@/lib/slug'
import { httpUrlMessage, isHttpUrl } from '@/lib/urls'

type Label = TextField['label']

export function localizedText(
  name: string,
  label: Label,
  options: Omit<Partial<TextField>, 'type' | 'name' | 'label' | 'localized'> & {
    required?: boolean
  } = {},
): TextField {
  const { required = false, ...rest } = options
  return {
    name,
    type: 'text',
    label,
    localized: true,
    required,
    ...rest,
  } as TextField
}

export function localizedTextarea(
  name: string,
  label: Label,
  options: Omit<Partial<TextareaField>, 'type' | 'name' | 'label' | 'localized'> & {
    required?: boolean
  } = {},
): TextareaField {
  const { required = false, ...rest } = options
  return {
    name,
    type: 'textarea',
    label,
    localized: true,
    required,
    ...rest,
  } as TextareaField
}

export function canonicalSlugField(options: { label?: Label } = {}): TextField {
  return {
    name: 'slug',
    type: 'text',
    label: options.label ?? 'المعرّف (slug)',
    required: true,
    unique: true,
    index: true,
    localized: false,
    admin: {
      description:
        'معرّف ثابت غير مترجم. أحرف عربية/لاتينية صغيرة وشرطات فقط. بدون لاحقة عشوائية.',
    },
    hooks: {
      beforeValidate: [
        ({ value }) => {
          if (typeof value !== 'string') return value
          return normalizeSlug(value)
        },
      ],
    },
    validate: (value: unknown) => {
      if (typeof value !== 'string' || !value) {
        return 'المعرّف (slug) مطلوب.'
      }
      if (!isValidSlug(value)) {
        return 'المعرّف غير صالح. استخدم أحرفاً صغيرة وشرطات فقط (يُسمح بالعربية).'
      }
      return true
    },
  }
}

export function activeField(): CheckboxField {
  return {
    name: 'active',
    type: 'checkbox',
    label: 'نشط',
    defaultValue: true,
    localized: false,
    admin: {
      position: 'sidebar',
      description: 'المحتوى غير النشط لا يظهر للعامة حتى لو كان منشوراً.',
    },
  }
}

export function sortOrderField(): NumberField {
  return {
    name: 'sortOrder',
    type: 'number',
    label: 'ترتيب العرض',
    defaultValue: 0,
    index: true,
    localized: false,
    admin: {
      position: 'sidebar',
      step: 1,
    },
  }
}

export function officialUrlField(
  name: string,
  label: Label,
  options: { required?: boolean } = {},
): TextField {
  return {
    name,
    type: 'text',
    label,
    required: Boolean(options.required),
    localized: false,
    validate: (value: unknown) => {
      if (value == null || value === '') {
        return options.required ? httpUrlMessage(String(label)) : true
      }
      if (!isHttpUrl(value)) return httpUrlMessage(String(label))
      return true
    },
  }
}

/** Read-only audit relationship fields (populated by hooks). */
export function auditFields(): Field[] {
  const relationship = (name: string, label: string): RelationshipField => ({
    name,
    type: 'relationship',
    relationTo: 'users',
    label,
    localized: false,
    admin: {
      readOnly: true,
      position: 'sidebar',
    },
    access: {
      update: () => false,
    },
  })

  const publishedAt: DateField = {
    name: 'publishedAt',
    type: 'date',
    label: 'تاريخ النشر',
    localized: false,
    admin: {
      readOnly: true,
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime' },
    },
    access: {
      update: () => false,
    },
  }

  return [
    relationship('createdBy', 'أنشئ بواسطة'),
    relationship('lastUpdatedBy', 'آخر تحديث بواسطة'),
    relationship('publishedBy', 'نُشر بواسطة'),
    publishedAt,
  ]
}

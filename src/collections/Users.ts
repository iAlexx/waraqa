import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access'
import { getUserRole, type UserLike, WARAQA_ROLES } from '@/access/roles'
import { allowSeedBypass } from '@/lib/qa-seed-guard'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'مستخدم',
    plural: 'المستخدمون',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'isActive', 'updatedAt'],
    group: 'النظام',
  },
  auth: true,
  access: {
    admin: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => {
      if (!user) return false
      if (getUserRole(user as UserLike) === 'admin') return true
      // Users can read their own record
      return { id: { equals: user.id } }
    },
    create: async ({ req }) => {
      const user = req.user as UserLike
      if (getUserRole(user) === 'admin') return true
      // First-user bootstrap: allow create when no users exist yet
      const existing = await req.payload.find({
        collection: 'users',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      return existing.totalDocs === 0
    },
    update: ({ req: { user } }) => {
      if (getUserRole(user as UserLike) === 'admin') return true
      if (!user) return false
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (allowSeedBypass(req)) {
          return data
        }

        const next = { ...data }
        const actor = req.user as UserLike
        const actorRole = getUserRole(actor)

        if (operation === 'create') {
          const existing = await req.payload.find({
            collection: 'users',
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          if (existing.totalDocs === 0) {
            next.role = 'admin'
            next.isActive = true
          } else {
            // Subsequent users never silently become admin
            if (actorRole !== 'admin') {
              throw new Error('إنشاء المستخدمين مسموح للمدير فقط بعد الحساب الأول.')
            }
            if (!next.role) next.role = 'researcher'
            if (next.role === 'admin' && actorRole !== 'admin') {
              throw new Error('تعيين دور المدير مسموح للمدير فقط.')
            }
          }
        }

        if (operation === 'update') {
          const prevRole = (originalDoc as { role?: string } | undefined)?.role
          if (next.role && next.role !== prevRole && actorRole !== 'admin') {
            throw new Error('تغيير الأدوار مسموح للمدير فقط.')
          }
          // Non-admins cannot elevate themselves
          if (
            actor &&
            originalDoc &&
            String(actor.id) === String(originalDoc.id) &&
            actorRole !== 'admin'
          ) {
            delete next.role
          }
        }

        return next
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'الاسم',
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'اسم العرض',
    },
    {
      name: 'role',
      type: 'select',
      label: 'الدور',
      required: true,
      defaultValue: 'researcher',
      options: WARAQA_ROLES.map((value) => ({
        value,
        label:
          value === 'admin'
            ? 'مدير'
            : value === 'reviewer'
              ? 'مراجع'
              : value === 'researcher'
                ? 'باحث'
                : 'مشاهد',
      })),
      access: {
        // Only admins see/change role in forms for others; field still stored
        update: ({ req: { user } }) => getUserRole(user as UserLike) === 'admin',
      },
      admin: {
        description:
          'admin · reviewer · researcher · viewer — الباحث لا ينشر. المراجع والمدير ينشران.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'نشط',
      defaultValue: true,
      access: {
        update: ({ req: { user } }) => getUserRole(user as UserLike) === 'admin',
      },
    },
    {
      name: 'preferredLocale',
      type: 'select',
      label: 'اللغة المفضّلة',
      defaultValue: 'ar',
      options: [
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
}

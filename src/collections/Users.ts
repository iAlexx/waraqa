import {
  AuthenticationError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import { isAdmin } from '@/access'
import {
  getActiveUserRole,
  hasActiveRole,
  isUserActive,
  type UserLike,
  WARAQA_ROLES,
} from '@/access/roles'
import { allowSeedBypass } from '@/lib/qa-seed-guard'

/** Reject local-auth login unless the persisted account is explicitly active. */
type UserBeforeLoginHook = NonNullable<
  NonNullable<CollectionConfig['hooks']>['beforeLogin']
>[number]

export const rejectInactiveUserLogin: UserBeforeLoginHook = ({ req, user }) => {
  if (!isUserActive(user as UserLike)) {
    // Keep the response indistinguishable from invalid credentials.
    throw new AuthenticationError(req.t)
  }
  return user
}

/**
 * Payload JWTs carry a session ID that must exist in the user's `sessions` array.
 * Clearing that array on deactivation invalidates every existing token for the user.
 */
export const revokeSessionsOnDeactivation: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== 'update') return data

  const previous = originalDoc as { isActive?: unknown } | undefined
  const next = { ...(data as Record<string, unknown>) }
  const wasActive = previous?.isActive === true
  const hasActiveUpdate = Object.prototype.hasOwnProperty.call(next, 'isActive')
  const willBeActive = hasActiveUpdate ? next.isActive === true : wasActive

  if (wasActive && !willBeActive) {
    next.sessions = []
  }

  return next
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'مستخدم',
    plural: 'المستخدمون',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isActive', 'updatedAt'],
    group: 'النظام',
  },
  auth: {
    useSessions: true,
  },
  access: {
    admin: ({ req: { user } }) => isUserActive(user as UserLike),
    read: ({ req: { user } }) => {
      if (!isUserActive(user as UserLike) || user?.id == null) return false
      const role = getActiveUserRole(user as UserLike)
      // Editorial roles must resolve actor / relationship labels in Admin lists.
      if (role === 'admin' || role === 'reviewer' || role === 'researcher') return true
      return { id: { equals: user.id } }
    },
    create: async ({ req }) => {
      const user = req.user as UserLike
      if (hasActiveRole(user, 'admin')) return true
      if (user) return false
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
      if (hasActiveRole(user as UserLike, 'admin')) return true
      if (!isUserActive(user as UserLike) || user?.id == null) return false
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
  },
  hooks: {
    beforeLogin: [rejectInactiveUserLogin],
    afterRead: [
      ({ doc }) => {
        if (!doc || typeof doc !== 'object') return doc
        const d = doc as {
          displayName?: string | null
          name?: string | null
          email?: string | null
          id?: number | string
          adminLabel?: string
        }
        const display = (d.displayName || d.name || '').trim()
        d.adminLabel = display || d.email || (d.id != null ? `مستخدم ${d.id}` : 'مستخدم')
        return d
      },
    ],
    beforeChange: [
      revokeSessionsOnDeactivation,
      async ({ data, req, operation, originalDoc }) => {
        if (allowSeedBypass(req)) {
          return data
        }

        const next = { ...data }
        const actor = req.user as UserLike
        const actorRole = getActiveUserRole(actor)

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

        // Prefer a human label for Admin relationships (avoids Untitled - ID).
        const display = String(next.displayName ?? next.name ?? '').trim()
        if (display) {
          next.name = display
        } else if (!String(next.name ?? '').trim() && next.email) {
          next.name = String(next.email)
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
      name: 'adminLabel',
      type: 'text',
      label: 'اسم العرض',
      virtual: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
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
        update: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin'),
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
        update: ({ req: { user } }) => hasActiveRole(user as UserLike, 'admin'),
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

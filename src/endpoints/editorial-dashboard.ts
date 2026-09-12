import type { Endpoint } from 'payload'
import { APIError } from 'payload'

import { hasActiveRole, type UserLike } from '@/access/roles'
import { loadEditorialDashboardStats } from '@/lib/admin/editorial-dashboard'

/**
 * GET /api/admin-ops/dashboard
 * Active admin/reviewer only. Cheap indexed counts — no claim-graph walks.
 */
export const editorialDashboardEndpoint: Endpoint = {
  path: '/admin-ops/dashboard',
  method: 'get',
  handler: async (req) => {
    const user = req.user as UserLike
    if (!hasActiveRole(user, 'admin', 'reviewer')) {
      throw new APIError('غير مصرّح.', 403)
    }

    const stats = await loadEditorialDashboardStats(req.payload, {
      req,
      currentUserId: user && typeof user === 'object' ? user.id : null,
    })

    return Response.json({ ok: true, ...stats })
  },
}

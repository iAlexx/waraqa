# Waraqa RBAC (Phase 3)

**Status:** Phase 3 — COMPLETE — OWNER APPROVED

**Last updated:** 2026-07-18

**Related:** [CONTENT_MODEL.md](./CONTENT_MODEL.md), [SECURITY.md](./SECURITY.md)

## Role mapping (owner brief ↔ roadmap)

Roadmap roles are canonical: `admin` | `reviewer` | `researcher` | `viewer`.

| Owner brief term | Roadmap mapping |
| --- | --- |
| editor | ≈ `researcher` — can draft/edit; **cannot publish** |
| publisher | Not a separate role — **`reviewer` + `admin`** publish |

Arabic admin labels: مدير / مراجع / باحث / مشاهد.

## Roles matrix

| Capability | admin | reviewer | researcher | viewer | anonymous |
| --- | --- | --- | --- | --- | --- |
| Access `/admin` (when authenticated + active) | Yes | Yes | Yes | Yes | No |
| Create / edit drafts (content collections) | Yes | Yes | Yes | No | No |
| Update **published** content | Yes | Yes | No (Where: `_status ≠ published`) | No | No |
| Publish / unpublish (`_status`) | Yes | Yes | **No** (server hook rejects) | No | No |
| Delete content | Yes | No | No | No | No |
| Manage users / assign roles | Yes | No | No | No | No |
| Read drafts | Yes | Yes | Yes | No | No |
| Read published + active | Yes | Yes | Yes | Yes | Yes |
| Read `internalNotes` / source editorial `notes` | Yes | Yes | Yes | No | No |
| Read audit fields (`createdBy`, etc.) publicly | Yes | Yes | Yes | Stripped | Stripped |

Content collections covered: `categories`, `agencies`, `service-centers`, `documents`, `sources`, `transactions`.

## First-user admin bootstrap

1. When **zero** users exist, create is allowed without an authenticated admin (Payload first-user flow).
2. Hook forces `role = admin` and `isActive = true` on that first create.
3. After the first user exists:
   - Only an **admin** may create users.
   - Default role for new users is `researcher` if omitted.
   - Subsequent users **never** silently become admin.
   - Non-admins cannot change `role` or elevate themselves.

## Server-side publish enforcement

Implemented in `enforcePublishAuthorization` (`src/hooks/content.ts`), attached to all content collections:

- Transition **to** `published` or **from** published → draft requires active user with role `admin` or `reviewer`.
- Researchers (and viewers) receive an Arabic authorization error — including Local/REST API attempts that bypass Admin UI.
- Collection `update` access also restricts researchers to non-published documents (`contentUpdateAccess`).
- Seed/context bypass exists only for controlled test seeding (`req.context.seed === true`), not for normal API clients.

## Private editorial fields

| Field | Collection | Rule |
| --- | --- | --- |
| `internalNotes` | `transactions` | Field-level read/update for editorial roles only; stripped on anonymous/viewer `afterRead` |
| `notes` | `sources` | Same editorial field access + strip |
| Audit relationships | content collections | Stripped for non-editorial readers via `stripPrivateEditorialFields` |

## Public published + active only

`publicPublishedRead` returns:

```text
_status equals published AND active equals true
```

for anonymous users and `viewer`. Editorial roles (`admin`, `reviewer`, `researcher`) get full read including drafts.

Inactive published docs are **not** publicly visible.

## Audit fields

On create/update (when a user is present):

| Field | Behavior |
| --- | --- |
| `createdBy` | Set on create |
| `lastUpdatedBy` | Set on every change |
| `publishedBy` / `publishedAt` | Set when transitioning into `published` |

Admin UI marks these read-only; field `update` access is denied.

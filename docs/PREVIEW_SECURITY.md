# Preview Security (Phase 4)

## Route

`/preview/transactions/[id]` — internal draft preview only (not Phase 7 public page).

Banner: `معاينة داخلية — هالمحتوى غير منشور`  
`robots: noindex`.

## Authorization

1. Authenticated active CMS user required.
2. Roles: admin, reviewer, researcher (viewer denied).
3. Optional short-lived HMAC token (`PREVIEW_SECRET` or fallback `PAYLOAD_SECRET` for local only):
   - Issue: `POST /api/preview/transactions/[id]`
   - Token binds `id` + `userId` + expiry (default 15 minutes).

## Environment

| Variable | Exposure |
| --- | --- |
| `PREVIEW_SECRET` | Server-only, ≥32 chars |

Never use `NEXT_PUBLIC_*` for preview secrets.

## Controls

- No public nav link.
- Relationship depth limited; private fields stripped by role.
- Review comments visible to editorial roles only.
- Tokens must not appear in screenshots or committed QA docs.

## Threat model / limitations

- Compromised session can open allowed drafts.
- Token theft within TTL allows open if also authenticated as bound user.
- Not a substitute for Payload Live Preview enterprise features.
- No email notification of preview links.

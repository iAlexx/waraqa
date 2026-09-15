# Phase 13 — Security review

**Date:** 2026-09-14  
**Scope:** Code review of existing WARAQA controls (Auth, public gates, reports, seed bypass, data minimization).  
**Method:** Static review of collections, access helpers, report pipeline, content isolation, QA seed guard — not a full penetration test.  
**Commit under review:** TBD until push  

No Critical findings invented where controls appear sound.

---

## Findings

| ID | Severity | Area | Finding | Residual / follow-up |
| --- | --- | --- | --- | --- |
| S-01 | INFO | Auth | Inactive users fail closed: `isUserActive` requires `isActive === true`; `beforeLogin` rejects inactive with generic auth error; deactivation clears `sessions`. | Confirm Payload session cookie lifetime aligns with ops expectations. |
| S-02 | INFO | Content isolation | P0-06 `contentClass`: production mode exposes PRODUCTION only; DEMO requires `WARAQA_PUBLIC_CONTENT_MODE=demo`; QA_TEST never public. | Misconfigured demo mode on a public URL would show DEMO — ops must keep production env at default. |
| S-03 | INFO | Reports | PostgreSQL `report_rate_buckets` + IP-only HMAC identity; honeypot; plain text; no attachments; contact ACL admin/reviewer; fail-closed without trustworthy IP. | Trusted-proxy assumptions on Vercel; document if other hosts are used. |
| S-04 | INFO | Seed bypass | `allowSeedBypass` hard-locked when `NODE_ENV` or `VERCEL_ENV` is production; requires `context.seed` + test/QA fixture flags. Phase 12 seed also refuses production. | Keep CI secrets out of production project env. |
| S-05 | INFO | Data minimization | No national ID collection; no identity-document uploads; no citizen accounts; guide answers/checklist in `localStorage` only; WhatsApp share omits answers. | Citizen education via privacy page — not a crypto guarantee against device compromise. |
| S-06 | INFO | Transaction delete | Hard delete blocked for previously published/approved/archived (+ audit history); seed bypass non-prod only. | Prefer archive in ops runbooks. |
| S-07 | INFO | Public APIs | Published + active (+ workflow/outdated gates); `overrideAccess: false` on public transaction load; uniform not-found; private fields stripped. | Continue reviewing after schema changes. |
| S-08 | LOW | XSS / HTML | Reports sanitized to plain text; public source links http(s) only. | Rich text elsewhere must stay on Lexical/safe render paths. |
| S-09 | LOW | Admin surface | `/admin` not linked from public nav; RBAC roles enforced; researchers cannot publish via API. | Full Arabic Admin chrome still deferred — not an ACL gap by itself. |
| S-10 | MEDIUM | Secrets / ops | Free-tier / manual backup discipline; dumps are secrets. | Follow [BACKUP_RESTORE.md](../../ops/BACKUP_RESTORE.md); run `pnpm scan:secrets` in CI. |
| S-11 | MEDIUM | Supply chain | Transitive **high** advisories on eslint/jsdom paths (see dependency audit). | Mitigate with pnpm overrides; not citizen UI runtime path for brace-expansion / undici-via-vitest. |
| S-12 | LOW | Preview | Draft preview uses `PREVIEW_SECRET` HMAC when enabled. | Keep secret server-only; rotate if leaked. |

**CRITICAL:** none identified in this review.  
**HIGH (application logic):** none identified beyond documented supply-chain highs (S-11) with mitigation plan.

---

## Residual risks (honest)

- Demo mode left on in a public deployment would expose DEMO content by design.
- Rate limiting depends on trustworthy forwarded IP headers.
- localStorage guide state is device-local — shared/family devices can expose answers to other users of the same browser profile.
- CSP and advanced bot abuse beyond report rate limits remain later hardening.
- Formal Syrian legal/privacy compliance is **not** asserted by this review — counsel may be required.

---

## Related docs

- [SECURITY.md](../../SECURITY.md)
- [CONTENT_ISOLATION.md](../../CONTENT_ISOLATION.md)
- [PREVIEW_SECURITY.md](../../PREVIEW_SECURITY.md)
- [DEPENDENCY_AUDIT.md](./DEPENDENCY_AUDIT.md)

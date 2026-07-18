# Round 01 — Core Collections

| Field | Value |
| --- | --- |
| **Revision title** | Core Collections (Admin + public API evidence) |
| **Revision name** | `round-01-core-collections` |
| **Status** | Captures complete — **OWNER APPROVED** copy at `docs/qa/phase-3/approved/round-01-core-collections/` |
| **Capture date** | 2026-07-18 |
| **Git HEAD (at capture)** | `bb51a680a002a4ecd8b20dc730ee7f8327b88852` |
| **Branch** | `phase-3-core-collections` |
| **Migrations** | `20260718_052746_phase_3_core_collections`, `20260718_163635_phase_3_site_settings` |
| **Fixture policy** | Local/test-only fictional Arabic labels; credentials in gitignored `docs/qa/phase-3/.local-credentials`; reset via `pnpm db:reset` + remigrate, or delete rows in Admin |
| **Primary viewport** | **1440** × 900 (desktop Admin / API evidence pages) |
| **Phase 2 QA untouched** | **Yes** — no files under `docs/qa/phase-2/` modified |
| **Phase 4 started** | **No** |
| **Copied to `approved/`** | **Yes** — owner-approved 2026-07-18 |
| **Phase 3 status** | **COMPLETE — OWNER APPROVED** |

## Collections in scope

| Slug | Arabic labels |
| --- | --- |
| `users` | مستخدم / المستخدمون |
| `categories` | تصنيف / التصنيفات |
| `agencies` | جهة / الجهات |
| `service-centers` | مركز خدمة / مراكز الخدمة |
| `documents` | وثيقة / الوثائق |
| `sources` | مصدر / المصادر |
| `transactions` | معاملة / المعاملات |
| `site-settings` (global) | إعدادات الموقع |

Naming note: slug is `transactions` (roadmap), Arabic معاملة/المعاملات.

## Screenshot inventory (complete)

| Filename | Subject |
| --- | --- |
| `admin-login-desktop-1440.png` | `/admin` login (empty fields; no password) |
| `admin-dashboard-desktop-1440.png` | Admin home — all collections + Site Settings |
| `users-list-desktop-1440.png` | Users collection list |
| `categories-list-desktop-1440.png` | Categories list |
| `categories-edit-desktop-1440.png` | Category edit (تصنيف تجريبي) |
| `agencies-list-desktop-1440.png` | Agencies list |
| `agencies-edit-desktop-1440.png` | Agency edit (جهة تجريبية) |
| `service-centers-list-desktop-1440.png` | Service centers list |
| `service-centers-edit-desktop-1440.png` | Service center edit (مركز خدمة تجريبي) |
| `documents-list-desktop-1440.png` | Documents list |
| `documents-edit-desktop-1440.png` | Document edit (وثيقة تجريبية) |
| `sources-list-desktop-1440.png` | Sources list |
| `sources-edit-desktop-1440.png` | Source edit (مصدر رسمي تجريبي) |
| `transactions-list-desktop-1440.png` | Transactions list |
| `transactions-edit-draft-desktop-1440.png` | Transaction edit draft (معاملة تجريبية) |
| `transactions-draft-status-desktop-1440.png` | Draft status visible |
| `transactions-documents-desktop-1440.png` | Required documents relationship region |
| `transactions-steps-sources-desktop-1440.png` | Steps / sources region |
| `transactions-published-status-desktop-1440.png` | Published status (معاملة تجريبية منشورة) |
| `transactions-publish-blocked-researcher-desktop-1440.png` | Researcher PATCH publish rejected |
| `public-api-draft-hidden.png` | Public API: draft slug → empty docs |
| `public-api-published-visible.png` | Public API: published+active visible |
| `public-api-inactive-hidden.png` | Public API: inactive published hidden |
| `public-api-internal-notes-hidden.png` | Public API: `internalNotes` absent |
| `graphql-disabled-404.png` | `GET /api/graphql` → HTTP 404 |

No comparison contact sheet (not required for this round).

## Capture commands

```powershell
# 1) Ensure local Postgres + migrations; start prod-like server (example port 3020)
$env:ALLOW_QA_FIXTURE='1'
$env:ALLOW_DESIGN_SYSTEM_QA='1'
$env:PAYLOAD_DATABASE_PUSH='0'
# start: corepack pnpm@11.14.0 start  (or next start) on QA_BASE_URL

# 2) Seed fictional fixture (writes gitignored .local-credentials)
$env:ALLOW_QA_FIXTURE='1'
corepack pnpm@11.14.0 qa:phase3:fixture

# 3) Capture screenshots into this folder only
$env:QA_BASE_URL='http://127.0.0.1:3020'
corepack pnpm@11.14.0 qa:phase3:capture
```

Reset / remove fixture: `pnpm db:reset` then `pnpm db:migrate` (disposable local DB), or delete QA rows in Admin. Never run fixture in production without an explicit local disposable setup.

## Tests (supporting; captures are the pending inventory)

- Unit: `tests/unit/phase3-domain.spec.ts`, `tests/unit/qa-seed-guard.spec.ts`
- Integration: `tests/int/collections.int.spec.ts` (public access, researcher publish reject, internalNotes strip)
- E2E: existing suite (Phase 2 public UI unchanged)

## Roadmap-scope resolution

**Outcome A** applied (owner-authorized this audit):

- Conflict: Phase 3 tasks originally listed Users / Categories / Agencies / Service Centers / Sources / Documents / Site Settings — **no** Transaction collection; Phase 4 said “implement Transaction collection.”
- Decision: retain full `transactions` content model in Phase 3; amend roadmap; Phase 4 must **not** rebuild/duplicate schema — workflow extensions only.
- Documented in `docs/WARAQA_MASTER_ROADMAP_EN.md`, `CONTENT_MODEL.md`, `ARCHITECTURE.md`, `PHASE_CHECKLIST.md`.

## Site Settings decision

**Required in Phase 3** by roadmap Phase 3 Tasks (“implement Site Settings”) and §14.15.

- Implemented as minimal Payload global `site-settings` (migration `20260718_163635_phase_3_site_settings`).
- Public UI consumption remains **Phase 5**.
- Visible on Admin dashboard as إعدادات الموقع.

## Known limitations

- Admin may still show a Publish control for researchers in some Payload layouts; server-side `APIError` 403 + access rules block the transition (proven by capture + integration test).
- Fixture credentials live only in gitignored `.local-credentials` — never commit or screenshot passwords.

## Confirmations

- Phase 2 QA under `docs/qa/phase-2/` **untouched**.
- Phase 4 **not started**.
- Owner-approved copy: `docs/qa/phase-3/approved/round-01-core-collections/` (revision folder retained).
- Phase 3 status: **COMPLETE — OWNER APPROVED**.

Historical note: this revision was captured before the Phase 3 completion commit/tag; approval stamped 2026-07-18.

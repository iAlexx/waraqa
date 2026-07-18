# Round 01 — Changes / scope notes

- Phase 3 Admin collections captured with fictional Arabic entities: تصنيف تجريبي، جهة تجريبية، مركز خدمة تجريبي، وثيقة تجريبية، مصدر رسمي تجريبي، معاملة تجريبية (+ published / inactive variants).
- **Outcome A:** full procedure field model retained on `transactions` in Phase 3 (owner-authorized); Phase 4 must not rebuild schema.
- **Site Settings:** minimal global implemented in Phase 3 per roadmap Tasks / §14.15; public consumption = Phase 5 (not deferred ambiguously).
- RBAC evidence: researcher PATCH `_status=published` rejected; admin-published record publicly readable; drafts and inactive published hidden anonymously; `internalNotes` absent anonymously; GraphQL 404.
- Screenshots: **complete** (25 PNGs) — fictional data only; no passwords/tokens/cookies in captures.
- Fixture: local-only via `scripts/phase3-qa-fixture.ts` + `ALLOW_QA_FIXTURE=1`; credentials gitignored.
- Phase 2 brand/UI and Phase 2 QA archives unchanged; Round 01 **owner-approved** at `docs/qa/phase-3/approved/round-01-core-collections/`; Phase 4 not started.
- Phase 4 Admin UI polish debt recorded (mixed EN/AR chrome, parent empty state, boolean badges, login branding) — non-blocking.

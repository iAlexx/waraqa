# TechTown demonstration outline (Phase 14-A)

**Audience:** Non-technical stakeholders / TechTown-style demo.  
**Content truth:** The five seeded procedures are **DEMO** (`contentClass=DEMO`). They are **not** government-certified PRODUCTION information.  
**Affiliation:** ورقة is an **independent** Syrian administrative guidance platform — **not** a government service and **not** an official partner of any ministry.

Do not claim government endorsement, official certification, or live PRODUCTION completeness.

---

## 1. Opening (2 minutes)

- Citizen problem: “I need to know what documents and steps my procedure requires — without guessing from informal chats.”
- WARAQA’s role: structured, source-backed guidance with explicit uncertainty; independence disclaimer on every public surface.
- What WARAQA is **not:** a government portal, a paid agent, or a place to upload personal documents.

---

## 2. Citizen journey (8–10 minutes)

1. **Home** — Arabic RTL shell, calm empty/featured states, independence notice.  
2. **Search** — Arabic query (e.g. معادلة / وكالة); unique results; DEMO label when applicable.  
3. **Procedure detail** — Requirements, steps, fees/duration honesty (UNKNOWN / needs confirmation where unsupported), sources with verification dates.  
4. **Interactive guide** — Answer situation questions; local progress only (no account).  
5. **Personalized result** — Checklist, notes, sources; DEMO warning when content is DEMO.  
6. **Print-ready sheet** — Browser Print Preview (A4, RTL); preparation sheet without site chrome (Phase 13 owner-signed).  
7. **WhatsApp share** — Public procedure URL only; no answers embedded.

---

## 3. Trust & uncertainty (3 minutes)

- Claims tied to sources; broken/unverified evidence fails closed.  
- Fees/addresses/durations omitted or marked when not supported by sources.  
- User reports path exists for suggested corrections (no file uploads of IDs).

---

## 4. Editorial workflow (3–4 minutes)

In Payload Admin (authenticated):

- Draft → review → publish gates.  
- Content class: QA_TEST / DEMO / PRODUCTION (researchers cannot silently promote to PRODUCTION).  
- Readiness panel vs public eligibility.  
- Preview of drafts via signed preview links (not public SEO).

Do **not** demonstrate secret values, connection strings, or other operators’ passwords.

---

## 5. Closing honesty checklist (1 minute)

- Five procedures today = **DEMO pack** for demonstration and editorial practice.  
- Production launch requires owner-approved PRODUCTION content, env isolation, backups, and smoke sign-off ([PRODUCTION_DEPLOYMENT.md](../ops/PRODUCTION_DEPLOYMENT.md)).  
- Current hosted URL may still run `WARAQA_PUBLIC_CONTENT_MODE=demo` — that is intentional until owner flips policy.

---

## Demo environment notes

- Prefer a **Preview** deployment with Deployment Protection for private demos.  
- If using the public Production URL while still in DEMO mode, state clearly that content is experimental DEMO, not official PRODUCTION guidance.

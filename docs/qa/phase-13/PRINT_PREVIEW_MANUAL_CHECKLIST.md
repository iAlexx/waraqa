# Phase 13 — Owner manual Print Preview checklist (P9-C)

**Status:** PASS — owner completed 2026-09-15  
**Environment:** Chrome / Windows · A4 Portrait · browser headers/footers disabled  
**Procedure:** Golden Demo guide result (معادلة شهادة ثانوية غير سورية / Phase 12 seed)

**Setup used**
1. `WARAQA_PUBLIC_CONTENT_MODE=demo`
2. Seeded DEMO content available
3. Desktop Chrome (not Playwright headless)
4. Guide result → **طباعة النتيجة** → OS/browser Print Preview
5. A4 portrait

**Verify in Print Preview**
- [x] A4 portrait layout
- [x] Arabic RTL reading order
- [x] Sane margins (content not clipped)
- [x] No public header/nav chrome
- [x] No footer menus / decorative clutter
- [x] No broken page splits mid-checklist item
- [x] Checklist marks `[✓]` / `[ ]` (or equivalent) readable
- [x] Title present
- [x] Selected situation / answers summary present
- [x] Requirements (documents) present
- [x] Steps present
- [x] Notes visible where applicable
- [x] Sources listed
- [x] Verification / last-review date present
- [x] DEMO warning visible
- [x] Independence disclaimer visible
- [x] Generated/print date present

**Evidence:** Owner visually reviewed a 3-page PDF from Print Preview (no credentials / no citizen contact stored in repo).

**Sign-off:** Owner — 2026-09-15 — Print Preview gate **PASS**.  
`docs/qa/PHASE_13_QUALITY_REPORT.md` updated to Phase 13 **PASS / COMPLETE**.

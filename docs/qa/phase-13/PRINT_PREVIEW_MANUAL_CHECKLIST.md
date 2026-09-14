# Phase 13 — Owner manual Print Preview checklist (P9-C)

**Status:** REQUIRED — agent could not inspect a real OS/browser Print Preview dialog in this environment (IDE browser blocks `window.print()`; Playwright `emulateMedia('print')` is explicitly insufficient).

**Setup**
1. `WARAQA_PUBLIC_CONTENT_MODE=demo`
2. `pnpm seed:phase13:ci` (or `pnpm seed:phase12`) with healthy Postgres
3. Open a **desktop** Chrome or Edge (not Playwright headless)
4. Complete Golden Demo guide: non-Arab certificate → result (`/transactions/p12-demo-tx-secondary-equivalency/guide`)
5. Click **طباعة النتيجة**, then open the browser/OS **Print Preview** (Ctrl+P if needed)
6. Choose **A4 portrait**

**Verify in Print Preview (pass/fail each)**
- [ ] A4 portrait layout
- [ ] Arabic RTL reading order
- [ ] Sane margins (content not clipped)
- [ ] No public header/nav chrome
- [ ] No footer menus / decorative clutter
- [ ] No broken page splits mid-checklist item
- [ ] Checklist marks `[✓]` / `[ ]` (or equivalent) readable
- [ ] Title present
- [ ] Selected situation / answers summary present
- [ ] Requirements (documents) present
- [ ] Steps present
- [ ] Durations/fees only if applicable (equivalency may omit duration)
- [ ] Sources listed
- [ ] Verification / last-review date present
- [ ] DEMO warning visible
- [ ] Independence disclaimer visible
- [ ] Generated/print date present

**Evidence:** optional screenshot of Print Preview only (no credentials / no citizen contact).

When all boxes pass, update `docs/qa/PHASE_13_QUALITY_REPORT.md` Print Preview section to **PASS** and re-run Phase 13 closure.

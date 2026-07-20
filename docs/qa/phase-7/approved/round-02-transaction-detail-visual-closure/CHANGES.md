# Round 02 changes — Transaction detail visual closure

## Root cause

Header and body used `max-w-3xl` **without** horizontal centering inside `waraqa-container`. In RTL that pinned content to the inline-start (right) edge and left a large empty region at 1024px+.

## Layout correction

- Shared rail: `mx-auto w-full min-w-0 max-w-5xl`
- Long text constrained with `max-w-[40rem]` on title/summary/prose blocks
- Same rail for complete / long / minimal / footer action

## Section cards

- Documents: title + subtle requirement label; condition and quantity meta separated
- Steps: number badge beside title (no collision); description and location distinct
- Fees: label/amount row + notes below (no loose columns)
- Centers: labeled dl rows with safe wrapping
- Sources: primary label; secondary ref/date; `break-all` official links

## States

- Loading: detail-shaped skeleton (breadcrumb/title/meta/disclaimer/section cards); `motion-reduce`; QA-only (`?qaLoading=1`), not `loading.tsx`
- Error: segment `error.tsx` with `reset()` + QA error page retry link
- Not-found: vertically centered in main area; search + home actions preserved

## Unchanged

Access, DTO, sanitization, not-found eligibility, Phase 6 search logic, schema, Round 01 archive, Phase 8/10/11.

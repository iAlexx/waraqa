# Phase 13 homepage query-shape evidence

Automated CI does **not** claim wall-clock homepage TTFB. This note records query shape and owner-measured deployed TTFB after batching.

## BEFORE (force-dynamic `/`)

- 1 categories find
- N category × transactions finds (N+1)
- per trusted candidate: sequential claim `findByID` + source `findByID`
- featured: sequential transaction `findByID` + same claim/source fan-out

## AFTER (commit `53ec75e9fc6f3953e7b7c48456bd7df96819f4f5`)

- 1 categories find
- 1 candidate transactions find (category ∈ public categories + public Where)
- 1 batched claims find (`id in` unique claim IDs, published rows only)
- 1 batched sources find (`id in` unique source IDs, published rows only)
- 1 featured transactions find (id ∈ Site Settings order)
- featured trust uses the same batched Claim/Source graph
- + Site Settings (React cache) and other minimum supporting queries

Phase 12 demo shape (~5 DEMO txs, ~41 claims, ~7 sources): claim/source round-trips collapse from O(txs × claims/sources) `findByID` to O(1) batched finds.

## Deployed TTFB (owner / real browser — not CI)

Measured after three separate reloads on the deployed tip including `53ec75e`:

| Sample | TTFB |
| --- | ---: |
| 1 | 61 ms |
| 2 | 74 ms |
| 3 | 43 ms |
| Average | ≈ 59 ms |

Prior measurement before batching: TTFB ≈ **8.92 s**.

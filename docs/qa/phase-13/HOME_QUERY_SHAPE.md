/**
 * Phase 13 homepage query-shape evidence (no wall-clock benchmarks).
 *
 * BEFORE (force-dynamic `/`):
 * - 1 categories find
 * - N category × transactions finds (N+1)
 * - per trusted candidate: sequential claim findByID + source findByID
 * - featured: sequential transaction findByID + same claim/source fan-out
 *
 * AFTER:
 * - 1 categories find
 * - 1 candidate transactions find (category ∈ public categories + public Where)
 * - 1 batched claims find (`id in` unique claim IDs, published rows only)
 * - 1 batched sources find (`id in` unique source IDs, published rows only)
 * - 1 featured transactions find (id ∈ Site Settings order)
 * - featured trust uses the same batched Claim/Source graph
 * - + Site Settings (React cache) and other minimum supporting queries
 *
 * Phase 12 demo shape (~5 DEMO txs, ~41 claims, ~7 sources): claim/source
 * round-trips collapse from O(txs × claims/sources) findByID to O(1) batched finds.
 */

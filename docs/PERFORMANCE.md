# Spatial query performance and limits

Measured September 26, 2026. GridLock's interactive radius search now uses the pinned KDBush 4.1.0 and geokdbush 2.1.0 packages. The original `compareProjects` implementation remains unchanged as a small-fixture exhaustive capability and correctness oracle.

## Geometry and time contracts

`prepareSpatialDataset(projects, {datasetVersion, geometryVersion}, previous?)` sorts stable unique IDs, calculates representative centers and parses source date bounds once per dataset version. Date edits reuse geometry. Source company edits rebuild partition membership; changing selected company filters does not. An exact ID/company/center signature checks reuse across dataset versions, even if an importer accidentally retains an old geometry version. A repeated dataset version is an immutable-input contract: callers must change it when source or override values change.

The existing proxy method is preserved: arithmetic endpoint mean, single valid endpoint fallback, or unknown. It remains a regional approximation. Two endpoints on opposite sides of the dateline still have an inappropriate arithmetic longitude midpoint; successful dateline tests for **single representative points** do not validate dateline-spanning routes. Neither the index nor connector establishes an actual construction footprint.

KDBush stores one static index per company, using `[longitude, latitude]` in Float64 coordinates. geokdbush's spherical radius is **6,371 km**; GridLock's final metric uses **3,958.7613 miles**. Candidate radius is `thresholdMiles / 3958.7613 × 6371`, plus a conservative `1e-10` radian margin (about 0.64 mm). At/above the antipode, candidate retrieval uses geokdbush's unbounded radius, avoiding finite-radius sine folding. Every date-eligible candidate receives the unchanged application haversine calculation and **strict unrounded distance < threshold** test. Conversion of display units remains in `comparisons.ts`.

Each unordered cross-company pair is visited at most once by querying only lexically later companies. Project IDs are then put in the oracle's canonical order, including the haversine operand order, independently of company names. Pair IDs use the oracle's encoded ID construction.

Each company also has a conservative spherical cap: its first point and the maximum distance to any of its points, prepared once. Triangle inequality permits rejecting the whole company when the query-center distance exceeds the radius plus cap radius. An extra 0.01-mile guard deliberately exceeds floating-point roundoff, including near antipodes. This prevents coincident but separated utility clusters from walking loose KD-tree bounds. The geokdbush callback **always returns true** and only instruments budgets; semantic eligibility is checked after retrieval. Rejecting IDs/companies/dates inside that callback can defeat geokdbush's radius termination and turn empty queries into broad scans. `radiusPrunedGroups` records company-cap rejections. A bounded max heap retains the best results by exact distance, then stable pair ID; presentation rounding never controls inclusion or ordering.

`temporal.ts` represents day, month and year precision as UTC bounds and keeps scenario shifts separate from source objects. Date filtering uses inclusive **potential overlap** for uncertain month/year dates. It does not invent an exact day. `gapDays` and optional calendar-month-gap eligibility are established only for two exact-day dates. Leap anniversaries clamp to February 28. Original dates, raw text and evidence remain unchanged. The UI can prepare a separate date-bounds array once per dataset/scenario for its histogram; that is distinct from the worker's copy and does not rebuild the geometry index on slider changes.

## API and honest counts

```ts
const prepared = prepareSpatialDataset(projects, versions, previous);
const result = await querySpatial(prepared, {
  companies: ["DESC", "GPC"], from: "", to: "", includeUndated: true,
  shifts: { DESC: 0, GPC: 0 }, thresholdMiles: 25,
});
// React: useSpatialQuery(projects, versions, query)
```

The hook returns `status`, `result`, `progress`, `error` and `cancel`. `versions` contains `datasetVersion` and `geometryVersion`. Query inputs add optional `limit`, `timeBudgetMs`, `maxCandidates`, `maxNeighborsPerOrigin` and `windowMonths`.

| Field | Meaning |
| --- | --- |
| `possibleCount` | Exact cross-company combinations among selected records, computed from company sizes without pair enumeration. Includes records with unknown geometry. |
| `matchedCount` | Qualifying pairs actually established so far. Exact only when `complete` is true. |
| `matchedCountIsLowerBound` | True when cancellation or a work limit stops the search. Display as “at least”, never as the total. |
| `pairs.length` | Number retained for display/export, separately bounded even if counting completes. |
| `complete=true` | All candidate origins searched. Retained results are globally nearest within the query and exact count is available. |
| `complete=false` | Retained results are best **among visited candidates**; do not call them globally nearest or paginate them as exhaustive results. |
| `uncertainDateCount` | Selected records with month/year precision. Missing/invalid dates are separately governed by `includeUndated`. |
| `reason` | `complete`, `cancelled`, `time_budget`, `candidate_budget`, `neighbor_limit`, `invalid_range` or `invalid_threshold`. Invalid inputs return no matches with an explanatory reason. |

Default interactive limits are **200 retained pairs**, **150 ms soft query budget**, **250,000 inspected index points**, and **4,096 returned neighbors per origin**. `maxCandidates` limits inspected index points (including points later rejected by date eligibility), not only returned geographic neighbors. Diagnostics distinguish `visitedPointCount`, `candidateCount` returned for final checks, and `exactDistanceCount`. An interrupted synchronous index call may have inspected points without returning candidates; those do not count as established matches.

The time budget includes date/company filtering and cooperative yields. It is a soft limit: linear eligibility preparation, a synchronous index traversal checkpoint (every 64 inspected points), a bounded candidate batch and garbage collection can overshoot. Preparation itself is separate and synchronous inside the worker. No claim of hard real-time latency or universal subquadratic output is made. Dense output can still contain quadratically many matches.

## Worker, cancellation and export

The worker receives source records only when versions change, then reuses preparation across queries. Query and cancellation messages carry monotonically increasing request IDs. Superseding a query aborts its controller. Results/progress are emitted only for the active query; the React hook also rejects replies with an old request ID or dataset version. Stored state carries the complete query/dataset/geometry identity; the render return hides mismatched results and progress synchronously, before the passive effect starts a new request. Work yields to the event loop between batches so cancellation messages can arrive. Worker setup failures are surfaced. Environments without `Worker` use the same bounded engine on the main thread and do not receive an off-thread preparation guarantee.

Tests exercise the worker message handler for supersession, explicit cancellation and wrong-dataset rejection; they do not replace integration testing of a real browser Worker. UI rendering, transfer overhead and Leaflet limits require the main-app browser measurement. The engine returns eligible IDs, but rendering all 100,000 map markers is not endorsed by the query benchmark.

`querySpatialExport` is an explicit **bounded export** path: at most 20,000 retained rows, default two-second soft budget, one million inspected points and 20,000 neighbors per origin. Its response retains the same completeness/count fields. The caller must identify a partial export or a retained top subset. This is not an unlimited stream or a background all-pairs export. `compareProjects` remains available for the ten-row exhaustive fixture (including unlocated/distant pairs); larger exhaustive exports need a separate resumable, backpressured design before being offered.

## Reproducible benchmark

Run from the repository with installed pinned dependencies:

```sh
node --expose-gc --import tsx scripts/benchmark-spatial.ts
```

Raw results: [spatial-2026-09-26.json](benchmarks/spatial-2026-09-26.json). The script records hardware/runtime, seed, limits, query/build times, inspected/returned candidates, retained/known counts, phase/progress memory samples, slider index reuse, cancellation and oracle agreement. This is one measured run per configuration, not a statistically stable p95 claim.

Hardware: **Apple M5, 10 logical CPUs, 32 GiB RAM, macOS Darwin 27.0.0, Node 26.3.1**. Two equally sized companies. Seed 20260926. Sparse points span latitude −80…80 and longitude −180…180; dense points occupy a 0.01° box near 32°N, 81°W. A third adversarial distribution puts all A records at [0,0] and all B records at [30,0], so there are no nearby cross-company matches despite dense individual clusters. All points are explicitly synthetic. Default 25-mile radius and interactive limits above.

| Distribution | Records | Build ms | Query ms | Returned candidates | Known matches | Completion |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Sparse | 1,000 | 3.2 | 5.9 | 2 | 2 | Complete |
| Sparse | 10,000 | 11.8 | 26.7 | 295 | ≥295 | Inspection budget |
| Sparse | 100,000 | 109.1 | 38.0 | 1,953 | ≥1,953 | Inspection budget |
| Dense | 1,000 | 1.0 | 89.7 | 250,000 | 250,000 | Complete |
| Dense | 10,000 | 12.2 | 5.2 | 4,096 | ≥4,096 | Neighbor limit |
| Dense | 100,000 | 96.4 | 17.5 | 4,096 | ≥4,096 | Neighbor limit |
| Separated | 1,000 | 2.5 | 1.9 | 0 | 0 | Complete |
| Separated | 10,000 | 9.4 | 3.5 | 0 | 0 | Complete |
| Separated | 100,000 | 83.9 | 21.0 | 0 | 0 | Complete |

All three 100,000-record datasets have **2.5 billion possible** cross-company comparisons, calculated without materializing them. The dense 17.5 ms result is a bounded partial preview, not an exhaustive 2.5-billion-pair calculation. At most 200 pairs were retained; sparse 1k had two and separated fixtures had none.

Combined company KDBush buffers were 18,016 / 180,016 / 1,800,016 bytes at 1k/10k/100k (each company remains below 65,536 points and uses 16-bit IDs). Sampled process RSS ranged from 82.3 to 409.9 MiB across the shared-process sequence. Memory includes source records, runtime state, prior benchmark allocations and the earlier brute-force oracle; it is **not isolated per-index memory or an instrumented absolute peak**. Browser main-thread and worker structured-clone copies are not included. The raw file separates before/dataset/build/query samples.

At 1,000 records only, an additional unrestricted indexed run agreed exactly with brute force on count, top-200 IDs, order and unrounded distances for sparse, dense and separated cases. No dense 10k/100k brute-force oracle was attempted. Production limits remain enabled in the table above.

Stress cancellation deliberately disables candidate/neighbor caps and uses a whole-globe query. A 5 ms timer requested cancellation; total observed query duration was 5.5–13.6 ms across runs. Timer delivery can be delayed by a synchronous geographic traversal. Once delivered, return took approximately 0.11–1.37 ms; exact measurements are in the JSON. These are cooperative Node measurements, not browser end-to-end cancellation claims.

## Verification and next bottleneck

Focused tests cover original **25 possible / six near / 7.5480907-mile** regression, sparse/dense oracle agreement, strict threshold and metric conversion, antipodes, dateline/polar single points, midpoint distinction, missing geometry, duplicate IDs, escaped IDs, stable ties, precision/UTC/leap dates, original-data immutability, index reuse and geometry/company edits, adversarial separated clusters, work/result limits, cancellation and stale responses.

The practical next improvement is a resumable traversal that can continue a dense query across work budgets while retaining globally ranked results and exact progress. Current incomplete previews intentionally make no such promise. Main-app rendering/transfer, real-browser cancellation, larger-source ingestion memory and supported runtime checks remain integration responsibilities.

Implementation references: [KDBush](https://github.com/mourner/kdbush), [geokdbush](https://github.com/mourner/geokdbush), and [geokdbush geographic distance implementation](https://github.com/mourner/geokdbush/blob/main/index.js). The installed pinned implementation was inspected to establish the 6,371 km radius and finite-radius behavior.

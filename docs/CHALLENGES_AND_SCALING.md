# GridLock: challenges encountered and scaling decisions

Reviewed September 26, 2026 against commit `8f504ae`. This is a design note, not a record of implemented changes or benchmark results. It preserves the historical source data and the accepted Sperry clarification in [AGENTS.md](../AGENTS.md).

## Observed implementation and data constraints

| Challenge | Evidence in the current project | Consequence |
| --- | --- | --- |
| Eager pair generation | `compareProjects()` in [comparisons.ts](../src/lib/comparisons.ts) visits all unordered pairs, skips same-company pairs, calculates distances, stores every cross-company comparison, then sorts. | Normal map interactions should not require constructing all distant comparisons as datasets grow. |
| Repeated derived work | Centers and parsed dates are recalculated inside the pair loop. | Prepare each project's geometry and date once per dataset version. |
| Static application data | [App.tsx](../src/App.tsx) imports the generated ten-record JSON. | Developer regeneration requires a rebuild for the deployed sample. Runtime user datasets need a separate import path. |
| Workbook-specific contract | [import_workbook.py](../scripts/import_workbook.py) expects known columns and attaches reviewed annotations. Company types currently cover DESC/GPC. | Supporting unfamiliar worksheets requires mapping and validation, not accepting arbitrary objects as `Project`. Do not transfer reviewed annotations to unrelated uploaded IDs. |
| Approximate geometry | Supplied endpoint averages represent projects; single endpoints are fallback proxies. | These points do not establish route footprints, connectivity, driving distance or shared land. Arithmetic longitude averages also need reconsideration for global/dateline-spanning data. |
| Larger catalog lacks locations | [FORECAST_READINESS.md](FORECAST_READINESS.md) and the [catalog](../public/data/full_report_catalog.json) identify 44 DESC plus 208 active Georgia ITS IDs with no additional validated geometry. | Extracting more records does not automatically add verified map locations. Keep unlocated records visible in a catalog, off the map. |
| No validated forecasting labels | One supplied snapshot per reporting system; no actual construction start/end pairs. Thirteen completed-status rows contain previous planned need dates. | Old planned dates cannot train or validate a probability of actual future construction. Repeated summary/detail entries and phases are not independent outcomes. |
| Scenario dates and forecasts could be confused | Current scenarios shift cloned planned milestones; their shifted values occupy the clone's `originalDate` field. | A new unified timeline should use explicit source, scenario and forecast fields, with source evidence unchanged. |
| UI can become the bottleneck | Leaflet layers, list rows, pair objects, heat points and JSON payloads all grow. | Faster geographic queries alone do not make an unlimited browser dataset scalable. Measure rendering, memory, transfer and export as well. |

For the unchanged fixture, five DESC records times five GPC records produce 25 cross-company comparisons; six are strictly within 25 miles. This is a computed result, not 25 programmed matches. Jasper–Okatie and the supplied Goshen–McIntosh proxies are approximately 7.5480907 miles apart. The Georgia scope annotation identifies Goshen–Georgia Pacific; preserve that distinction.

## Complexity: the precise problem

Let `n` be the loaded record count and `k` the cross-company comparisons materialized. The current nested loops take O(n²), sorting takes O(k log k), and pair storage takes O(k). For two utilities, `k = nA * nB`; balanced utilities therefore produce quadratic output. At 10,000 records split evenly, that is 25 million comparisons.

No algorithm can explicitly return every qualifying pair in subquadratic time when all those pairs genuinely qualify: producing `k` outputs requires at least Ω(k) work. The achievable goal is to avoid unconditional all-pairs computation for radius searches, maintain bounded interactive work, and make expensive exhaustive exports explicit and cancellable. A spatial index is not a guarantee of O(n log n) total time on every distribution.

## Proposed geographic query design

1. Normalize/validate a dataset into immutable records with stable namespaced IDs. Prepare valid representative points and dates once.
2. For the present point-based, batch-loaded app, evaluate **KDBush plus geokdbush**. KDBush is a static flat KD-tree; geokdbush supplies geographic radius/nearest queries with spherical geometry and dateline handling. Build indexes for eligible geometry; query across utility groups and retain each unordered pair once.
3. Convert the app's `[latitude, longitude]` into the libraries' longitude-first arguments explicitly. Their radius unit is kilometers. Use conservative candidate retrieval and the existing exact application haversine/strict `< threshold` predicate for final inclusion. Reconcile Earth-radius constants and numerical boundaries; do not silently change the metric. Define behavior at radii approaching/exceeding half Earth's circumference.
4. Cache index data by geometry version, not slider position. Time/scenario changes should reuse geometry and update date eligibility. Rebuild after actual geometry changes, imports or committed edits. Avoid caching every possible radius's pair list.
5. Put expensive parsing/query work in a Web Worker, with request IDs, stale-response rejection, progress and cancellation. A worker keeps interaction responsive; it does not change algorithmic complexity.
6. Use bounded ranked results and virtualized lists where measured volumes require them. Distinguish total possible comparisons, total known matches, results displayed and results still being computed. Never cap a radius query and present the truncated count as exhaustive. Paginating an already materialized giant array does not solve memory growth.
7. Keep exhaustive comparison/export behavior available on demand, with documented cost and streaming/chunking where feasible. Computing the total possible cross-company count from group sizes does not require enumerating pairs. Do not promise globally nearest pagination by sorting arbitrary pages independently.

Use **RBush** when frequent incremental geometry edits or bounding boxes for actual routes justify a dynamic R-tree. It provides candidate boxes, not final geodesic route distances. For a shared persistent service, evaluate **PostgreSQL/PostGIS**, a GiST spatial index and `ST_DWithin` on geography. Geography uses meters and defaults to spheroidal distance; explicitly reconcile that with the current spherical metric and strict boundary. No database is necessary merely to display a static forecast JSON file.

Keep brute-force pair generation as a small-fixture correctness oracle and explicitly requested exhaustive path. Removing it from every test would make the optimization harder to verify.

## Required verification before calling this scalable

- Compare indexed IDs, distances and ordering with brute force on tractable seeded fixtures and the unchanged ten-record baseline.
- Cover identical points, stable tie ordering, duplicate IDs, missing geometry, companies with no eligible rows, filters, unit conversions and exact/below/above-threshold distances.
- Test dateline and polar geographic queries independently of the regional midpoint approximation; reject unsupported representative geometry rather than claiming global correctness from index tests alone.
- Exercise sparse, clustered and dense distributions at increasing sizes (for example 1k, 10k and 100k points), with time/memory budgets and cancellation. Do not run an exhaustive 100k dense oracle.
- Record index-build time, candidate count, query time, result count, peak memory, update/render latency and export behavior on named hardware. Record failure/limit cases. No benchmark has been run for this proposed implementation.
- Verify that a quick succession of slider/import edits cannot display results from an earlier dataset or query.

## Proposed import and timeline design

Keep the supplied dataset as a reproducible demo. Add a separate CSV/XLSX upload flow: choose sheet/header, map columns, state date meanings and coordinate order, preview row errors, accept a new dataset version, then explore. Support a documented template first, then known header aliases and manual mapping. Do not promise universal spreadsheet understanding.

The open-source `react-spreadsheet-import` project demonstrates upload, parsing, preview, column mapping and row correction. It uses Chakra UI and SheetJS; assess dependency and React compatibility before adopting the whole component. Prefer matching its workflow with the existing UI: Papa Parse for chunked CSV parsing and `read-excel-file` for XLSX parsing/schema support, with pinned verified versions and workers where appropriate. TypeScript types do not validate uploaded values at runtime.

Keep source records immutable. Store user corrections and scenario assumptions separately with their provenance; allow reset/export. Require explicit handling of ambiguous dates, duplicate identities, null coordinates, source precision and spreadsheet formulas. Imported data must never silently inherit the demo's research evidence. Introduce shared database persistence only when shared saved datasets, collaboration, audit history or server-side processing requires it.

Use one main map with a rolling date-range slider and a compact histogram, inspired by kepler.gl time playback. Provide distinct Planned, What-if and (only when available) Forecast modes. Future planned dates remain plans. User shifts remain assumptions. A planned implementation interval is not automatically actual field work. Keep evidence available from the same map.

## ML target and data gate

Recommended operator-facing forecast target, if evidence becomes available: for each already-known project and future calendar month, estimate whether actual field construction occurs on at least one day in that month, using only information available at the forecast cutoff. This can prioritize investigation of nearby cross-utility work; it does not establish compatibility of crews, confirmed savings, unseen future project locations, or exact simultaneous construction.

This refines the earlier cell-level aspiration into an interpretable per-project prediction. Two projects active in the same month need not be active on the same day. Do not multiply their marginal probabilities and label the result a validated joint-overlap probability. A true co-occurrence forecast needs a defined simultaneous-activity label and validated dependence treatment.

Features may include utility, work category, voltage/length where reliably available, known planned milestones, forecast lead time, status and historical revisions as of the cutoff. Labels require independently verified activity observations or construction intervals, including known inactive observations. Missing activity is unknown, not a negative label. Preserve gaps, cancellation and incomplete follow-up.

Start with a persistence/planning-window baseline and regularized logistic regression in scikit-learn; compare histogram gradient boosting only if sufficient independent outcomes exist. Fit preprocessing on training data. Use chronological cutoffs, outcomes available by each training cutoff, grouped project/phase identity, and untouched later evaluation. Do not randomly split related project-month rows or split a single plan by its future need-date years. Report Brier/log loss, reliability, positive/negative coverage and planner-facing precision/recall at the review budget; lack of meaningful baseline improvement is a reason not to ship probability claims.

If only archived plans can be linked, a separately declared target such as next-plan milestone revision may become evaluable. That predicts reported schedules, not actual construction. The supplied snapshots alone do not support that longitudinal experiment either.

For the present data, a useful ML addition is **assisted extraction**, not an invented forecast: retain tested parsers for known PDFs; benchmark Docling's layout/table/OCR pipeline or a Gemini structured-extraction adapter on unfamiliar public pages. Keep field/page evidence, hash/cache documents, represent missing values explicitly and require review before map/training inclusion. Measure extraction accuracy and review time. Do not train a custom document model without evidence it is needed; structured JSON guarantees do not establish factual accuracy.

If an activity model passes the data/evaluation gate, train and run batch inference offline in Python. Export a versioned manifest and per-project/month predictions with target, data hash, source cutoff, model version, evaluation evidence and eligibility/abstention reasons. React validates the schema and joins results by stable project identity. Load only the selected dataset/horizon at larger volumes. Uploaded projects with no compatible forecast stay unforecasted until a new inference run; altering source features invalidates associated cached results. Training does not run on map pans or slider changes.

## Challenge implications

The supplied ZIP challenge and separate event guide require interactive comparisons and ranked opportunities; neither specifies universal spreadsheet import or a particular ML architecture/API. The event guide offers a rough cost/impact estimate as a bonus. The user-confirmed Sperry reply permits centers or route-closest points, encourages adjustable thresholds and suggests ML. These settled clarifications are recorded in AGENTS.md.

The separately confirmed MLH Gemini API prize rewards Gemini API use; it is not an automatic Sperry scoring bonus. Meaningful document ingestion could be relevant, subject to current category/submission eligibility. Do not add an API solely to multiply prize targets or claim secondary eligibility without checking it.

## Research sources

Primary documentation checked September 26, 2026; tool choices above are engineering recommendations, not measured winners or benchmarks for GridLock.

- [KDBush](https://github.com/mourner/kdbush), [geokdbush](https://github.com/mourner/geokdbush) and [geokdbush distance/query implementation](https://github.com/mourner/geokdbush/blob/main/index.js).
- [RBush](https://github.com/mourner/rbush).
- [PostGIS spatial indexes](https://postgis.net/documentation/faq/spatial-indexes/) and [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).
- [react-spreadsheet-import](https://github.com/UgnisSoftware/react-spreadsheet-import), [Papa Parse](https://www.papaparse.com/docs), [read-excel-file](https://github.com/catamphetamine/read-excel-file).
- [kepler.gl time playback](https://docs.kepler.gl/docs/user-guides/h-playback).
- [Docling pipeline options](https://docling-project.github.io/docling/reference/pipeline_options/).
- [Gemini document understanding](https://ai.google.dev/gemini-api/docs/document-processing) and [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
- [scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html), [cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html), [histogram gradient boosting](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingClassifier.html).
- [Confirmed MLH prize page](https://www.mlh.com/events/shellhacks-b9/prizes).

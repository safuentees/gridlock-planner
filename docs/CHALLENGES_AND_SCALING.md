# GridLock: implemented extension and scaling decisions

Updated September 26, 2026 for the extension authorized after commit `76957ce`. The former design proposal is now an implemented browser-first workflow: one main-map timeline, runtime CSV/XLSX imports, reversible corrections, bounded spatial search and a narrowly evaluated Gemini extraction adapter. Original source bytes and the accepted [Sperry clarification](../AGENTS.md) remain unchanged.

## Product and data boundaries

The map, ranked nearby list and source evidence share one workspace. A rolling month-range slider and compact distribution support Planned and What-if modes. Planned uses source milestones with any explicit effective corrections. What-if adds separate whole-year shifts and an optional exact-day calendar-month gap; source records are never rewritten. Forecast visibly remains unavailable and continues showing source plans. Future plans are not predictions, and milestone proximity does not prove construction overlap.

The default ten-row workbook still has five examples per utility, 25 possible cross-company pairs and six strictly within 25 miles. The original DESC_3/GPC_3 proxies remain approximately 7.5480907 miles apart. Research identifies Goshen–Georgia Pacific as the Georgia work section while preserving the workbook's broader Goshen–McIntosh label. Neither researched geometry nor later dates silently replace baseline values.

The larger report catalog has 44 Dominion IDs and 208 active Georgia ITS IDs, with no verified additional map geometry. Georgia summary/detail rows repeat those identities; phases and report appearances are not independent jobs. All additional catalog locations remain null. See [forecast readiness](FORECAST_READINESS.md).

## Geographic work is bounded before display

The old unconditional pair materialization remains only as a small-fixture oracle. The interactive engine prepares stable IDs, representative centers and source-date bounds once per dataset version and builds company-partitioned KDBush indexes. geokdbush searches geographically; semantic eligibility is applied without allowing rejected same-company points to defeat its radius stopping. Conservative per-company spherical caps can reject wholly distant groups before tree traversal. Date/slider/shift changes reuse geometry; changed center coordinates or company partition membership rebuild relevant preparation. Full signatures guard reuse, and callers must change the dataset version for effective feature edits.

The app uses WGS84 `[latitude, longitude]`; index calls are explicitly longitude first. Candidate radius transfers the angle from GridLock's 3,958.7613-mile Earth radius to geokdbush's 6,371-km radius, with a numerical guard. Retrieval becomes unbounded at/above the antipode to avoid finite-radius folding; final inclusion still uses exact application haversine distance and strict unrounded `< threshold`. Unit changes preserve physical radius: 25 miles = 40.2336 km.

The representative point remains an arithmetic endpoint mean or single-endpoint fallback. That is a regional proxy, not a route, footprint, electrical connection or route length. Tests of single points near the dateline/poles do not establish that a two-endpoint arithmetic midpoint works across the dateline. Runtime imports/corrections reject that unsupported two-endpoint case.

Each unordered cross-company pair appears at most once with a stable encoded ID. The engine ranks retained results by exact distance and stable ID. A bounded heap retains up to 200 interactive pairs; it never sorts a materialized huge all-pairs array to simulate scalability. A worker isolates query work, rejects stale dataset/request responses and supports cancellation/progress. The hook suppresses stale state immediately when input identity changes. Time limits are soft and preparation remains finite synchronous worker work; they are not hard real-time guarantees.

| Count or limit | Meaning |
| --- | --- |
| Possible pairs | Exact combinatorial cross-company count from eligible utility sizes, including unlocated records; no pair enumeration required. |
| Established matches | Exact only when the search completes; otherwise a lower bound labeled “at least.” |
| Retained list | Up to 200 pairs. Complete search gives globally nearest retained results; incomplete search gives best visited candidates only. |
| Map markers | At most 1,200, with selected records prioritized and omitted marker counts explained. |
| Heat presentation | At most 5,000 points; spatial aggregation retains record weight and is labeled. |
| Exhaustive UI | Planned mode only, datasets of at most 20 records; at most 190 unordered pairs before excluding same-company pairs. |
| CSV export | Exactly displayed rows, with scope and search completeness. It does not silently export an exhaustive large query. |

For `nA` and `nB` records, true cross-company output can contain `nA × nB` pairs. No index makes explicitly returning that output universally subquadratic. Dense inputs can hit work/neighbor limits quickly. Narrow filters or accept an explicitly partial preview; large exhaustive export would require a separate resumable, backpressured design.

[PERFORMANCE.md](PERFORMANCE.md) and its raw benchmark record contain actual hardware, seeded sparse/dense/separated distributions, builds, query limits, inspected/returned candidates, memory samples, cancellation and oracle agreement. Run `npm run bench:spatial`. Read completeness alongside timing: a fast bounded preview is not a completed dense search. Node engine measurements exclude browser worker transfer and Leaflet rendering; browser checks need their own evidence. Do not copy an old timing into a new implementation's performance claim.

## Imports, corrections and cache identity

The implemented flow is upload → sheet/header → aliases/manual mapping → validation/preview → explicit acceptance. Papa Parse reads CSV; read-excel-file and fflate support XLSX handling. The workflow borrows the mapping pattern rather than adding react-spreadsheet-import's complete UI stack. A [CSV template](../public/templates/GridLock-projects.csv) defines the supported contract. No arbitrary spreadsheet interpretation or automatic geocoding is promised.

Imports are capped at 10 MiB and 25,000 selected data rows, with expanded ZIP, entry, sheet, column and cell bounds detailed in [IMPORTS.md](IMPORTS.md). Workers parse, validate and hash bounded inputs. Cancellation terminates work; request ownership rejects stale reads/responses. Formula-containing XLSX files are rejected even with cached results. Invalid/duplicate identities, unsupported or ambiguous dates, coordinate-pair errors and precision mismatches block acceptance rather than silently dropping rows. Previews are bounded, while every selected row is validated.

Imported IDs are namespaced by source identity and sheet, retain source IDs, and never acquire the demo's research annotations. The unchanged file's full SHA-256 identifies source bytes. Feature hashes cover effective inputs; geometry fingerprints cover IDs/endpoints. Company membership is additionally part of the spatial partition signature. Date-only edits update features while retaining geometry reuse.

Corrections require reasons and remain separate from the original dataset; applying them produces effective clones and new hashes when relevant inputs change. What-if shifts are a separate assumption layer. Corrections can be reset and exported as versioned JSON with source identity and patches. There is no correction-file import UI. Imports, corrections and review acknowledgments last only for the browser session; save the original file and download corrections before refreshing. Acceptance or restoring the demo starts fresh exploration state.

Displayed CSV exports retain source/effective dates, precision, meaning, explicit scenario shifts, unrounded distances, hashes and scope/completeness. Source evidence always resolves to originals. A corrected or shifted date must never be labeled an original source date.

## The bounded ML decision

The eventual target is **documented field-construction activity for a known project in a future calendar month, using only information available at the forecast cutoff**. This may help prioritize investigation; it cannot discover unseen project locations, prove same-day overlap or quantify savings by itself. Two projects active in one month need not overlap on one day; multiplying marginal probabilities does not create a validated joint-overlap forecast.

The audit found planning snapshots, not an adequate cohort of verified activity intervals and independently established inactive observations. Thirteen completed-status rows carry previous need dates, not actual completion dates. Missing activity stays unknown. Report duplicates/phases are not independent outcomes. Splitting one snapshot by future need years would not be temporal evaluation. Case-level newer schedules do not supply a linked plan-vintage panel with untouched evaluation either. Both activity and schedule-revision forecasts remain unsupported; no forecasting model or artificial outcome labels were created.

The implemented alternative is one pretrained **Gemini structured-extraction adapter**, retaining deterministic parsers for supported PDFs. Ten purposively selected public pages, first project only, cover eight fields each. Frozen visually checked reference fields and configuration preceded ten actual inference calls. Gemini matched 80/80 selected field values (42 nonmissing, 38 missing); the deterministic parser matched 48/48 across six supported pages and abstained on four unfamiliar-layout pages. All four unfamiliar pages come from one report, and a project appears across splits. The reference was checked by Codex, not independently human double-annotated. This is a narrow observed result, not general accuracy or an independent-project holdout.

Zero selected-field mismatches, date-meaning errors or unsupported nonempty fills were observed. Ten inference calls took 226.469 seconds total, 16.281 seconds median. Human review seconds and time savings were not measured; correction-cell counts are a limited proxy. See [EXTRACTION_EVALUATION.md](EXTRACTION_EVALUATION.md) for exact metric definitions, provenance and limits. Structured JSON and source quotes alone do not establish factual correctness.

The adapter caches raw responses outside tracked source by document/page content, model, prompt, schema and generation configuration. API credentials stay in the process environment, never the browser bundle. Structured results retain source hashes, one-based PDF pages, evidence quotes, missing reasons and review status. All results are review-required, map-ineligible and training-ineligible. A session review acknowledgment cannot promote records automatically: identity, scope, date meaning/precision and evidence need review; mapping also requires credible geometry; training requires a separate outcome/temporal-data audit.

Reproduce the recorded metrics without an API key:

```sh
python -m pip install -r scripts/requirements-extraction.txt
python -m unittest discover -s scripts/extraction -p 'test_*.py' -v
python scripts/extraction/benchmark.py evaluate --check
```

A new live run is explicit and may vary. The highest-value next extraction improvement is human-double-annotated evaluation across more report families, including scans, multi-page records and partial dates, with separate development/evaluation sets and actual review timing.

## Future forecasting and infrastructure gates

A future activity experiment needs archived publication cutoffs, stable project/phase identity, outcome observations and appropriate geometry. Start with planning-window/persistence and regularized logistic regression baselines. Fit preprocessing on training data only; group related projects/phases; use chronological cutoffs and only outcomes available by each cutoff; keep tuning/calibration separate from untouched later evaluation. Compare histogram gradient boosting only if justified. Report class coverage, baseline performance, Brier/log loss, reliability and precision/recall at a declared review budget before claiming useful probabilities.

The browser already validates a v1 external forecast contract: stable dataset/project identity, source hash, effective feature hash, target, cutoff, model version and complete future project-month records with a probability or explicit unavailable reason. Missing records are not zero probability. Uploads/relevant corrections invalidate incompatible results. Compatibility alone proves neither model quality nor calibration. No forecast manifest is currently used by the UI to display estimates; inference/training never runs on sliders.

Keep browser-first operation and offline Python jobs. RBush remains an alternative if frequent incremental route/bounding-box edits justify it. A shared persistent geographic service could use PostGIS/GiST and `ST_DWithin`; reconcile spheroidal meters with the current spherical strict-distance metric before replacement. Shared persistence, secret-key services or live inference must have a concrete need before adding a backend. No vector database, multi-provider pipeline or custom document model is needed for this evaluated slice.

## Verification and collaboration

Run `npm run format:check`, `npm test`, `npm run build` and `git diff --check`; spatial changes additionally run `npm run bench:spatial`. Preserve `python scripts/import_workbook.py --check` and `python scripts/extract_reports.py --check` for supplied-data reproducibility. Run the extraction offline checks when its code/reference changes. Validate source hashes rather than rewriting originals.

Tests cover the original 25-pair oracle, strict thresholds/units, missing data, precision and calendar edges, index reuse, separated utilities, bounded counts, cancellation/stale replies, parser failures, duplicate IDs, corrections/reset and incompatible forecasts. Real-browser checks must exercise the unified timeline, large imports, display bounds, source-versus-effective evidence, CSV scopes, responsive layout and cancellation; an app build or Node benchmark does not prove them.

Four concurrent responsibilities are spatial/performance; ingestion/provenance/ML; main-map timeline/import UI; and integration/testing/docs/demo. Coordinate shared types, App.tsx and dependency edits, use isolated worktrees and preserve the existing initial-owner and later PR workflow. Recalculate remaining time against the recorded September 27, 2026, 11:00 a.m. EDT deadline; preserve rest, verification, three-minute rehearsal and submission buffer rather than assuming a fresh hackathon window.

## Challenge implications

Sperry remains primary. Its user-confirmed clarification permits explained centers or route-closest points, adjustable cutoffs and the supplied historical values; no particular model/API is prescribed. The original challenge evidence and event-rule record remain unchanged. The Gemini experiment does not itself establish a Sperry scoring bonus or secondary prize eligibility. Verify category-specific requirements and outstanding submission/disclosure details before claiming eligibility; do not add integrations solely to multiply prize targets.

## Research sources

Primary documentation was checked September 26, 2026. The measured implementation is documented above and in PERFORMANCE.md; alternative tools below remain future options, not additional installed systems.

- [KDBush](https://github.com/mourner/kdbush), [geokdbush](https://github.com/mourner/geokdbush) and [geokdbush distance/query implementation](https://github.com/mourner/geokdbush/blob/main/index.js).
- [RBush](https://github.com/mourner/rbush).
- [PostGIS spatial indexes](https://postgis.net/documentation/faq/spatial-indexes/) and [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).
- [react-spreadsheet-import](https://github.com/UgnisSoftware/react-spreadsheet-import), [Papa Parse](https://www.papaparse.com/docs), [read-excel-file](https://github.com/catamphetamine/read-excel-file).
- [kepler.gl time playback](https://docs.kepler.gl/docs/user-guides/h-playback).
- [Docling pipeline options](https://docling-project.github.io/docling/reference/pipeline_options/).
- [Gemini document understanding](https://ai.google.dev/gemini-api/docs/document-processing) and [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
- [scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html), [cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html), [histogram gradient boosting](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingClassifier.html).
- [Confirmed MLH prize page](https://www.mlh.com/events/shellhacks-b9/prizes).

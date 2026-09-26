# Agent instructions — GridLock

## Purpose and scope

GridLock helps people explore concentrations of utility planning records, compare nearby work across companies, inspect supporting evidence, and investigate explicit future scenarios. The initial utilities are Dominion Energy South Carolina (DESC) and Georgia Power (GPC).

The team has four capable members. Prioritize internship value, a strong portfolio and a coherent competition entry: understandable engineering, reproducible data, useful interaction and a reliable demonstration. Sponsor API access can be obtained, but do not assume credentials are provisioned. Add sponsor technology only when it materially improves the product; maximizing the number of integrations is not the objective.

This is a separate project and Git repository. Preserve the sibling Metal portal app, the historical ShellHacks study, original challenge ZIP and original research files. The user authorized the scalable extension: one main-map timeline, runtime imports, bounded spatial queries and a defensible ML evaluation. Earlier stop-before-implementation and narrow ten-record-only scope instructions are superseded. Keep further work within the current request rather than restarting project selection or infrastructure planning.

Read `README.md` for operation, `CONTRIBUTING.md` for team workflow, and relevant source files before changing behavior. This file records settled decisions; current user instructions and newly verified evidence can update them. Keep instructions portable and avoid machine-specific paths or credentials.

## Settled Sperry clarification

The user supplied a direct Sperry reply on September 26, 2026. Treat that reply as accepted challenge clarification, distinct from an independently retrieved public rule:

- Either representative center points or closest points along routes are acceptable when the method is explained.
- Either 25 miles or 40 km is acceptable; an adjustable threshold is encouraged.
- Use the supplied historical values as-is. Sperry suggested machine learning, but the user explicitly requires a credible evaluation or an honestly labeled exploratory alternative.

These answers resolve the earlier disagreement between the separate event guide's closest-point/40 km wording and the ZIP's center-point method. Do not reintroduce that conflict as an unanswered blocker or ask the user to contact Sperry again.

The implemented choice is approximate center points with a 25-mile default and adjustable units/threshold. The strict distance boundary below is our documented implementation choice, not an extra sponsor requirement.

## Data and evidence contract

- Keep the supplied workbook and PDFs in `public/sources/` byte-for-byte unchanged. `.gitattributes` marks them as binary. Source hashes are recorded in `docs/VERIFICATION.md` and generated metadata.
- Workbook dates and coordinates drive the baseline map, filters, comparisons and scenarios. Do not silently replace them with researched corrections, guessed coordinates, newer schedules or current dates.
- Runtime CSV/XLSX imports are separate datasets with namespaced IDs and no inherited demo research. Keep source records immutable; reversible user corrections form a separate effective dataset, and what-if shifts remain a third layer. Imports/corrections last only for the current browser session. Acceptance of a new dataset or reset to the demo starts fresh exploration state; do not carry another dataset's selection, corrections or assumptions into it.
- Preserve full source-file SHA-256, effective feature hash and geometry fingerprint. Feature edits invalidate incompatible forecast manifests. Every effective edit must change the spatial dataset version when its feature inputs change; date-only edits reuse geometry. Company partition membership also participates in spatial index reuse checks. Do not use a dataset name/ID alone as a feature-cache version.
- Keep annotations in `data/review_annotations.json`; regenerate `src/data/projects.json` and metadata with `scripts/import_workbook.py`. Update generators and source annotations rather than hand-editing generated records.
- Preserve source URLs, PDF pages, document/snapshot dates, review dates, date precision and missing information. A review date is not a publication date; PDF creation metadata is not proof of publication. Separate status evidence from schedule evidence when their sources differ.
- Distinguish observed source statements, user-confirmed information, proposed assumptions and unresolved details. A historical sample is not automatically a verified current opportunity. A past planned date does not prove completion or cancellation.
- Dominion examples contain planned in-service dates. Georgia examples copy **need dates** from a December 2024 planning snapshot, despite the workbook's generic date-column name. Neither establishes actual construction start/end or simultaneous activity. Georgia report implementation-start fields are planning lead-time milestones, not automatically observed field construction.
- Keep unknowns null/explicit. Do not convert missing coordinates into zero coordinates, missing dates into today, or year/month precision into an invented day.
- The additional full-report catalog is unlocated. Keep those records off the map until credible coordinates and their provenance are added. Do not fabricate geocoding or reconstruct redacted/restricted report fields.

The dated report assessment is in `docs/FORECAST_READINESS.md`: 44 distinct Dominion project IDs and 208 active Georgia ITS IDs. Georgia summary and detail sections repeat the same IDs; they are not 416 independent jobs. The 13 completed-status rows contain last year's need dates rather than actual completion dates. Keep phases, repeated versions, sponsor/ownership distinctions and recorded source conflicts explicit. These are baseline findings, not constants to force onto future datasets.

## Comparison and geometry contract

Keep calculation logic independently testable from React and Leaflet. `src/lib/comparisons.ts` remains the exhaustive small-fixture oracle; `src/lib/spatial.ts` and `src/lib/temporal.ts` implement bounded interactive search and precision-aware time handling.

- Coordinates are WGS84 `[latitude, longitude]`. Validate complete coordinate pairs and ranges. Use the arithmetic mean of the two supplied endpoints, or the single available endpoint as a fallback. No usable endpoints means an unknown representative point.
- These are approximate representative points, not verified routes, construction footprints, electrical connectivity or route lengths. The dashed connector shows measured separation only. Reassess the midpoint approximation before extending beyond this regional dataset.
- Use haversine straight-line distance between representative points. Current constants are 3,958.7613 miles for Earth radius and 1.609344 km per mile.
- Each distinct unordered cross-company pair may appear at most once. Require unique project IDs and stable pair IDs. Interactive nearby queries use company-partitioned KDBush/geokdbush candidate search, conservative geographic bounds, and the exact final application metric. Never hardcode the demonstration pair or materialize all pairs before truncating them.
- Rank by unrounded distance ascending, stable ID on ties, unknown distances last. Eligibility for the nearby view is `distance < threshold`; equality is excluded. Unit changes preserve physical radius: 25 miles = 40.2336 km. Round only for presentation.
- Parse valid ISO calendar dates using UTC semantics; date filters are inclusive. Month/year precision represents a possible interval; include it when that interval overlaps the filter, without inventing an exact day. Exact milestone gaps and calendar-month gap checks require two exact-day dates. No selected companies means no records. An invalid date range yields no results with an explanation. Preserve the explicit include-undated behavior.
- The interactive list retains at most 200 nearby pairs. Distinguish possible combinations, established matches and displayed rows. Incomplete counts are lower bounds, and incomplete rankings are best among visited candidates, not necessarily globally nearest. Preserve budgets, progress, cancellation and synchronous rejection of results belonging to an old query/dataset. Dense output can be quadratic.
- The UI exposes exhaustive comparison only in Planned mode for datasets of at most 20 records (at most 190 unordered pairs before excluding same-company pairs). Export exactly displayed rows and label scope/completeness; do not imply a large all-pairs export. Keep source dates, effective corrections, scenario shifts, precision, meaning and hashes explicit in exports.
- The unchanged ten-row baseline has five examples per company, 25 comparisons and six qualifying pairs at 25 miles. Adding valid DESC/GPC rows must expand comparisons automatically. Treat these counts as regression expectations for that fixture, not hardcoded product limits.

The detailed case is `DESC_3` with `GPC_3`: Jasper–Okatie and the workbook's broader Goshen–McIntosh label. Original proxies produce approximately **7.5481 miles** and **517 days** between milestones. Research identifies the actual Georgia rebuild section as **Goshen–Georgia Pacific**. Preserve both identities and explain the scope mismatch. Do not substitute corrected section geometry or newer milestone dates into baseline results, or describe this pair as proven concurrent work.

## Timeline, scenarios and ML

Use one map with a rolling month-range slider and compact milestone distribution. Planned mode shows source milestones with any explicit effective corrections; What-if adds whole-calendar-year shifts; Forecast is unavailable and clearly leaves source plans visible. Future plans and historical density are not predictions.

- What-if shifts operate on separate date bounds, never on source objects or annotations. Clamp leap-day anniversaries to February 28. Optional milestone-gap eligibility is inclusive: later day on or before earlier day plus the selected calendar months, clamped to month end. Unknown or imprecise dates cannot establish that exact gap.
- Evidence always resolves to source records; show corrections and assumptions separately. Reset assumptions to inspect unchanged effective dates. The original single-target-year helper remains a tested utility, not the current main-map interaction contract.
- The histogram describes possible milestone-month coverage, including uncertainty. Heat weights represent selected records, not cost, probability or actual activity. Presentation is bounded to 1,200 markers and 5,000 heat points; aggregated heat weights retain record counts. Explain sampling/aggregation beside the map.
- The eventual forecasting target is documented field-construction activity for a known project in a future calendar month, using only information available at the forecast cutoff. Missing activity is unknown, never an inactive label. Do not count repeated report sections/phases independently, split one snapshot by future need years as temporal validation, or invent outcomes.
- Activity and schedule-revision forecasting remain unsupported by the audited evidence. No forecasting model was trained. A future experiment needs linked frozen plans, observed outcomes, grouped project/phase identities, chronological evaluation and meaningful baseline comparisons. Two projects active during one month do not establish simultaneous work; do not multiply probabilities into an unsupported joint-overlap claim.
- Preserve the versioned forecast validator's source identity/hash, effective feature hash, cutoff, model version and project-month availability. Compatibility is not evidence of calibration or quality. New uploads or changed features require compatible inference; sliders do not train models. No forecast manifest is currently used to display predictions.
- The implemented ML component is a Gemini structured-extraction experiment, with deterministic parsers retained for known reports. Its 80/80 selected-field result covers ten purposively chosen pages, eight fields and only the first project per page. The reference was visually checked by Codex, not independently human double-annotated. Do not call this general extraction accuracy, a learned construction model or measured human time savings.
- Keep API keys outside browser/Git, raw responses in an external content/configuration cache, and source hashes/page evidence/missing reasons in structured results. All extraction results remain review-required, map-ineligible and training-ineligible. Review identity, scope, date meaning, precision and source evidence before promotion; mapping additionally needs credible geometry. See `docs/EXTRACTION_EVALUATION.md`.

## Implementation and interaction

Use the existing React/TypeScript/Vite app, Tailwind, Base UI controls, Lucide icons, Leaflet and Leaflet.heat. Read dependency versions from `package.json`/the lockfile and use the Node version in `.nvmrc`. Core operation needs no API keys, backend, login or Python runtime; Python is optional for data regeneration.

| Responsibility | Location |
| --- | --- |
| Main-map state, timeline, effective datasets and scenario orchestration | `src/App.tsx`, `src/components/TimelineControl.tsx` |
| Map, heat layer, selection and tile fallback | `src/components/ProjectMap.tsx` |
| Original/source/research inspection | `src/components/EvidencePanel.tsx` |
| Report coverage and forecasting limitations | `src/components/DataReadiness.tsx` |
| Geometry oracle, bounded spatial queries and time precision | `src/lib/comparisons.ts`, `src/lib/spatial.ts`, `src/lib/temporal.ts` |
| Spatial worker ownership and stale-response protection | `src/workers/spatial.worker.ts`, `src/hooks/useSpatialQuery.ts` |
| Runtime imports, source-preserving corrections and forecast compatibility | `src/components/ImportWizard.tsx`, `src/components/OverridesPanel.tsx`, `src/lib/imports.ts`, `src/lib/datasets.ts`, `src/lib/forecast.ts` |
| Displayed comparison exports and bounded map presentation | `src/lib/exports.ts`, `src/lib/mapPresentation.ts` |
| Offline ML extraction and its evidence UI | `scripts/extraction/`, `src/components/ExtractionReview.tsx` |
| Shared contracts | `src/types.ts` |
| Workbook and full-report generation | `scripts/import_workbook.py`, `scripts/extract_reports.py` |

Preserve map/heat modes, adjustable distance, company/date filters, ranked comparisons, evidence access and CSV export. Keep empty/invalid states actionable. Individual-project focus, pair focus and showing all locations must behave distinctly. Basemap failure must leave comparisons, points and local evidence usable. Clean up Leaflet layers, listeners and observers on unmount; do not accumulate duplicate maps during development.

Imports follow upload → sheet/header selection → mapping → validation/preview → explicit acceptance. Limits are 10 MiB and 25,000 selected data rows, with additional workbook expansion/cell bounds in `docs/IMPORTS.md`. Use the template, aliases and manual mapping; do not promise arbitrary spreadsheet understanding. Require explicit coordinate order, date format, precision and meaning. Reject formulas and invalid/duplicate records without silently accepting a subset. Worker parsing and request gates must survive cancellation and rapid file changes. Overrides need reasons and reversible reset; downloadable correction JSON is separate from the immutable source file.

Utility/scenario controls show at most 100 searchable names at once. Keep membership tests and per-company date-limit preparation linear in record count; avoid scanning all records once per utility.

Use accessible primitives and semantic controls, visible keyboard focus, clear labels, restrained styling and responsive layouts. Preserve OpenStreetMap attribution and third-party notices. Keep data uncertainty beside the affected claims without filling the product flow with implementation details. Do not add animation, accounts or infrastructure as incidental scope.

## Git and four-person collaboration

Before editing, inspect repository, branch, status and applicable instructions. A clean HEAD is the checkpoint; do not create an empty checkpoint commit. Review dirty work, preserve unrelated edits and checkpoint only intended project work before new edits. Never discard experiments or use a destructive reset to obtain a clean tree.

Follow `CONTRIBUTING.md`: shared integration branch `main`, one short-lived task branch per change, and separate clones/worktrees for concurrent work. Do not switch a shared checkout underneath another contributor. Coordinate these four areas:

1. Spatial engine and performance, including its worker and benchmark.
2. Data ingestion, provenance and ML evaluation; preserve source bytes and review gates.
3. Main-map timeline and import UI; coordinate shared `src/App.tsx` changes.
4. Integration, testing, documentation and demo; agree shared types/dependencies with their owners.

Give dependency/lockfile changes one owner at a time. Use Conventional Commits, stage explicit paths and commit completed verified work. Do not commit secrets, private data, dependencies, build products or local verification output. Keep actual release versions aligned between `package.json` and `CHANGELOG.md`; document unreleased changes without inventing a release.

The initial team import uses **Create a merge commit** to preserve both histories. Later task PRs use **Squash and merge**, one teammate approval, resolved comments and passing checks. Preserve the simplified initial-owner sequence in `docs/REPOSITORY_OWNER_SETUP.md`; do not restore the superseded, more complicated initial handoff. Confirm live remote/PR/CI/protection state when needed rather than treating setup notes or cached refs as current proof.

Do not push, publish, submit, merge a remote PR, rewrite history, delete branches or message other people unless the user has authorized that action. Existing authorization persists; routine local implementation and verification do not need repeated confirmation. Do not claim hosted checks, collaborator access or branch protection are enabled merely because their configuration is documented locally.

## Verification by change

For application changes, run:

```sh
npm run notices:check
npm run format:check
npm test
npm run build
git diff --check
```

Use `npm ci` on a fresh checkout or after dependency changes. For workbook/annotation/extraction changes, install `scripts/requirements.txt` and also run:

```sh
python scripts/import_workbook.py --check
python scripts/extract_reports.py --check
```

Regenerate intentionally changed outputs first, then use read-only checks to establish reproducibility. Preserve source hashes. Add focused tests for changed behavior, including distant/missing pairs, boundaries, units, date validity, scenario immutability and calendar edge cases where relevant. Never weaken expected results merely to obtain passing checks.

For extraction adapter/evaluation changes, install `scripts/requirements-extraction.txt` and run the offline checks:

```sh
python -m unittest discover -s scripts/extraction -p 'test_*.py' -v
python scripts/extraction/benchmark.py evaluate --check
```

For spatial changes, also run `npm run bench:spatial`, the seeded benchmark documented in `docs/PERFORMANCE.md`. Cover sparse, dense and separated-utility distributions, strict boundaries, dateline/polar representative points, index reuse, lower-bound counts and cancellation. Record actual hardware, limits and measured timings; a fast partial preview is not a completed dense query. Browser rendering/worker transfer measurements are separate from Node engine benchmarks. Exercise import failures, date precision, corrections/reset, stale responses and forecast invalidation when those contracts change.

For UI changes, exercise the affected flow in a real browser on desktop and a narrow screen; include a screenshot in the PR. Check map/heat selection, filters, source inspection, original-vs-shifted dates, export or tile failure as the change warrants. A build does not establish these interactions.

Documentation-only changes require content, relative-link/path and whitespace review, not an unrelated app rebuild. `format:check` currently covers application source, not Markdown or workflow YAML. Historical verification records are evidence of past checks only; report exactly what ran for the present change, failures and any unverified behavior.

## Competition context and communication

Use `docs/event-rules.json` as dated rule evidence and `docs/DEMO_HANDOFF.md` for the demonstration/submission plan. The recorded 2026 deadline is September 27 at **11:00 a.m. EDT**, with a **three-minute live demo**. Recalculate remaining time from the actual clock; do not reuse an old countdown or assume a new 36-hour window. Reserve testing, rest, rehearsal and submission recovery time.

Distinguish the submission opening from the unverified exact hacking start. Preserve event-period work requirements, library/external-code attribution, AI-assistance disclosure and the distinction between pre-event research and event-created implementation. The public-rule review did not settle every AI-specific, research-reuse or authenticated-form requirement; these remain targeted submission checks, not reasons to reopen resolved Sperry questions or halt unrelated local work.

The user confirmed the eight earlier MLH sponsor challenges apply to ShellHacks 2026: ElevenLabs, Gemini API, Solana, Tiger Data, DigitalOcean, Snowflake API, MongoDB Atlas and GoDaddy Registry. Do not re-litigate that edition confirmation because of mixed labels, or describe that inventory as exhaustive. Multiple categories may accept one project under the supplied guide, but verify each secondary category's own requirements before claiming eligibility. Do not add integrations solely to collect categories.

If revisiting the historical winner study, preserve its dataset and distinguish observed associations from causal claims. Ranking weights are judgment, not findings from winners; never invent winning probabilities or assert sponsor categories are easier to win.

Communicate briefly: what changed, why, how it was checked and any material limitation. Keep the working demo and handoff concrete. Never claim publication, submission, live opportunity status, predictive performance or checks that have not actually been established.

# GridLock

Explore nearby utility planning records, inspect their evidence, import a separate dataset, and test explicit schedule assumptions in one map. This ShellHacks 2026 / Sperry prototype now includes bounded spatial search and an evaluated Gemini document-extraction experiment. It does not forecast construction activity.

## Run locally

Use the Node version in `.nvmrc` (24.14.1) and npm:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173/**. Keep the terminal running; Control-C stops it. For a production preview:

```sh
npm run build
npm run preview
```

The preview uses the same URL. Core app operation needs no API key, backend, Python runtime or account. Source files and the recorded extraction evaluation are local. Internet is needed for OpenStreetMap tiles and external evidence links; tile failure leaves local points, comparisons and evidence usable. A new live Gemini extraction run is an optional offline Python job with an environment-provided key, never a browser request. [Demo and submission handoff](docs/DEMO_HANDOFF.md).

## Explore the workspace

The map fills the workspace. Its large count shows nearby cross-utility pairs; green circles and numbered utility markers identify participating projects. Enable utilities at the top left, adjust distance at the bottom left, then open **Comparisons** and expand a row to inspect its timing and source evidence in place. Click it again to collapse; opening a row does not scroll to a separate details section. Location checkboxes remain under **Filters → Locations**. Use the export icon in the panel header to choose displayed comparisons or the selected comparison as CSV.

- Utility toggles preserve each location's saved checkbox. Participation requires both controls and the date filters to allow the record. Unchecked locations remain searchable in **Locations**.
- Selecting a location makes it the explicit reference for nearby cross-utility comparisons. **Compare all locations** returns to all eligible pairs. **Focus** and **Show all** are distinct actions under **Map settings**. Selecting a pair draws one solid, labeled separation line; it does not depict a route.
- The top-right header places **Filters**, **Map settings** and **Map help** icon buttons beside **Data tools**. Hover labels and accessible names identify each tool.
- **Filters** contains the planning timeline, unknown-date inclusion, small-data exhaustive view and what-if year/gap assumptions. The desktop map shows a simple filtered project count; the map count identifies active what-if mode; detailed shifts remain in Comparisons and Filters.
- **Map settings** controls Light/Dark appearance, the density heat overlay and half-threshold radius circles (on by default). These visual controls do not change matches. **Map help** explains utility icons, strict distance boundaries and source limitations.
- Click or keyboard-activate the **Nearby pairs** card to expand its distance slider, km/mi switch and exact-value editor. The bottom-left distance card is removed. Closing preserves the editor draft.
- The 25-mile default is preserved. Switching km/mi preserves physical distance. The maximum is **250 km**, or approximately **155.342798 miles**. Typed entries must be integers; converted values retain decimals. The slider uses whole-unit stops plus the exact converted maximum. Invalid edits leave the active limit unchanged.
- **Upload dataset**, beside Data tools, opens a simple same-page picker. The map starts empty. Download the ten-project sample CSV to your computer, then choose it (or your own CSV/Excel file) to populate the map. Files using the explicit template columns load automatically after validation. Closing preserves the unfinished import and current map. Accepting a different dataset starts a fresh workspace.
- **Data tools** contains corrections, extracted-field review and source files. Closing preserves filters, selection and unfinished drafts/checks.
- Forecast estimates remain unavailable. Historical planning milestones are not observations of current construction.

[Current map workspace and verification](docs/MAP_WORKSPACE.md). The [earlier interface audit](docs/INTERFACE_REFINEMENT.md) remains a historical record of the prior layout.

The unchanged supplied dataset contains ten projects, **25 possible cross-company pairs and six strictly below 25 miles**. In Planned mode, datasets of at most 20 records can expose all comparisons, including distant/unlocated ones (at most 190 unordered pairs before excluding same-company pairs). Larger datasets use the bounded nearby workflow.

The Jasper–Okatie / Goshen case retains the workbook's broader Goshen–McIntosh label and its original proxies: approximately **7.5480907 miles** and **517 days** between milestones. Reviewed Georgia work is Goshen–Georgia Pacific. Researched geometry and later schedules remain annotations; this pair is not proven concurrent construction.

## Import and correct a dataset

Choose **Upload dataset** at the top right, then select a file. Use one CSV or Excel sheet containing both companies. **Columns and date settings** lets you select a sheet/header, check suggested columns and declare coordinate order and date format/precision/meaning. Files with the complete template schema and a single sheet validate and populate automatically. Other files keep **Columns and date settings**; choose **Import dataset** after checking those settings. Invalid files never populate. Replacing an existing workspace requires confirmation. Start with the [ten-project historical sample](public/templates/GridLock-10-project-sample.csv) or [CSV template](public/templates/GridLock-projects.csv). Limits include **10 MiB per file and 25,000 selected data rows**; workbook expansion/cell limits are detailed in [Imports](docs/IMPORTS.md). Parsing, validation and hashing use a cancellable worker. Invalid rows prevent acceptance; rows are never silently discarded.

Imports have namespaced IDs, their own source hash and no inherited demo research. No geocoding or arbitrary spreadsheet interpretation is promised. Formula-containing XLSX files require a values-only copy. Unknown coordinates and dates remain unknown; ambiguous day formats require a choice. Dateline-crossing two-endpoint midpoint proxies are rejected.

Corrections are separate, reversible patches with reasons. Original files and records stay unchanged; effective feature and geometry hashes track changes. Download correction JSON before refreshing. **Imports, corrections and review acknowledgments are session-only.** Accepting a dataset starts fresh exploration state; reloading starts empty. There is no shared persistence or correction-file import UI.

## Bounds, counts and exports

Interactive search uses company-partitioned KDBush/geokdbush indexes and the exact final haversine metric. Geometry is reused across date/slider changes; changed coordinates or company partition membership require a new index. Query budgets and cancellation keep work bounded. Dense data can still contain quadratically many qualifying pairs.

The list retains at most **200 nearby pairs**. Possible pair counts, established matches and displayed rows are separate. A complete search gives the exact count and nearest retained results; a bounded search reports **at least** the established matches and the best visited pairs, which may not be globally nearest. The map shows at most **1,200 markers/circles**, **200 match connectors** and **5,000 heat points**; labeled aggregation preserves total record weight. These presentation limits do not remove underlying dataset records.

CSV export contains exactly the displayed rows, with scope/completeness, unrounded distance, source/effective dates, date meaning/precision, assumed shifts and source/feature hashes. It does not promise every match from a large dataset. Source values, effective corrections and scenario assumptions remain distinct. [Measured engine limits and reproducible benchmark](docs/PERFORMANCE.md).

## What the ML experiment established

Gemini extracted eight fields for the first project on each of ten purposively selected public report pages. The September 26 run matched **80/80 selected field values** against a frozen reference: 48/48 on six known-layout pages and 32/32 on four unfamiliar-layout pages. The deterministic parser also matched 48/48 on its six supported pages and abstained on the unfamiliar layout.

Codex visually checked rendered source pages; the reference was **not independently human double-annotated**. This result does not establish general extraction accuracy. The four unfamiliar pages share one report, and a project appears across report splits. Ten actual API calls took 226.469 seconds total (16.281 seconds median). No custom model was trained; no human review time savings were measured.

All extracted records retain source hash/page evidence, explicit missing values and **review-required, map-ineligible, training-ineligible** status. A session review acknowledgment does not approve a map location or training label. Identity, scope, date meanings and evidence need review; map inclusion additionally needs credible geometry. [Evaluation, limitations and reproduction](docs/EXTRACTION_EVALUATION.md).

The preferred future forecast target is documented field-construction activity for a known project in a future calendar month, using only information available at the forecast cutoff. The supplied planning snapshots lack adequate observed activity outcomes and linked historical vintages. Missing activity cannot become an inactive label. The larger catalog contains **44 Dominion IDs and 208 active Georgia ITS IDs**, deduplicated and unlocated; it remains off the map. [Forecast readiness](docs/FORECAST_READINESS.md).

## Verify and reproduce

```sh
npm run notices:check
npm run format:check
npm test
npm run build
npm run bench:spatial
git diff --check
```

Use Python 3.11+ in a virtual environment for optional data and extraction checks:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r scripts/requirements.txt -r scripts/requirements-extraction.txt
python scripts/import_workbook.py --check
python scripts/extract_reports.py --check
python -m unittest discover -s scripts/extraction -p 'test_*.py' -v
python scripts/extraction/benchmark.py evaluate --check
```

The final command reproduces evaluation metrics offline from committed predictions/reference/configuration, not new provider responses. Omit `--check` from data generators only when intentionally regenerating outputs. Source bytes and hashes must remain unchanged. Known-report parsers are specific to the supplied report editions. Tests cover the original oracle, spatial boundaries/counts/cancellation, date precision, imports, source-preserving corrections and forecast compatibility. [Current implementation verification](docs/IMPLEMENTATION_VERIFICATION.md), [original prototype verification](docs/VERIFICATION.md) and [scaling decisions](docs/CHALLENGES_AND_SCALING.md) distinguish engine measurements from browser checks.

## Team collaboration

Preserve the initial-owner sequence in [Repository owner setup](docs/REPOSITORY_OWNER_SETUP.md): the initial import uses a merge commit to retain both histories. For later work, follow [CONTRIBUTING.md](CONTRIBUTING.md): shared `main`, short-lived task branches, isolated worktrees/clones for concurrent work, one teammate approval, resolved comments and passing checks, then squash merge. Verify actual remote/PR/CI/access/protection state when needed; this README is not evidence that those actions have occurred. Do not push, merge or submit without user authorization.

## Code and data map

| Location | Responsibility |
| --- | --- |
| `src/App.tsx`, `src/components/` | Unified map, timeline, imports, corrections and source/model evidence |
| `src/lib/spatial.ts`, `src/lib/temporal.ts` | Bounded geographic search and precision-aware date bounds |
| `src/workers/`, `src/hooks/useSpatialQuery.ts` | Worker ownership, cancellation and stale-result rejection |
| `src/lib/comparisons.ts` | Pure geometry and exhaustive small-fixture oracle |
| `src/lib/datasets.ts`, `src/lib/imports.ts`, `src/lib/forecast.ts` | Runtime validation, hashes, corrections and future manifest compatibility |
| `src/lib/exports.ts`, `src/lib/mapPresentation.ts` | Displayed exports and bounded map/heat presentation |
| `scripts/import_workbook.py`, `scripts/extract_reports.py` | Reproducible supplied-source normalization and catalog |
| `scripts/extraction/`, `data/extraction/` | Offline Gemini adapter, frozen reference and actual structured predictions |
| `public/sources/`, `data/review_annotations.json` | Unchanged originals and separate research annotations |
| `public/data/` | Full-report catalog and extraction evaluation with evidence |
| `docs/event-rules.json` | Dated event rules and precise unresolved submission details |

## Attribution and competition context

React, Base UI, Tailwind, Lucide, Leaflet/Leaflet.heat and attributed OpenStreetMap tiles support the interface. KDBush/geokdbush support spatial candidate queries; Papa Parse, read-excel-file and fflate support bounded imports. Gemini provides pretrained document inference in the optional Python job. Exact JavaScript versions are recorded in the lockfile; preserve [third-party notices](public/THIRD_PARTY_NOTICES.txt).

The workbook and utility reports came from the supplied Sperry challenge ZIP and retain their ownership/public-disclosure markings. Earlier research is separate from event-created code. Codex assisted research, implementation, verification and documentation; teammates must describe their actual decisions, review and contributions accurately. The user-supplied September 26 Sperry clarification accepts explained centers or closest points, either cutoff and the historical values as supplied. The app uses approximate centers and an adjustable 25-mile default. No secondary-category eligibility is claimed.

[Event rules](https://shellhacks-2026.devpost.com/rules) require event-period work and external-code attribution in submission and judging. The recorded [deadline](https://shellhacks-2026.devpost.com/details/dates) is **September 27, 2026 at 11:00 a.m. EDT**, with a three-minute live demo. Recalculate remaining time from the current clock. The exact labeled hacking start, treatment of pre-event authored research, any AI-specific disclosure field and authenticated form-only requirements remain targeted submission checks. Keep existing AI-assistance and prior-research disclosures; do not infer permission from an absent rule. A GitHub link is required; confirm actual publication/submission status independently.

# Planner interface audit and refinement

Historical record of the earlier adjacent map/list interface. The current map-first refinement is documented in [MAP_WORKSPACE.md](MAP_WORKSPACE.md); the checks below apply to the earlier commit, not the new layout.

September 26–27, 2026. Scope: the existing GridLock application, refined with the baseline-ui skill. One page, one map, and one workspace. No new routes, dashboards, deployment or submission.

## Planner workflow and confirmed requirements

The default workflow is **filter projects → select a nearby cross-utility comparison → inspect timing and evidence → export findings**. Proximity and planned milestones identify questions worth investigating; they do not establish simultaneous construction, shared routes or savings.

The user-confirmed Sperry clarification permits explained centers or closest points and either cutoff with adjustable distance. GridLock preserves approximate endpoint centers, an adjustable 25-mile default, physical unit conversion and the strict unrounded boundary. Original historical values remain unchanged. There is no requirement to promote unavailable forecasts, engineering metrics or extra sponsor tools into the planner's daily workspace.

## Element audit

| Element or group | Decision and reason |
| --- | --- |
| Brand/header | Keep small identity and a plain workflow description. Remove competition-oriented subtitle. |
| Dataset name/count | Keep historical/uploaded context; show correction count only when changes exist. |
| Import, corrections, source-review controls | Combine under **Data tools**, a Base UI dialog on this page. Its disclosures and contents remain mounted after first use, preserving mapping drafts, correction drafts, selected review page and acknowledgments. Ordinary close preserves map/filter/selection state. |
| Dataset replacement/restoration | Keep in Data tools, with an AlertDialog before discarding an uploaded workspace or corrections. Cancellation leaves the importer usable; actual replacement deliberately starts a new workspace and focuses its heading. |
| Utility checkboxes/search | Keep prominent. Retain select-all/clear and bounded searchable utility names. |
| Distance number and units | Keep prominent, with approximate-center/strict-boundary wording. Remove the redundant distance slider. Invalid input stays editable with an adjacent explanation; the last valid radius continues to drive results and export is disabled until corrected. |
| Planned/What-if/Forecast primary selector | Replace with planned dates as the default. Put what-if in **More filters & what-if**. Forecast unavailability remains in date limitations; no predictive capability was removed. |
| Unknown-date inclusion and exhaustive small-data view | Keep in More filters. Plain label for including comparisons outside the distance limit; no developer-facing “fixture” label. |
| What-if shifts/gap/reset | Preserve functionality and separate state. An active-assumption notice stays visible even when the controls are collapsed. Shifts apply to current corrected milestones; originals remain in evidence. |
| Date slider/distribution | Keep above map/list, compact, with keyboard month values and roll/all-dates controls. Preserve uncertain-date coverage and milestone-versus-activity meaning. Zero-count bins have zero height. |
| Map and heat controls | Keep one map, beside the list at desktop widths and stacked at narrow widths. Active mode is visibly selected. Retain fit-all, map keyboard access, a skip-to-comparisons link and OpenStreetMap attribution. |
| Map labels/notices | Keep approximate-location and connector meaning. Stack sampling/tile/heat errors so warnings do not cover each other. No marker or heat calculation changed. |
| Ranked list | Keep project names, utilities, distance units and milestone gap. Remove possible-combination counts and engineering diagnostics from everyday UI. Preserve exact ranking and bounded results. |
| Partial results | Keep next to the list: lower-bound match count, best-visited versus globally-nearest limitation, suggested narrowing and displayed-export scope. Complete searches with retained subsets also disclose the limit. |
| Pair selection/evidence access | Highlight selection and reveal a same-page **View selected timing and evidence** link. No route or filter reset. Explicit map focus returns to the map. |
| Evidence cards | Lead with source date/meaning and source-page link. Collapse source IDs, raw dates, endpoint coordinates, provenance notes and dated research annotations. Preserve all underlying values and distinctions. |
| Corrected/assumed dates | Show separately above original evidence whenever relevant; never overwrite source cards. |
| Exports | Keep displayed-pair CSV beside results and add selected-pair CSV beside evidence. Existing original/effective/assumed columns, hashes and scope remain intact. |
| Extraction review | Keep page selection, readable fields, source quotes/missing reasons, checks and JSON export in Data tools. Remove score/latency dashboard and lengthy evaluation exposition from UI. Retain short experimental/review-required/no-forecast caveats. |
| Source files, catalog, fingerprints | Keep in Data tools disclosures/downloads. Explain that the unlocated reference catalog is separate from mapped records. |
| Full-report charts, benchmarks, algorithm details and sponsor-methodology text | Remove from app presentation; retain project documentation, raw benchmark/evaluation files and underlying data. |
| Loading, errors and empty results | Show structural search placeholders, adjacent errors, retry/cancel actions and a contextual empty-state action. Retry preserves filters; insufficient-utility datasets point to Data tools. |
| Footer/notices | Keep brief interpretation and required third-party notices. No new navigation destination. |

## State and interaction contract

Opening/closing a secondary tool does not accept an import, apply a correction, clear a scenario or change selection. Drafts and review checks remain session-only. Accepting a replacement dataset is an explicit separate action; imports/corrections are still not server-persisted. Base UI owns modal focus containment, Escape behavior and return focus. Native disclosures keep their contents in the same page. No animation was added.

The spatial engine, importer validation rules, forecast contract, source bytes, report catalog, research annotations, model predictions and evaluation measurements are unchanged. The spatial hook adds a retry that recreates a failed worker without resetting the planner's filters. The importer now disposes its worker on unmount after acceptance, so cancelling replacement does not strand a mounted importer.

Detailed geometry/scaling: [PERFORMANCE.md](PERFORMANCE.md). Import limits: [IMPORTS.md](IMPORTS.md). Model evidence: [EXTRACTION_EVALUATION.md](EXTRACTION_EVALUATION.md) and [FORECAST_READINESS.md](FORECAST_READINESS.md). Earlier implementation checks remain in [IMPLEMENTATION_VERIFICATION.md](IMPLEMENTATION_VERIFICATION.md).

## Verification

The integrated production build passed in Chrome 152 on macOS at 1440 × 1000, 1280 × 900, 390 × 844 and 320 × 740. Desktop, narrow-screen, dialog, loading and partial-result screenshots were visually inspected. The narrow page and open dialog had no horizontal overflow.

- Keyboard month slider, Enter selection and same-page evidence/map focus; Base UI modal Tab wrapping, Escape and return focus.
- Original six nearby pairs, all 25 small-dataset comparisons, source meanings/page links, heat mode, physical unit conversion and inline invalid-distance feedback.
- Empty utility selection, no nearby pairs and a one-utility import, with working recovery actions.
- What-if controls, visible active assumptions while collapsed, unchanged original dates, correction apply/reset confirmation and visible saved feedback.
- Filters, comparison selection, importer mapping, correction drafts, selected review page and checked fields preserved through tool/disclosure closes.
- CSV import/acceptance with year/month precision; duplicate rejection; cancellation of replacement followed by successful revalidation; restore-sample cancellation and acceptance; keyboard focus on the new dataset heading.
- Injected slow/failed spatial-worker loading followed by Retry search; injected 503 for source review followed by Try again; aborted tile requests with all ten local markers and comparisons still usable.
- A 10,000-record dense import produced an explicit partial-result warning and at most 1,200 markers. CSV inspection confirmed exactly 200 distinct exported pairs, all marked incomplete. Selected-pair CSV retained the original dates, need-date meaning and unrounded 7.548090711868766-mile distance.

All 59 existing application tests, formatting, notice consistency, TypeScript/production build and Git whitespace checks passed. The pinned Node 24.14.1 runtime was used for final automated verification. No package dependency, spatial algorithm, source dataset, report/model artifact or benchmark measurement changed; no new ML request was made. Original sources/catalog/annotations have no Git diff against `0596e03`.

Browser testing found and fixed a missing map-focus target, premature importer-worker disposal when replacement was canceled, and correction confirmation text being cleared immediately after saving. A focus assertion was adjusted to wait for Base UI's focus lifecycle; keyboard wrapping was then verified. An intermediate run loaded the previous build before rebuilding completed; final checks used the completed build.

Screenshots, exported files and reproducible interaction scripts are kept under ignored `output/playwright/`. Expected console errors were caused by injected failures; Chrome also issues the existing Leaflet heat canvas performance hint. This was not an independent human usability study, screen-reader audit, real-device test or cross-browser matrix. Imports and review checks remain session-only. No push, deployment or submission occurred.

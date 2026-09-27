# Planning scenarios and forecast readiness

GridLock defaults to the ten original mapped workbook examples and also supports separate runtime CSV/XLSX datasets. The full supplied reports provide a larger **unlocated planning catalog**, not a historical dataset of actual construction. The bounded readiness decision remains **no activity or schedule-revision forecast**. The implemented ML component is evaluated document extraction; no forecasting model is trained.

| Supplied section | Extracted coverage | Source pages |
| --- | --- | --- |
| Dominion transmission | 44 unique full project IDs; 45 milestone dates because one project has two phases | 1–44; phased project on 34 |
| Georgia ITS active transmission | 208 TEAMS IDs appearing in both summary and detail; 122 GPC, 16 SAV, 54 GTC, 14 MEAG, 2 DU sponsor codes | Summary 177–190; details 214–425 |
| Georgia completed/removed lists | 13 completed-status rows and 10 cancelled/removed rows | 192 and 191 |
| Georgia distribution forecast | 77 rows without stable project IDs | 558–563 |

The 252 canonical active transmission records are not 252 independently observed outcomes. Keep phases, predecessor IDs and repeated report versions linked. Sponsor codes do not establish exclusive component ownership: project 09662 includes GTC, GPC and MEAG work. All additional catalog geometry is `null`; these rows stay off the map.

**Date meaning matters.** Dominion reports planned in-service milestones. Georgia's December 2024 snapshot reports need dates and implementation start dates intended to allow enough lead time (PDF page 213), not verified field-construction intervals. Its completed list supplies *last year's need date*, not actual completion dates. Dominion's March 5, 2024 PDF creation date is metadata; its publication cutoff is unspecified.

The catalog preserves three summary/detail need-date conflicts (19523, 20684, 17900), a start-after-need anomaly (20248), and project 20482 appearing in both active and removed lists. It does not silently reconcile them. Georgia's 208 summary rows and 208 detail entries represent 208 IDs; the active and removed lists together contain 230 unique IDs because of that conflict. Repeated budget/task pages for 20466 are not additional jobs.

## What the unified timeline does

Planned and What-if modes share the main map, a rolling month-range slider and a compact milestone distribution. Planned uses source dates with any separately recorded effective corrections. What-if shifts each utility's effective milestones by explicit whole calendar years, with leap-day clamping and an optional inclusive calendar-month gap. Source values, corrections and assumptions stay separate; source evidence always resolves to originals. Reset assumptions to inspect unchanged effective dates.

Month/year precision spans its possible calendar interval and can overlap a date filter without an invented exact day. Exact milestone gaps require two exact-day dates. Heat and distribution values describe selected planning records, including uncertainty, not actual activity. The Forecast mode explains unavailability while leaving source plans visible. Future planned dates are not model predictions; a planning date filter is not a construction-window filter.

## Forecast target and evidence gate

The eventual target is **documented field-construction activity for a known project during a future calendar month, using only information available at the forecast cutoff**. It concerns whether documented field work occurs during that month. It does not estimate unknown future project locations, completion, staffing compatibility, cost savings or exact simultaneous work. Two projects active in the same month need not overlap on the same day; multiplying their marginal probabilities is not a justified joint-overlap estimate.

Credible evaluation requires archived snapshots with publication cutoffs, stable project/phase identities, appropriate geometry and later independently observed activity outcomes. Missing activity is unknown, not an inactive label. Past planned dates are not construction observations. Summary/detail repetitions and phases cannot be treated as independent jobs. Splitting one report by future need-date years is not temporal validation.

Begin with planning-window/persistence and regularized logistic regression baselines if adequate labels become available. Fit preprocessing on training data only, keep related IDs/phases grouped, use chronological cutoffs and outcomes available by each training cutoff, and reserve untouched later evaluation separately from tuning/calibration. Compare histogram gradient boosting only when justified. Report baseline comparisons, class coverage, Brier/log loss, reliability and planner-facing precision/recall at a stated review budget. Training alone does not establish usefulness.

The present sources lack that activity cohort. A separate schedule-revision target would need linked frozen plan vintages and a later untouched evaluation cohort; case-specific later schedules and a few additional public pages do not establish such a panel. No artificial labels, fabricated inactive observations or real predictive-accuracy claim were created to fill these gaps.

## Implemented extraction alternative

The pretrained Gemini API extracted eight fields for the first project on each of ten purposively selected public report pages. The fixed reference/configuration preceded the live calls. Gemini matched **80/80 selected field values**: 48/48 from six known-layout pages and 32/32 from four unfamiliar-layout pages. The deterministic parser matched 48/48 on its supported pages and abstained on the unfamiliar layout. No custom model was trained.

The reference was visually checked on rendered pages by Codex, not independently human double-annotated. Four unfamiliar pages share one report, and a project appears in both report splits. This is a narrow source-page evaluation, not general accuracy or an independent-project holdout. Human review time and savings were not measured. See [EXTRACTION_EVALUATION.md](EXTRACTION_EVALUATION.md) for metric definitions, actual latency, source hashes/pages, limitations and offline reproduction.

All structured outputs remain review-required, map-ineligible and training-ineligible, with page evidence and explicit missing reasons. A session acknowledgment is not operational approval. Identity, work scope, date meaning/precision and evidence require review; map promotion needs credible geometry; model training additionally needs valid outcome labels and temporal provenance. Null actual start/end fields must never become inactive labels.

## Future forecast compatibility contract

`src/lib/forecast.ts` validates a versioned external manifest with the target, source dataset identity/hash, effective feature hash, forecast cutoff, model version and known project-month records. Each record is either a finite probability in `[0,1]` or explicit unavailable/null probability with a reason. A forecast month must be a complete future calendar month after the cutoff month. Missing records remain missing estimates.

New uploads or relevant corrections invalidate incompatible manifests. Reset can restore compatibility only when effective inputs match again. Schema/hash compatibility does not establish calibration, temporal evaluation or model quality. No manifest currently supplies displayed forecast estimates, and the app has no forecast training or live inference on slider changes. A future evaluated model should run offline batch inference first, with dataset/horizon partitions if volumes require them.

## Reproduce the catalog

From the repository root, after installing `scripts/requirements.txt`:

```sh
python scripts/extract_reports.py
python scripts/extract_reports.py --check
```

The default inputs are the two PDFs in `public/sources/`. Use `--repo-root PATH` to select another checkout and `--as-of YYYY-MM-DD` to change only review-relative date counts. The default review date is September 26, 2026. Outputs are `public/data/full_report_catalog.json` and `src/data/forecast_assessment.json`; source metadata includes repository-relative paths, browser URLs, page references and SHA-256 hashes. `--check` validates regenerated content without writing.

The extractor checks page and record counts, the 208-ID summary/detail join, phase counts, known conflicts and missing descriptions. Only visibly released public fields are read; redacted costs and restricted models are neither extracted nor reconstructed. The original PDFs and reviewed sample remain unchanged.

# Planning scenarios and forecast readiness

GridLock uses the ten original mapped workbook examples for its map and comparisons. The full supplied reports provide a larger **unlocated planning catalog**, not a historical dataset of actual construction. No forecasting model is trained.

| Supplied section | Extracted coverage | Source pages |
| --- | --- | --- |
| Dominion transmission | 44 unique full project IDs; 45 milestone dates because one project has two phases | 1–44; phased project on 34 |
| Georgia ITS active transmission | 208 TEAMS IDs appearing in both summary and detail; 122 GPC, 16 SAV, 54 GTC, 14 MEAG, 2 DU sponsor codes | Summary 177–190; details 214–425 |
| Georgia completed/removed lists | 13 completed-status rows and 10 cancelled/removed rows | 192 and 191 |
| Georgia distribution forecast | 77 rows without stable project IDs | 558–563 |

The 252 canonical active transmission records are not 252 independently observed outcomes. Keep phases, predecessor IDs and repeated report versions linked. Sponsor codes do not establish exclusive component ownership: project 09662 includes GTC, GPC and MEAG work. All additional catalog geometry is `null`; these rows stay off the map.

**Date meaning matters.** Dominion reports planned in-service milestones. Georgia's December 2024 snapshot reports need dates and implementation start dates intended to allow enough lead time (PDF page 213), not verified field-construction intervals. Its completed list supplies *last year's need date*, not actual completion dates. Dominion's March 5, 2024 PDF creation date is metadata; its publication cutoff is unspecified.

The catalog preserves three summary/detail need-date conflicts (19523, 20684, 17900), a start-after-need anomaly (20248), and project 20482 appearing in both active and removed lists. It does not silently reconcile them. Georgia's 208 summary rows and 208 detail entries represent 208 IDs; the active and removed lists together contain 230 unique IDs because of that conflict. Repeated budget/task pages for 20466 are not additional jobs.

## What the scenario does

Users shift each company's original planned milestones by explicit whole calendar years and choose a date window. GridLock recounts nearby cross-company pairs and planning-record concentrations against unchanged dates. Original values remain available. These are deterministic assumptions, not learned delays, future probabilities or evidence of simultaneous construction. A planning date filter is not a construction-window filter.

A credible forecast would require archived snapshots with known publication cutoffs, stable project identity and geometry, and later actual activity intervals for both utilities. Evaluation would use later temporal holdouts and simple persistence/count baselines, keeping related IDs and phases together. One supplied snapshot per report and 13 undated completion-status flags cannot support that evaluation.

## Reproduce the catalog

From the repository root, after installing `scripts/requirements.txt`:

```sh
python scripts/extract_reports.py
python scripts/extract_reports.py --check
```

The default inputs are the two PDFs in `public/sources/`. Use `--repo-root PATH` to select another checkout and `--as-of YYYY-MM-DD` to change only review-relative date counts. The default review date is September 26, 2026. Outputs are `public/data/full_report_catalog.json` and `src/data/forecast_assessment.json`; source metadata includes repository-relative paths, browser URLs, page references and SHA-256 hashes. `--check` validates regenerated content without writing.

The extractor checks page and record counts, the 208-ID summary/detail join, phase counts, known conflicts and missing descriptions. Only visibly released public fields are read; redacted costs and restricted models are neither extracted nor reconstructed. The original PDFs and reviewed sample remain unchanged.

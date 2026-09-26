# Scalable workspace verification

Verified locally September 26, 2026. This record covers the extension after `76957ce`; [original prototype verification](VERIFICATION.md) remains a historical record. No hosted CI, push, publication or competition submission is claimed.

## Implemented and checked

The main workspace combines a map/heat view, month-range slider and milestone distribution, bounded distance-ranked comparisons, original evidence, separate corrections and explicit what-if assumptions. Forecast mode explains unavailability. Runtime CSV/XLSX imports use sheet/header selection, field mapping, validation and explicit acceptance. The default ten-record demonstration remains unchanged.

| Check | Result |
| --- | --- |
| Clean dependency install using Node 24.14.1 | Passed; npm reported zero vulnerabilities at install time |
| TypeScript/Vitest | 59 tests across eight files passed |
| TypeScript compilation and production Vite build | Passed |
| Application formatting, third-party notice consistency and Git whitespace | Passed |
| Offline Python extraction tests | 12 passed on Python 3.12.14 |
| Extraction metric replay from committed reference/configuration/predictions | Passed, without another API request |
| Original workbook generator `--check` | Passed; ten records |
| Original full-report parser `--check` | Passed; 44 Dominion IDs, 208 active Georgia IDs, 13 completed-status rows, ten cancelled rows, 77 distribution rows and three recorded date conflicts |

Tests cover the original 25-pair/six-near fixture and 7.5480907-mile case; exact metric boundaries, units, stable ordering, polar/dateline representative points, missing geometry, precision-aware dates, leap dates, scenario immutability, geometry reuse, work limits, stale worker replies and cancellation. Import tests include malformed/duplicate records, formulas, capacity boundaries, source-preserving overrides and incompatible forecast manifests. A 25,000-row trailing-newline failure found during browser testing was fixed and regression-tested; 25,001 populated rows remain rejected.

## Real-browser checks

Chrome 152 exercised the production build at 1440 × 1080 and 390 × 844. Desktop and narrow-screen screenshots were visually inspected. The narrow viewport had no horizontal document overflow.

- Original six nearby pairs, all 25 fixture comparisons, the Jasper–Okatie/Goshen selection, map focus, heat mode and 517-day source-milestone gap.
- Miles-to-kilometers conversion preserving the physical radius; keyboard timeline adjustment, restore-all-dates, empty utilities and select-all utilities.
- What-if controls and reset, including clearing the optional gap; Forecast explicitly unavailable.
- Two-sheet XLSX selection, second-row header, manual mapping, year-only date display, formula rejection, duplicate CSV rejection and acceptance of a valid file after an error.
- Source-preserving correction and reset. Reaccepting the same file starts a fresh workspace without old corrections or assumptions.
- CSV download inspected for separate source/effective dates, precision, meaning, shifts, hashes and displayed-result scope.
- The complete 25,000-row CSV upload → mapping → validation → acceptance → map/heat workflow.
- Extraction evidence, eight fields per selected page, session review acknowledgments and restore-demo behavior.
- Forced OpenStreetMap request failure produced the fallback message while all ten local project markers and comparisons remained available. Expected network errors from this injected failure are not application failures.
- A real browser Worker received cancellation after 5,000 processed candidates; the replacement query completed without an obsolete result being emitted.

Local screenshots and test downloads are ignored under `output/playwright/`. No independent human usability review, screen-reader audit, other-browser matrix or hosted deployment was performed. There is a non-blocking Leaflet heat canvas performance hint in Chrome; screenshots and interaction checks do not establish universal accessibility or device performance.

## Measured performance

[Performance](PERFORMANCE.md) contains hardware, raw results, limits and reproduction commands. On Apple M5 / 32 GiB, the production 25,000-row import measured 487 ms for validation and 699 ms from acceptance through map rendering. This includes automation/transfer/React overhead and two animation frames, but not completed basemap tiles. The main-page heap sample was about 149.5 MiB, excluding worker heaps and without isolated peak measurement.

Seeded engine tests cover 1,000, 10,000 and 100,000 records in sparse, dense and separated-utility distributions. At 100,000 dense records, index preparation took 96.4 ms and the **partial** query took 17.5 ms, establishing at least 4,096 matches while retaining 200 rows. This is not a completed search of the 2.5 billion possible pairs. Tractable 1,000-record unrestricted indexed runs agreed exactly with the brute-force oracle. A separate 100,000-record map-component stress test does not increase the supported 25,000-row upload limit.

Browser cancellation after 5,000 processed candidates produced the replacement result in 12.8 ms. These are single observations with cooperative limits, not latency percentiles or hard guarantees. Map markers, heat presentation, comparison rows and exports are explicitly bounded; source records are preserved.

## ML evidence and boundaries

No construction-activity or schedule-revision model was trained. The available planning snapshots lack adequate linked vintages and verified outcomes. The eventual target remains documented field-construction activity for a known project in a future calendar month, using only evidence available at the forecast cutoff. Missing activity remains unknown.

The working ML component is offline Gemini structured extraction from permitted public report pages. Ten actual API requests extracted eight fields per selected first project. The frozen-reference result was **80/80 selected fields**, including 42 nonmissing values and 38 explicit missing values; no date-meaning error or invented value was observed within those defined checks. The deterministic parser matched 48/48 on its supported six pages and abstained on the other layout. Median request latency was 16.281 seconds; total was 226.469 seconds, excluding source download and page slicing.

Codex checked the rendered pages; the reference is not independently human double-annotated. The ten pages were purposively selected; four unfamiliar pages share one report and a project repeats across report splits. Foundation-model training exposure is unknown. No general accuracy or measured human review-time saving follows from these results. All output remains review-required, map-ineligible and training-ineligible. The UI acknowledgment is not a promotion or location approval. See [the extraction evaluation](EXTRACTION_EVALUATION.md) for field definitions, evidence and reproduction.

## Source integrity

The workbook, supplied PDFs, original generated source records, full catalog and research annotations were preserved. SHA-256 checks of the original source bytes remained:

| Source | SHA-256 |
| --- | --- |
| Supplied workbook | `fe01df4ed0691d55fd565784a7510ddfe4682316ff63fb70b963b934c5974f24` |
| Dominion PDF | `890876d0faefd40576a0b5e598a804b54b4d8d2d56dd96fb7e40d5a406db0f46` |
| Georgia Power PDF | `0dae2fc3a38462f0930cc2eb0acedca35e329cd0924e4749c81422bdc8602a12` |

Imports/corrections and evidence acknowledgments are session-only. Large dense queries may stop with honest lower-bound counts and best-visited rankings. The highest-value product improvement is resumable dense search with stable global ranking and progress. For credible forecasting, independently reviewed, linked, cutoff-safe activity outcomes are a separate prerequisite. Neither shared infrastructure nor another sponsor integration is needed to demonstrate the current vertical slice.

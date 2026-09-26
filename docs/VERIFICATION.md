# Verification — 0.1.0

Checked September 26, 2026 with Node 24.14.1 and a Chromium browser driven through Playwright CLI.

| Check | Result |
|---|---|
| `npm test` | 15 tests pass: all starting pairs, numerical reference distances/gaps, added project, distant/missing cases, duplicate IDs, invalid coordinates/dates, threshold boundary, units, inclusive dates, scenario cloning, leap day and calendar-month windows. |
| `npm run format:check` | All application source matches the checked-in formatter configuration. |
| Dependency installation audit | Patched test-runner dependency installed; npm reports zero known vulnerabilities at this check. |
| `npm run build` | TypeScript and production bundle pass. Vite reports a non-blocking large-chunk advisory (approximately 527 kB before gzip). |
| `scripts/import_workbook.py --check` | Reproduces all ten records. Independently matched all ten original dates, 40 endpoint-coordinate cells and 20 cached representative-point cells to the workbook. |
| `scripts/extract_reports.py --check` | Reproduces 44 Dominion IDs, 208 active Georgia ITS IDs, 13 completed-status and 10 cancelled/removed rows, 77 distribution rows; no missing active descriptions. |
| Source preservation | Workbook and both public PDFs are byte-identical to their original ZIP entries (SHA-256 below). Original Metal/study repository remains clean at its previous commit. |
| Default / all pairs | Ten records, 25 cross-company pairs, six within 25 miles; All pairs lists all 25. A 250-mile threshold admits all 25. |
| Units / filters | Switching to kilometers preserves 40.2336 km for the 25-mile threshold. One selected company yields zero comparisons. Invalid date ranges report an error and no results. Inclusive 2025–2027 filtering yields four nearby pairs. Reset restores the baseline. |
| Detailed case / map focus | Jasper–Okatie and Goshen–McIntosh select the computed 7.55-mile, 517-day pair. Reviewed Goshen–Georgia Pacific scope is visible separately. A selected individual project centers correctly when focused. |
| Scenario workflow | Default assumptions produce two nearby milestone pairs in 2028; a zero-month window leaves the one equal-date pair. Invalid target-year input is flagged. Remove shifts restores the unchanged-date baseline. Inspect links show original 2025/2027 dates, not shifted dates. |
| CSV export | 25 sorted rows, six qualifying flags, and `construction_overlap=unknown` throughout. |
| Responsive / visual | Explore, Scenarios and Data & methods checked at 1440-pixel desktop and 390-pixel mobile viewports; no horizontal document overflow. Map, heat, evidence and source-date labels inspected visually. |
| Basemap failure | Deliberately blocked OSM tile requests: fallback notice appears; six comparisons, markers, controls and detailed-case evidence remain usable. Expected network failures are confined to this simulation. |

Browser checks exercise UI behavior; they are not a claim of comprehensive accessibility, all-browser compatibility, load testing or production security certification. The presentation laptop, projector, authenticated submission form and live judging remain team checks. The app has no trained forecasting model or measured predictive accuracy.

## Source hashes

- `Projects_Overlaps.xlsx`: `fe01df4ed0691d55fd565784a7510ddfe4682316ff63fb70b963b934c5974f24`
- `Dominion_2024-2028_Project_Descriptions.pdf`: `890876d0faefd40576a0b5e598a804b54b4d8d2d56dd96fb7e40d5a406db0f46`
- `Georgia_Power_2025_IRP_Volume_3_PUBLIC_DISCLOSURE.pdf`: `0dae2fc3a38462f0930cc2eb0acedca35e329cd0924e4749c81422bdc8602a12`

Local browser screenshots and CSV checks are kept in ignored `output/playwright/`; they are verification artifacts, not application source.

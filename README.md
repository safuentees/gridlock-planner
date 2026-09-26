# GridLock

Explore nearby utility planning records, inspect the evidence, and test explicit schedule scenarios. A working ShellHacks 2026 / Sperry proof of concept for a four-person team.

## Open the app

Use Node.js 22.12+ (tested with 24.14.1) and npm. From this project folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173/**. Keep that terminal running; press Control-C to stop. No API key, database, Python setup or account is needed to run the app. Internet is needed for the OpenStreetMap basemap and external research links. Comparisons, scenario calculations, the workbook and supplied report PDFs are local. Tile failure leaves the points and evidence usable.

For a production demo, stop the development server, then:

```sh
npm run build
npm run preview
```

The preview uses the same URL. This is a local prototype, not a published site. [Team responsibilities, remaining-time plan and three-minute demo](docs/DEMO_HANDOFF.md).

## What works

- All ten supplied examples and every one of their **25 cross-company pairs**, calculated at runtime. At the default **25 miles**, six pairs qualify. Ranking is nearest first, not a prediction of value or simultaneous activity.
- Interactive project map, equal-weight planning-density heat map, adjustable distance in miles/kilometers, company and original-date filters, and comparison CSV export.
- Pair and individual-project inspection: original endpoints and dates, midpoint/single-endpoint method, report page links, missing information and separate dated research notes.
- A detailed Jasper–Okatie / Goshen–Georgia Pacific case. The workbook calls the broader Georgia line Goshen–McIntosh; its preserved proxies give **7.5481 miles** and **517 days** between milestones. Reviewed section geometry and later schedules remain annotations.
- Deterministic scenarios: shift each company's original milestones by whole years, choose a target year and maximum calendar-month gap, then compare with an unchanged-date baseline using the same settings. Inspect a scenario pair's original evidence without mutating the source records.
- An auditable full-report catalog: **44 Dominion IDs and 208 active Georgia ITS IDs**, plus separately recorded removed/completed and distribution entries. Repeated summary/detail appearances are deduplicated. The larger catalog has no verified map coordinates and is not silently added to the ten-example map.

## Boundaries of the evidence

Locations are approximate representative points, not verified construction routes. Two supplied endpoints use their arithmetic coordinate midpoint; one located endpoint is the fallback. Distances use haversine geometry and the **unrounded distance strictly below** the chosen threshold. Unit changes preserve physical distance: 25 miles equals 40.2336 km.

Dominion's dates are planned in-service milestones; Georgia's are need dates from a December 2024 planning snapshot. Neither establishes an actual field-construction interval. Date filters are inclusive. Missing geometry/date values stay unknown; all-pairs mode retains unlocated comparisons after the located ones.

Sperry's direct clarification, supplied by the user on September 26, permits center or closest-point methods, either cutoff and use of historical values as supplied. It supersedes the earlier conflicting guide interpretations. This version selects center points and an adjustable 25-mile default.

**No forecasting model was trained or validated.** One planning snapshot per supplied report, repeated project IDs and 13 completed-status rows without actual completion dates cannot establish reliable future co-construction probabilities. Scenario shifts are assumptions, not learned delays. The default +3 / +1-year example is illustrative, not a recommendation. [Forecast-readiness assessment and evaluation requirements](docs/FORECAST_READINESS.md).

## Verify and reproduce

```sh
npm test
npm run build
git diff --check
```

To reproduce data outputs, install Python 3.11+ and the optional extraction dependencies in a virtual environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r scripts/requirements.txt
python scripts/import_workbook.py --check
python scripts/extract_reports.py --check
```

Omit `--check` to regenerate the checked-in JSON. Importing does not edit the workbook. `data/review_annotations.json` is the portable research annotation layer. Additional same-schema DESC/GPC workbook rows use their IDs and are compared automatically after import; there is no special-case matching rule. The UI currently targets these two utility groups. Full-report extraction is deliberately specific to these supplied report editions; it is not an arbitrary-PDF parser.

The automated tests cover every starting pair, known distances and gaps, more records, distant and missing-data cases, duplicate IDs, invalid coordinates/dates, exact threshold boundaries, units, inclusive filters, scenario immutability, leap days and calendar-month windows. [Recorded browser and data verification](docs/VERIFICATION.md).

## Team collaboration

Start by merging the initial demo PR so everyone has the same starting point; the owner can follow [these short instructions](docs/REPOSITORY_OWNER_SETUP.md). For later changes, follow [the collaboration guide](CONTRIBUTING.md): use the shared `main` branch, one short-lived task branch per change, one teammate review, and passing checks before merging. GitHub automation and the pull-request template are prepared; `origin` points to the team repository. The initial app upload, teammate access and protection settings still need completion.

## Code and data map

| Location | Responsibility |
|---|---|
| `src/App.tsx`, `src/components/` | Exploration, scenario and evidence UI; Leaflet map |
| `src/lib/comparisons.ts` | Pure geometry, filtering, pair ranking and scenario calculations |
| `src/data/projects.json` | Normalized originals plus separate review annotations |
| `scripts/import_workbook.py` | Read-only workbook normalization with reproducibility check |
| `scripts/extract_reports.py` | Deduplicated full-report inventory and forecast-readiness evidence |
| `public/sources/` | Unchanged supplied workbook and public report PDFs |
| `public/data/full_report_catalog.json` | Extracted records, source pages, conflicts and source hashes |
| `docs/event-rules.json` | Verified event rules and precise unresolved submission details |

## Attribution and authorship

React provides rendering; Base UI provides accessible controls; Tailwind/clsx/tailwind-merge provide styling; Lucide provides icons; Leaflet and Leaflet.heat provide mapping/density display; OpenStreetMap provides attributed tiles. Vite/TypeScript build the app, Prettier formats the source, Vitest tests it, and openpyxl/pypdf/pdfplumber support source extraction. Exact JavaScript versions are in `package-lock.json`. [Third-party notices](public/THIRD_PARTY_NOTICES.txt) accompany the app.

The workbook and public utility reports came from the supplied Sperry challenge ZIP. Utility documents retain their original ownership and public-disclosure markings. They are source evidence, not team-authored research results. Earlier research notes are disclosed separately from event-created application code. Codex assisted research, implementation, verification and documentation; teammates must describe their actual decisions, review and contributions accurately.

The [current event rules](https://shellhacks-2026.devpost.com/rules) were checked before application code was written. They require event-period work and external-code attribution in the submission and judging. The [deadline is September 27, 2026 at 11:00 a.m. EDT](https://shellhacks-2026.devpost.com/details/dates). The exact labeled hacking start, treatment of pre-event authored research, any specific AI disclosure field and authenticated form-only requirements still need targeted checking before submission. A GitHub link is required; this repository has not been pushed and no submission has been made.

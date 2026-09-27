# Runtime imports and corrections

The browser accepts UTF-8 CSV and values-only XLSX. Nothing is uploaded to a server or written to the supplied workbook/PDFs. Imported data lasts for the current app session. Keep the original file; its full SHA-256 is retained in the dataset. There is no automatic geocoding or arbitrary spreadsheet interpretation.

1. Choose **Upload dataset** beside Data tools. The supplied ten-project sample is active by default and remains available through **Use sample** after an upload. Choose your file from the computer, or download `public/templates/GridLock-projects.csv`. For cross-company comparisons, put both companies in one CSV or one selected Excel sheet; this flow does not combine separate files/sheets.
2. Open **Columns and date settings** to select the worksheet and header row (within the first 25 rows) or inspect source rows. This section opens automatically when required columns are missing, multiple worksheets need attention, or validation finds errors.
3. Verify the suggested column aliases and map any unmatched columns. ID, utility, and project name are required. Source IDs must be unique in the selected sheet; text IDs such as `001` stay text. Store zero-padded Excel IDs as text because XLSX number display formatting is not retained.
4. Confirm coordinate order, day-date format, date precision, and date meaning. Per-row precision/meaning columns override defaults. Validate, inspect normalized examples and errors, then choose **Show on map** to accept the complete dataset. An error prevents partial acceptance.

Coordinates are decimal-degree WGS84. Select latitude/longitude or longitude/latitude explicitly; the normalized data always uses `[latitude, longitude]`. Both coordinates of an endpoint must be present or both empty. Empty endpoints remain unlocated. No location is guessed. Two endpoints with a longitude difference greater than 180° are rejected because this app's arithmetic midpoint cannot represent a dateline-crossing line; a defensible single representative point is supported. Two endpoints are only a midpoint proxy, never verified route geometry or closest-point distance.

For text day dates choose ISO `YYYY-MM-DD`, US `MM/DD/YYYY`, or `DD/MM/YYYY`; mixed formats are rejected. `03/04/2028` is not automatically interpreted. Month and year values must be `YYYY-MM` and `YYYY`, with their explicit precision. A blank date becomes null/unknown; a nonempty date with unknown precision is rejected. XLSX date-formatted cells are read as calendar dates using the workbook's date system; an explicitly coarser precision retains only that precision. Unformatted Excel serial numbers are rejected as day dates. Calendar years are bounded to 1900–2200. Allowed meanings are `planned_in_service`, `need_date`, `planned_start`, and `unknown`; none is a claim of observed construction activity.

Formulas are not evaluated or accepted. XLSX files containing any worksheet formula are rejected even when a cached result exists; export a values-only copy. A mapped CSV cell beginning with `=` is also rejected. Negative coordinate numbers remain valid. Spreadsheet row references and parsed raw dates are retained; for Excel date cells, `originalDateRaw` is their normalized calendar representation, not the XML serial or original display formatting. The source file hash refers to the unchanged original bytes.

## Simple upload window

The header picker reuses the existing importer and keeps one mounted draft. Closing/reopening it preserves the chosen file, mapping and validation; choosing another file cancels stale parsing. Dataset acceptance resets filters, selections, corrections and assumptions. Replacing an existing upload or applied corrections retains the explicit replacement confirmation; canceling it leaves the validated import usable. **Use sample** restores the unchanged supplied ten records. Merely opening the picker or seeing “Sample in use” does not reset the map.

The validated summary counts all records, distinct companies and records with usable representative coordinates. Records without coordinates remain in the imported dataset but are not drawn on the map. It does not discover additional plants, substations or lines that are absent from the file, infer locations or bypass the map's labeled display limits. Power plants and other assets can be mapped as records when the file supplies company, identity and coordinates.

## Bounds and cancellation

Limits are 10 MiB file size, 40 MiB declared expanded ZIP content, 1,000 archive entries, 20 sheets, 25,000 selected data rows, 100 columns, and 1,000,000 cells per workbook. CSV is stopped once the row/column bound is exceeded; XLSX sizes, worksheet cell positions/dimensions, and formulas are checked before sheet-array parsing. No excess rows are silently discarded. Only the first ten valid normalized records and first 100 errors are displayed; all selected data rows are validated.

These are input limits, not a guaranteed browser heap ceiling: parsing and decompression use additional memory and depend on browser/library behavior. Parsing, validation, and hashing run in a dedicated worker. Choosing another file or canceling terminates it. A monotonically increasing request gate rejects stale worker responses and stale file reads. The browser remains responsive while the worker processes a bounded file.

## Dataset and correction APIs

- `ImportWizard({ onAccept, onCancel?, compact? })` returns a `RuntimeDataset` only after error-free validation and explicit acceptance.
- `createDemoDataset(projects, sourceHash)` creates the supplied dataset without modifying its original IDs or review notes.
- Upload dataset IDs derive from the complete file hash and sheet name. Project IDs are `datasetId::encodeURIComponent(sourceProjectId)`. Same-named imported IDs, including `DESC_3`, never inherit demo annotations. The source ID is separately retained.
- `fingerprintProjects(projects)` computes stable SHA-256 feature and geometry fingerprints. Feature inputs include IDs, company/utility, name/state, endpoint names/coordinates, milestone, precision, and meaning. Geometry fingerprints include IDs and endpoint coordinates. Research notes and timestamps are excluded. Sorting uses code-point ID order.
- `OverridesPanel({ dataset, overrides, onChange, selectedProjectId? })` expects the immutable original dataset and a separate `ProjectOverride[]`. Supply the optional project ID to open the currently selected record.
- `validateOverride(dataset, override)` validates known IDs, supported fields, coordinates, calendar precision, and a correction reason. `applyOverrides(dataset, overrides)` returns a deeply separate effective clone, preserving source identity/hash. Unchanged feature/geometry inputs retain their hashes; coordinate edits change geometry; date edits change features. Reset by removing a project's override. Keep original and effective datasets separate when rendering source evidence.
- `exportOverrides(dataset, overrides)` emits versioned JSON with dataset ID, source hash, reasons, timestamps, and patches. It exports only corrections, not a mutated source workbook. There is currently no correction-file import UI.

All async dataset results also need a caller-side request gate when switching datasets/corrections. This prevents a slower fingerprint calculation from overwriting a newer selection.

## External forecast contract

`validateForecastManifest(input, effectiveDataset)` checks exact v1 fields, known IDs, source identity/hash, effective feature hash, valid cutoff/months, duplicate project-month records, and finite probabilities. `getForecastAvailability(dataset, manifest?)` returns a reasoned unavailable result by default. The app trains no activity model on the supplied planning snapshots.

```json
{
  "schemaVersion": 1,
  "target": "documented_field_construction_activity_in_month",
  "datasetId": "copy the active dataset ID",
  "datasetHash": "copy the source SHA-256",
  "featureHash": "copy the effective feature SHA-256",
  "forecastCutoff": "2026-09-26",
  "modelVersion": "external-model-version",
  "records": [
    {
      "projectId": "known namespaced project ID",
      "month": "2026-10",
      "probability": null,
      "status": "unavailable",
      "reason": "Insufficient independently observed construction activity history"
    }
  ]
}
```

Metadata applies to every record. The target is documented field-construction activity for one known project during one complete future calendar month after the evidence cutoff month. An available record requires a finite probability in `[0,1]` and null reason; unavailable requires null probability and a nonempty reason. Missing records are missing forecasts, never zero probability. The target is not project completion, a planning milestone, location discovery, joint activity, or pairwise construction overlap. There is no independence assumption for combining project probabilities.

A new upload or relevant correction invalidates a manifest whose dataset/feature hash no longer matches. A reset restores compatibility only when the effective inputs match again. Schema compatibility establishes data compatibility, not model quality, calibration, temporal evaluation, or permission to claim a credible forecast. Current reports lack independently observed monthly outcomes and historical as-of versions needed for defensible temporal evaluation; what-if schedule shifts remain explicit assumptions.

## Verification

`tests/imports.test.ts` covers real CSV/XLSX parsing, template aliases, limits and malformed files, cached formulas, duplicate/null records, coordinate order/dateline checks, ambiguous dates and precision, namespaces, worker request ownership, source-preserving corrections, and reset fingerprints. `tests/forecast.test.ts` covers unavailable defaults, strict schema/probability/identity validation, duplicates, and correction-driven invalidation.

The September 26, 2026 upload-window refinement passed all 79 tests, third-party notice and formatting checks, and the TypeScript/Vite production build. Functional Chromium checks accepted CSV and XLSX fixtures containing three records across two utilities, mapped the two located records, disclosed the unlocated record, and restored all ten sample records. Checks covered preserved drafts, replacement cancellation, the Data tools shortcut, malformed files, missing mappings, invalid coordinates, worker cancellation/failure and retry. Keyboard opening, focus containment and Escape return were exercised, with DOM layout checks at 390×844, 320×740 and 320×640. Visual screenshot review was skipped at the user's request. Local scripts and logs are retained under the ignored `output/playwright/upload-*` paths.

Dependency contracts: [Papa Parse documentation](https://www.papaparse.com/docs), [read-excel-file documentation](https://github.com/catamphetamine/read-excel-file), and [fflate documentation](https://github.com/101arrowz/fflate). Runtime dependencies are pinned by the application package manifest.

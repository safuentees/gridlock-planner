# Changelog

## Unreleased

- Start with an empty map and simplify Upload dataset to a file picker plus the downloadable ten-project sample. Automatically validate and load explicit-template files, retain manual mapping for other schemas and protect existing workspaces from unintended replacement.

- Clarify comparison descriptions with paired distance/timing facts, readable source dates and compact source/research disclosures. Remove repeated timing summaries while retaining original records, corrections and uncertainty.

- Keep distance controls hidden until the expanding card surface fits them, and contain horizontal panel overflow.

- Replace the text Comparisons toggle with a compact panel icon, an accessible name, show/hide tooltip and visible open state.

- Remove the distance slider’s bottom numeric labels and tick lines; keep the expanded card free of a section divider.

- Animate only the nearby card surface so text never inherits layout scaling; unify its white background and dark summary text, removing the split hover fill and divider.
- Make selected comparison rows clearer with a stronger green fill and persistent hover color without shifting their contents.

- Restore a content-sized closed nearby-pair card, remove its chevron and expand evenly around a stable center while keeping the summary in place.

- Keep the nearby-pair card at a responsive fixed width and anchor its animation at the top, so opening the distance editor grows only downward without moving the summary.

- Put distance controls inside the expandable nearby-pair card and remove the bottom-left slider. Use Motion with Base UI for a short, reduced-motion-aware expansion while preserving the mounted editor and stable query presentation.
- Remove the floating radius label from the map while preserving circles and their contextual explanations.
- Present expanded comparison evidence as compact inline descriptions, with unboxed source records and tighter date/source spacing. Preserve provenance, corrections and research disclosures.

- Consolidate comparison CSV exports into one Base UI icon menu, with displayed and selected comparison options and disabled states for unavailable exports.

- Make Comparisons an inline accordion list with no scroll-to-details jump. Keep export in its header, location controls in Filters and map navigation in Map settings.

- Move Filters, Map settings and Map help into labeled icon buttons beside Data tools in the header. Preserve mounted dialogs and state, with a wrapped header on narrow screens.

- Prevent distance-slider flashes by keeping a coherent completed result during distance-only refreshes and reusing the heat canvas. Preserve scope invalidation, stale-response rejection and pending export guards.

- Enlarge the nearby-pair summary typography, fit its container to the content and anchor it at the top center of the map, with narrower toolbars flowing below.

- Reduce the map pair summary to its count, label and distance limit; keep its position stable when Comparisons toggles. Move Focus/Show all into Comparisons and remove the partner-number legend sentence.

- Remove the explanatory footer from the distance control for a quieter interface.

- Add a header Upload dataset window with the default ten-project sample, local CSV/Excel selection, compact validation and honest mapped-record counts. Reuse one importer and preserve drafts and replacement checks.

- Make nearby matches visible in a map count overview, default-on circles and per-project partner badges; replace the dashed connection web with one selected, labeled measurement. Simplify Comparisons and refine density rendering.

- Simplify Data tools into four expandable options with plain names, one-line descriptions and a quieter session reminder. Preserve all import, correction, review and source actions.

- Replace the map's dot-separated filter summary with a simple project count; keep date details in Filters and active what-if warnings beside results.

- Make the map the viewport workspace with a persistent Comparisons panel, contextual evidence, saved per-location eligibility, explicit reference search, distance slider/direct editing, utility icons, density/circle overlays and light/dark basemap appearance. Preserve source data, strict matching, bounded results and session drafts.

- Simplify the single-page planner flow: compact filters, adjacent map/list, contextual timing/evidence and selected-pair export. Keep same-page data tools and assumptions secondary, preserve drafts on close, and provide accessible loading/error/empty recovery.

- Integrate Planned, What-if and explicitly unavailable Forecast modes into one map with a rolling timeline and milestone distribution.
- Add bounded worker spatial queries, stable pair ranking, honest partial counts/cancellation and reproducible spatial benchmarks; retain the original exhaustive oracle and Planned-mode small-dataset comparison.
- Add worker-based CSV/XLSX mapping, validation and acceptance, session-only datasets, source-preserving corrections and feature/geometry hash contracts.
- Bound nearby display, map markers and heat presentation; export displayed comparisons with source/effective dates, assumptions, hashes and search scope.
- Evaluate Gemini extraction on ten selected public pages: 80/80 selected fields against a frozen Codex-checked reference, with explicit review gates and no general-accuracy or forecasting claim.
- Document unsupported activity/schedule-revision forecasting, the future project-month target and strict external forecast compatibility/invalidation.
- Add project agent instructions preserving corrected challenge rules, source-data contracts, verification and team workflow.
- Use `setup/team-workflow` for the initial upload and conventional task prefixes; add the documented post-push repository-owner checklist.
- Explain how to merge the initial demo in plain language, with team access and protection for later changes afterward.

- Add the four-person collaboration guide, pull-request template and app/data CI checks.

## 0.1.0 — 2026-09-26

- Add the complete local planning explorer for ten supplied records and all cross-company comparisons.
- Add adjustable proximity filters, heat map, evidence inspection and CSV export.
- Add explicit schedule scenarios with unchanged-date comparison and source-preserving inspection.
- Assess both full reports, deduplicate project IDs, preserve date conflicts and document why validated forecasting is unsupported.
- Include calculation tests, reproducible extraction, event-rule evidence and the four-person demo handoff.

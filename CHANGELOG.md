# Changelog

## Unreleased

- Simplify the app to Explore, remove the Reset view action, and move focus/show-all to icon-only map controls with one-word hover and keyboard hints. Reuse Leaflet's built-in `fitBounds` behavior.

- Reorganize Explore around an expandable map with collapsible filter and comparison panels, in-panel evidence, and consolidated focus/reset controls.
- Add a green-to-red planning-density toggle, distinct Lucide company markers, and explicit line-number labels while preserving original source names and comparison rules.

- Use `setup/team-workflow` for the initial upload and conventional task prefixes; add the documented post-push repository-owner checklist.
- Explain how to merge the initial demo in plain language, with team access and protection for later changes afterward.

- Add the four-person collaboration guide, pull-request template and app/data CI checks.

## 0.1.0 — 2026-09-26

- Add the complete local planning explorer for ten supplied records and all cross-company comparisons.
- Add adjustable proximity filters, heat map, evidence inspection and CSV export.
- Add explicit schedule scenarios with unchanged-date comparison and source-preserving inspection.
- Assess both full reports, deduplicate project IDs, preserve date conflicts and document why validated forecasting is unsupported.
- Include calculation tests, reproducible extraction, event-rule evidence and the four-person demo handoff.

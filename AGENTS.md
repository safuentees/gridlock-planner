# Agent instructions — GridLock

## Purpose and scope

GridLock helps people explore concentrations of utility planning records, compare nearby work across companies, inspect supporting evidence, and investigate explicit future scenarios. The initial utilities are Dominion Energy South Carolina (DESC) and Georgia Power (GPC).

The team has four capable members. Prioritize internship value, a strong portfolio and a coherent competition entry: understandable engineering, reproducible data, useful interaction and a reliable demonstration. Sponsor API access can be obtained, but do not assume credentials are provisioned. Add sponsor technology only when it materially improves the product; maximizing the number of integrations is not the objective.

This is a separate project and Git repository. Preserve the sibling Metal portal app, the historical ShellHacks study, original challenge ZIP and original research files. Do not restart project selection, produce another broad report or expand the MVP unless the user's task calls for it. Earlier requests to stop before implementation were superseded by the user's explicit authorization to build GridLock.

Read `README.md` for operation, `CONTRIBUTING.md` for team workflow, and relevant source files before changing behavior. This file records settled decisions; current user instructions and newly verified evidence can update them. Keep instructions portable and avoid machine-specific paths or credentials.

## Settled Sperry clarification

The user supplied a direct Sperry reply on September 26, 2026. Treat that reply as accepted challenge clarification, distinct from an independently retrieved public rule:

- Either representative center points or closest points along routes are acceptable when the method is explained.
- Either 25 miles or 40 km is acceptable; an adjustable threshold is encouraged.
- Use the supplied historical values as-is. Sperry suggested machine learning, but the user explicitly requires a credible evaluation or an honestly labeled exploratory alternative.

These answers resolve the earlier disagreement between the separate event guide's closest-point/40 km wording and the ZIP's center-point method. Do not reintroduce that conflict as an unanswered blocker or ask the user to contact Sperry again.

The implemented choice is approximate center points with a 25-mile default and adjustable units/threshold. The strict distance boundary below is our documented implementation choice, not an extra sponsor requirement.

## Data and evidence contract

- Keep the supplied workbook and PDFs in `public/sources/` byte-for-byte unchanged. `.gitattributes` marks them as binary. Source hashes are recorded in `docs/VERIFICATION.md` and generated metadata.
- Workbook dates and coordinates drive the baseline map, filters, comparisons and scenarios. Do not silently replace them with researched corrections, guessed coordinates, newer schedules or current dates.
- Keep annotations in `data/review_annotations.json`; regenerate `src/data/projects.json` and metadata with `scripts/import_workbook.py`. Update generators and source annotations rather than hand-editing generated records.
- Preserve source URLs, PDF pages, document/snapshot dates, review dates, date precision and missing information. A review date is not a publication date; PDF creation metadata is not proof of publication. Separate status evidence from schedule evidence when their sources differ.
- Distinguish observed source statements, user-confirmed information, proposed assumptions and unresolved details. A historical sample is not automatically a verified current opportunity. A past planned date does not prove completion or cancellation.
- Dominion examples contain planned in-service dates. Georgia examples copy **need dates** from a December 2024 planning snapshot, despite the workbook's generic date-column name. Neither establishes actual construction start/end or simultaneous activity. Georgia report implementation-start fields are planning lead-time milestones, not automatically observed field construction.
- Keep unknowns null/explicit. Do not convert missing coordinates into zero coordinates, missing dates into today, or year/month precision into an invented day.
- The additional full-report catalog is unlocated. Keep those records off the map until credible coordinates and their provenance are added. Do not fabricate geocoding or reconstruct redacted/restricted report fields.

The dated report assessment is in `docs/FORECAST_READINESS.md`: 44 distinct Dominion project IDs and 208 active Georgia ITS IDs. Georgia summary and detail sections repeat the same IDs; they are not 416 independent jobs. The 13 completed-status rows contain last year's need dates rather than actual completion dates. Keep phases, repeated versions, sponsor/ownership distinctions and recorded source conflicts explicit. These are baseline findings, not constants to force onto future datasets.

## Comparison and geometry contract

Keep calculation logic pure in `src/lib/comparisons.ts`, independently testable from React and Leaflet.

- Coordinates are WGS84 `[latitude, longitude]`. Validate complete coordinate pairs and ranges. Use the arithmetic mean of the two supplied endpoints, or the single available endpoint as a fallback. No usable endpoints means an unknown representative point.
- These are approximate representative points, not verified routes, construction footprints, electrical connectivity or route lengths. The dashed connector shows measured separation only. Reassess the midpoint approximation before extending beyond this regional dataset.
- Use haversine straight-line distance between representative points. Current constants are 3,958.7613 miles for Earth radius and 1.609344 km per mile.
- Compare every distinct unordered pair from different companies, once. Require unique project IDs and stable pair IDs. Never hardcode the demonstration pair as the matching algorithm.
- Rank by unrounded distance ascending, stable ID on ties, unknown distances last. Eligibility for the nearby view is `distance < threshold`; equality is excluded. Unit changes preserve physical radius: 25 miles = 40.2336 km. Round only for presentation.
- Parse valid ISO calendar dates using UTC semantics; date filters are inclusive. No selected companies means no records. An invalid date range yields no results with an explanation. Preserve the explicit include-undated behavior.
- The unchanged ten-row baseline has five examples per company, 25 comparisons and six qualifying pairs at 25 miles. Adding valid DESC/GPC rows must expand comparisons automatically. Treat these counts as regression expectations for that fixture, not hardcoded product limits.

The detailed case is `DESC_3` with `GPC_3`: Jasper–Okatie and the workbook's broader Goshen–McIntosh label. Original proxies produce approximately **7.5481 miles** and **517 days** between milestones. Research identifies the actual Georgia rebuild section as **Goshen–Georgia Pacific**. Preserve both identities and explain the scope mismatch. Do not substitute corrected section geometry or newer milestone dates into baseline results, or describe this pair as proven concurrent work.

## Scenarios and forecasting

The implemented predictive component is a **deterministic scenario explorer**, not a trained or validated forecast. Historical density, user-selected shifts and arbitrary scores must never be labeled future probabilities, predictive accuracy or established savings.

- Shift each company's original milestones by explicit whole calendar years on cloned records; never mutate source objects or annotations. Clamp leap-day anniversaries to February 28 when needed.
- Include records whose shifted milestones fall in the target calendar year. Qualifying pairs must also meet the distance threshold and inclusive calendar-month gap: later milestone on or before earlier milestone plus the selected months, clamped to month end.
- Compare with a zero-shift baseline using the same target year, radius and gap. Default shifts are illustrative assumptions, not learned delays or recommendations.
- Evidence opened from scenarios must resolve back to the original records; do not label shifted dates as originals. Heat density describes the selected planning records, with one equal-weight point per record and a zoom-dependent scale.
- A credible future forecasting experiment requires earlier frozen plans, stable identities/geometry and later observed activity outcomes. Define the target and date meanings, deduplicate related jobs/phases, separate training from later temporal evaluation, and compare with a simple baseline. Do not claim that merely training a model establishes usefulness. Revisit feasibility when new evidence supports it.

## Implementation and interaction

Use the existing React/TypeScript/Vite app, Tailwind, Base UI controls, Lucide icons, Leaflet and Leaflet.heat. Read dependency versions from `package.json`/the lockfile and use the Node version in `.nvmrc`. Core operation needs no API keys, backend, login or Python runtime; Python is optional for data regeneration.

| Responsibility | Location |
| --- | --- |
| Shared UI state, filters, navigation and scenario orchestration | `src/App.tsx` |
| Map, heat layer, selection and tile fallback | `src/components/ProjectMap.tsx` |
| Original/source/research inspection | `src/components/EvidencePanel.tsx` |
| Report coverage and forecasting limitations | `src/components/DataReadiness.tsx` |
| Geometry, filtering, ranking and scenario calculations | `src/lib/comparisons.ts` |
| Shared contracts | `src/types.ts` |
| Workbook and full-report generation | `scripts/import_workbook.py`, `scripts/extract_reports.py` |

Preserve map/heat modes, adjustable distance, company/date filters, ranked comparisons, evidence access and CSV export. Keep empty/invalid states actionable. Individual-project focus, pair focus and showing all locations must behave distinctly. Basemap failure must leave comparisons, points and local evidence usable. Clean up Leaflet layers, listeners and observers on unmount; do not accumulate duplicate maps during development.

Use accessible primitives and semantic controls, visible keyboard focus, clear labels, restrained styling and responsive layouts. Preserve OpenStreetMap attribution and third-party notices. Keep data uncertainty beside the affected claims without filling the product flow with implementation details. Do not add animation, accounts or infrastructure as incidental scope.

## Git and four-person collaboration

Before editing, inspect repository, branch, status and applicable instructions. A clean HEAD is the checkpoint; do not create an empty checkpoint commit. Review dirty work, preserve unrelated edits and checkpoint only intended project work before new edits. Never discard experiments or use a destructive reset to obtain a clean tree.

Follow `CONTRIBUTING.md`: shared integration branch `main`, one short-lived task branch per change, and separate clones/worktrees for concurrent work. Do not switch a shared checkout underneath another contributor. Coordinate these four areas:

1. Map and interface; coordinate edits to shared `src/App.tsx`.
2. Data and evidence; preserve originals and regenerate derived data.
3. Logic and checks; agree `src/types.ts` changes with UI/data owners.
4. Demo and documentation; verify claims against the working app and own submission preparation.

Give dependency/lockfile changes one owner at a time. Use Conventional Commits, stage explicit paths and commit completed verified work. Do not commit secrets, private data, dependencies, build products or local verification output. Keep actual release versions aligned between `package.json` and `CHANGELOG.md`; document unreleased changes without inventing a release.

The initial team import uses **Create a merge commit** to preserve both histories. Later task PRs use **Squash and merge**, one teammate approval, resolved comments and passing checks. Preserve the simplified initial-owner sequence in `docs/REPOSITORY_OWNER_SETUP.md`; do not restore the superseded, more complicated initial handoff. Confirm live remote/PR/CI/protection state when needed rather than treating setup notes or cached refs as current proof.

Do not push, publish, submit, merge a remote PR, rewrite history, delete branches or message other people unless the user has authorized that action. Existing authorization persists; routine local implementation and verification do not need repeated confirmation. Do not claim hosted checks, collaborator access or branch protection are enabled merely because their configuration is documented locally.

## Verification by change

For application changes, run:

```sh
npm run format:check
npm test
npm run build
git diff --check
```

Use `npm ci` on a fresh checkout or after dependency changes. For workbook/annotation/extraction changes, install `scripts/requirements.txt` and also run:

```sh
python scripts/import_workbook.py --check
python scripts/extract_reports.py --check
```

Regenerate intentionally changed outputs first, then use read-only checks to establish reproducibility. Preserve source hashes. Add focused tests for changed behavior, including distant/missing pairs, boundaries, units, date validity, scenario immutability and calendar edge cases where relevant. Never weaken expected results merely to obtain passing checks.

For UI changes, exercise the affected flow in a real browser on desktop and a narrow screen; include a screenshot in the PR. Check map/heat selection, filters, source inspection, original-vs-shifted dates, export or tile failure as the change warrants. A build does not establish these interactions.

Documentation-only changes require content, relative-link/path and whitespace review, not an unrelated app rebuild. `format:check` currently covers application source, not Markdown or workflow YAML. Historical verification records are evidence of past checks only; report exactly what ran for the present change, failures and any unverified behavior.

## Competition context and communication

Use `docs/event-rules.json` as dated rule evidence and `docs/DEMO_HANDOFF.md` for the demonstration/submission plan. The recorded 2026 deadline is September 27 at **11:00 a.m. EDT**, with a **three-minute live demo**. Recalculate remaining time from the actual clock; do not reuse an old countdown or assume a new 36-hour window. Reserve testing, rest, rehearsal and submission recovery time.

Distinguish the submission opening from the unverified exact hacking start. Preserve event-period work requirements, library/external-code attribution, AI-assistance disclosure and the distinction between pre-event research and event-created implementation. The public-rule review did not settle every AI-specific, research-reuse or authenticated-form requirement; these remain targeted submission checks, not reasons to reopen resolved Sperry questions or halt unrelated local work.

The user confirmed the eight earlier MLH sponsor challenges apply to ShellHacks 2026: ElevenLabs, Gemini API, Solana, Tiger Data, DigitalOcean, Snowflake API, MongoDB Atlas and GoDaddy Registry. Do not re-litigate that edition confirmation because of mixed labels, or describe that inventory as exhaustive. Multiple categories may accept one project under the supplied guide, but verify each secondary category's own requirements before claiming eligibility. Do not add integrations solely to collect categories.

If revisiting the historical winner study, preserve its dataset and distinguish observed associations from causal claims. Ranking weights are judgment, not findings from winners; never invent winning probabilities or assert sponsor categories are easier to win.

Communicate briefly: what changed, why, how it was checked and any material limitation. Keep the working demo and handoff concrete. Never claim publication, submission, live opportunity status, predictive performance or checks that have not actually been established.

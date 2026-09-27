# Map-first planning workspace

September 26, 2026 refinement. This supersedes the layout described in [the earlier interface audit](INTERFACE_REFINEMENT.md). One page, one Leaflet map, no new routes or deployment. The baseline-ui skill, existing Base UI primitives and Lucide icons guide the implementation.

## Planner flow and element audit

**Filter locations → choose nearby cross-utility comparisons → inspect planned timing and source evidence → export findings.** These are opportunities to investigate, not established simultaneous construction, shared routes or savings.

| Element | Current treatment and purpose |
| --- | --- |
| Header | Compact GridLock identity, record count, historical/uploaded context and correction count. Source name remains available in Data tools and the header tooltip. |
| Map | Fills the remaining viewport; panel, filter and appearance changes retain the same map instance and camera position. Explicit fit actions account for overlay space. |
| Utility visibility | Top-left labeled buttons; all additional imported utilities remain accessible through Filters. Icons identify utility membership, not asset types. |
| Comparisons | Labeled menu control; middle-right desktop panel, modal narrow-screen sheet. Same component tree stays mounted across open/close and breakpoint changes. |
| Map actions | One Focus selection action and one Show all locations action, grouped in Comparisons. No page-reload refresh. Search retry recreates the worker while retaining exploration settings. |
| Locations | Searchable checkbox/icon/name rows, at most 100 rendered matches. Unchecked and globally hidden locations remain discoverable. Full supplied names, date meaning, IDs and source evidence are available. |
| Nearby summary | Counts unique projects represented in displayed qualifying pairs. Explicitly limited to displayed matches when search or retention is partial. A selected project becomes the named reference; clearing it restores all-pair scope. |
| Pair list | Exact-distance ordering, meaningful names, utility identities, units and supportable milestone gaps. Remove visual rank numbers. At most 200 nearby rows. |
| Evidence | Inside Comparisons, including why a pair meets or fails the limit, source dates/meanings, source links, approximate geometry, research notes and original/current/assumed layers. No separate evidence area elsewhere. |
| Distance | Bottom-left whole-unit slider, reference ticks, displayed limit, km/mi choice, double-click and labeled edit action. Invalid drafts have inline feedback and leave the active limit unchanged. |
| Secondary filters | Same-page Filters dialog holds timeline/distribution, unknown dates, small-dataset exhaustive view, utility search and what-if controls. The map shows only the filtered project count and any active what-if assumptions; date details remain in Filters. |
| Map settings | Heatmap and radius-circle switches plus Light/Dark basemap appearance. Settings do not change eligibility or selection. |
| Map help | Utility shapes/colors, selection, half-threshold circles, exact match treatment, density colors, units, approximation and historical planning limitations. |
| Data tools | Existing imports, corrections, source files and extraction review remain available; mounted content preserves drafts/checks on ordinary close. Explicit dataset acceptance resets the workspace. |
| Exports | Selected pair and displayed rows remain separate actions. Scope now also records the active reference, unrounded miles threshold and presentation unit; existing provenance/precision/completeness fields remain intact. |
| Engineering explanations | Remain in documentation. Sampling, incomplete-result warnings and source limitations remain beside affected claims. |

## Confirmed and chosen behavior

The previously supplied Sperry clarification accepts explained representative centers or closest points, either 25 miles or 40 km, and adjustable thresholds. GridLock retains its supplied endpoint proxies and 25-mile default. That sponsor clarification does not establish current opportunity status.

The new request combined a fixed 0–250 range in each unit with physical-radius preservation. These cannot both hold. The user delegated this choice after a concise clarification. The chosen contract is a fixed physical **250 km maximum**. Switching units preserves the exact internal miles value; it never rounds, clamps or reinterprets the search radius. The miles maximum is `250 / 1.609344`, approximately 155.342798. Typed values must be whole numbers (0–250 km or 0–155 mi). Slider stops are whole selected units plus the exact converted maximum. The final miles interval is shorter; Base UI uses an ordinal endpoint with physical `aria-valuetext`. Conversion-generated decimals are presentation values, not permission for decimal user entry.

Zero is a valid threshold and gives a complete empty match set. The exact comparison is still **unrounded distance < threshold**. The exhaustive small-data view may display out-of-range pairs, but they are explicitly labeled and never highlighted as qualifying.

Individual exclusions, global utility selection and date eligibility intersect. Turning off a utility does not change its saved location checkboxes. The reference query searches directly from that eligible project rather than filtering a global truncated list, so unrelated close pairs cannot hide its neighbors. All eligible map points remain visible. An ineligible or unlocated reference remains inspectable, with an explicit reason that nearby pairs cannot be established. Geometry indexes remain reusable when only filters change.

## Names and sources

“Evans–Thurmond #5” is not an interface rank. The supplied Georgia report's PDF page 410 (printed 240/304) uses `EVANS PRIMARY - THURMOND DAM (USA) #5 115KV REBUILD`, TEAMS ID 20793; the next page names #6 with a different ID. The interface keeps the short name as “Evans–Thurmond · line #5” and retains the full original source name. It does not invent a “circuit” definition or remove the source designation. The reported construction scope is Euchee Creek–Thurmond plus bus work; the workbook's broader endpoints remain the unchanged baseline proxy. Jasper–Okatie's #2 likewise differs from its project ID (Dominion PDF page 23).

Source files, generated baseline records, research annotations, full-report catalog and extraction results are unchanged. The original ten records still have 25 cross-company combinations and six matches below 25 miles. Dates retain their original milestone meanings and precision; inferred specifications in the concise list only echo a voltage explicitly present in the source name.

## Map semantics and bounds

Blue UtilityPole and orange Zap Lucide shapes distinguish DESC and GPC; the legend states that these identify utilities. Other imported utilities use their supplied names and a neutral Building2 shape. Text, shape and selection outlines accompany color.

Each circle's radius is **half the distance threshold**, in meters for Leaflet. Two equal geographic circles overlap at qualifying representative-point separations; exact tangency is excluded by the search predicate. Projection and pixels are not used to determine eligibility. Circles are neither footprints nor service territories. Match highlighting is derived only from exact qualifying pairs, with selectable bounded connectors and reference-based marker/circle choices. There is an equivalent keyboard path through comparison rows.

Markers/circles are bounded at 1,200; match connectors at 200; heat presentation at 5,000 points. Sampling and aggregation preserve the dataset and are labeled on the map. Heat colors mean low-to-high record density (green, yellow, orange, red), not risk or savings. Theme changes style the existing OpenStreetMap basemap without changing providers or attribution. Interface panels remain light for consistent text contrast. Tile failure leaves local points and evidence usable.

## Verification

The integrated app passed **73 tests across ten test files**, formatting, production dependency notices, TypeScript/production build and Git whitespace checks under Node **24.14.1**. Fresh worktrees used `npm ci`. Source files, normalized demo records, annotations, report catalog and extraction artifacts have no diff against `c7b5855`.

Functional browser checks ran in Chrome 152 on macOS, with final main-flow checks repeated in an isolated headless session. Desktop 1440 × 1000 and narrow 390 × 844 / 320 × 740 were exercised. One map remained mounted, and the narrow page had no horizontal overflow.

- Global utility toggles preserve an unchecked location. Map marker counts and pair counts update together. Reference selection restricts comparison scope; closing/reopening panels and toggling units/overlays/appearance preserve the reference, selected pair, saved checkboxes and map position.
- Keyboard pair selection focuses contextual evidence. Original need-date/in-service meanings and source links remain present. Selected CSV retains the exact 7.548090711868766-mile/517-day case, original dates, precision, hashes, completeness and explicit reference/threshold scope.
- Physical conversion from 25 mi to 40.2336 km, invalid decimal/out-of-range edits, valid zero, keyboard Home/End at both exact physical endpoints, and focus return from the direct editor passed. Mouse dragging itself was not separately recorded in the final functional script; the control uses Base UI's existing pointer handling.
- A two-record synthetic CSV computes **exactly one mile**. At a one-mile limit it produces complete zero matches/zero connectors and two half-mile circles. At two miles it produces one match and one connector, exporting an exact distance of 1. This establishes the strict geographic predicate independently of pixel overlap.
- Narrow sheet bounds, Tab/Shift+Tab containment, Escape/return focus, negative year shifts entered with actual key presses, timeline keyboard adjustment, persistent assumption summary, same-panel evidence and map-help semantics passed.
- Delayed/failed worker loading presents loading/error states with disabled export; Retry restores six sample matches. Blocked OSM requests leave ten markers and six comparisons with an explicit basemap warning. A simulated extraction-review 503 recovers with Try again.
- A 10,000-record dense CSV yields an explicitly incomplete search. Actual DOM counts were 1,112 markers/circles, 200 connectors/pair rows, 100 searchable location rows and one weighted heat cell for this concentrated fixture. Export has exactly 200 distinct rows, all marked incomplete. A one-utility import has an actionable empty state and disabled pair export.
- Import mapping drafts, unapplied correction drafts and extraction-review acknowledgments survive ordinary Data tools closure. Date/precision corrections outside the supported 1900–2200 year range are rejected; the validation message now states that range.

The spatial agent reran the seeded engine benchmark on Apple M5, 10 logical CPUs, 32 GiB, Darwin 27.0.0, Node 24.14.1. Single-run 100,000-record query times were 33.7 ms sparse (at least 1,953 matches), 57.0 ms dense (at least 4,096), and 14.6 ms separated utilities (complete zero). All 1,000-record exhaustive-oracle comparisons agreed. Sparse/dense previews are bounded, not complete performance claims. Browser rendering is a separate check. Raw measurements are retained under ignored local output.

Browser testing found and fixed the panel's initial portal placement, a desktop translation persisting on the mobile sheet, changing accessible names during invalid year-shift drafts, and source aliases hiding corrected names. Pair selection now brings the evidence heading to the top of the panel. A defensive guard pauses matching if retained assumptions ever exceed supported calendar bounds; the ordinary correction UI rejects such extreme dates first, so that defensive branch is **not claimed as browser-tested**.

Initial headed screenshot captures timed out; reported functional passes were reproduced in an isolated headless session. Some desktop/narrow screenshots were captured and inspected during development. The user then requested **skipping further visual confirmation**; no final visual sign-off is claimed after that instruction. Expected console errors came from injected network failures; the existing Leaflet heat canvas performance hint remains. This is not a screen-reader, real-device or cross-browser certification.

Scripts, CSVs, screenshots and the independent edge-QA report are in ignored `output/playwright/`. Imports, corrections and review checks remain session-only. No push, deployment or submission was performed.

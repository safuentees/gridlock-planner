# Map-first planning workspace

September 26, 2026 refinement. This supersedes the layout described in [the earlier interface audit](INTERFACE_REFINEMENT.md). One page, one Leaflet map, no new routes or deployment. The baseline-ui skill, existing Base UI primitives and Lucide icons guide the implementation.

## Planner flow and element audit

**Filter locations → choose nearby cross-utility comparisons → inspect planned timing and source evidence → export findings.** These are opportunities to investigate, not established simultaneous construction, shared routes or savings.

| Element | Current treatment and purpose |
| --- | --- |
| Header | Compact GridLock identity, record count, historical/uploaded context and correction count. Filters, Map settings and Map help are labeled icon buttons beside Data tools. Upload dataset offers the default sample plus computer files. Source name remains available in Data tools and the header tooltip. |
| Map | Fills the remaining viewport; panel, filter and appearance changes retain the same map instance and camera position. Explicit fit actions account for overlay space. |
| Utility visibility | Top-left labeled buttons; all additional imported utilities remain accessible through Filters. Icons identify utility membership, not asset types. |
| Comparisons | Labeled menu control; top-anchored desktop panel, modal narrow-screen sheet. Same component tree stays mounted across open/close and breakpoint changes. |
| Map actions | One Focus selection action and one Show all locations action, grouped inside Map settings. No page-reload refresh. Search retry recreates the worker while retaining exploration settings. |
| Locations | Collapsed initially under Filters. Searchable checkbox/icon/name rows, at most 100 rendered matches. Unchecked and globally hidden locations remain discoverable. Full supplied names, date meaning, IDs and source evidence are available. |
| Nearby summary | Content-sized card with an enlarged count, Nearby pairs and distance limit stays at the top center of the map when Comparisons toggles. Partial counts retain “At least”; the label identifies what-if/reference scope. Detailed assumptions and incomplete-result context remain in Comparisons and marker descriptions. |
| Pair list | Default content in Comparisons, using one-open Base UI accordion rows with timing and source evidence directly beneath their triggers. Export is in the panel header. Exact-distance ordering, meaningful names, utility identities, units and supportable milestone gaps. Remove visual rank numbers. At most 200 nearby rows. |
| Evidence | Inline inside the expanded comparison row, including why a pair meets or fails the limit, source dates/meanings, source links, approximate geometry, research notes and original/current/assumed layers. No separate evidence area elsewhere. |
| Distance | Expandable nearby-pair card contains the whole-unit slider, reference ticks, displayed limit, km/mi choice, double-click and labeled edit action; no bottom-left duplicate. Invalid drafts have inline feedback and leave the active limit unchanged. |
| Secondary filters | Same-page Filters dialog holds timeline/distribution, unknown dates, small-dataset exhaustive view, utility search and what-if controls. The desktop map retains a filtered project count; the map count is labeled What-if when assumptions are active; detailed shifts remain in Comparisons and Filters. Date details remain in Filters. |
| Map settings | Heatmap and radius-circle switches plus Light/Dark basemap appearance. Circles start on. Settings do not change eligibility or selection. |
| Map help | Utility shapes/colors, selection, half-threshold circles, exact match treatment, density colors, units, approximation and historical planning limitations. |
| Data tools | Corrections, source files and extraction review remain available; mounted content preserves drafts/checks on ordinary close. Upload dataset owns the shared compact import form and preserves its draft on close; explicit acceptance resets the workspace. |
| Exports | One export icon opens a Base UI menu with selected-comparison and displayed-comparisons CSV options. Scope now also records the active reference, unrounded miles threshold and presentation unit; existing provenance/precision/completeness fields remain intact. |
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

Each circle's radius is **half the distance threshold**, in meters for Leaflet. Two equal geographic circles overlap at qualifying representative-point separations; exact tangency is excluded by the search predicate. Projection and pixels are not used to determine eligibility. Circles are neither footprints nor service territories. Match highlighting is derived only from exact qualifying pairs, with reference-based marker/circle choices and one selected, labeled measurement. There is an equivalent keyboard path through comparison rows.

Markers/circles are bounded at 1,200; the selected measurement at one; heat presentation at 5,000 points. Sampling and aggregation preserve the dataset and are labeled on the map. Heat colors mean low-to-high record density (green, yellow, orange, red), not risk or savings. Theme changes style the existing OpenStreetMap basemap without changing providers or attribution. Interface panels remain light for consistent text contrast. Tile failure leaves local points and evidence usable.

## Earlier iteration verification

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

## Match visibility refinement

The map overview distinguishes pair counts from unique projects and utilities. Six nearby pairs in the supplied fixture involve seven projects across two utilities; these are planning comparisons, not established simultaneous work. Loading/errors show no numeric result, partial search uses “At least”, and marker/project counts explicitly describe displayed pairs when retention or search is incomplete. Reference scope remains visible. Exhaustive mode can list 25 comparisons while the map count still describes only six nearby pairs.

Locations start collapsed. Focus and Show all move to the map overview. Pair rows retain company icons, readable names, distance units and milestone gaps, with source meaning and uncertainty available in selected evidence. Circles start on; qualifying projects gain green circles and numeric partner badges. Only the selected pair draws a solid, distance-labeled measurement; the default web of dashed lines is removed. Heat retains equal source-record weights and uses softer, zoom-aware relative density rendering, distinct from the green match indicators.

The overview follows the toolbar's natural wrapping. Narrow layouts abbreviate utility toggles while retaining their full accessible names; the overview can scroll on short screens so controls and the map legend remain reachable. Assumption labels remain beside the nearby count. Marker controls are native buttons, including Enter/Space behavior. A local adapter cancels/guards the pinned heat plugin's delayed redraw callbacks when its layer is removed.

### Verification of this refinement

- **79 tests in 11 files**, production build/typecheck, formatting, dependency notices and whitespace checks passed on Node 24.14.1. Added checks cover distinct partner counts, reversed/duplicate/stale comparisons, strict boundary behavior, dateline measurement labels and heat normalization. Source records, original documents and spatial matching logic are unchanged.
- Functional Chromium checks at 1440 × 1000, 390 × 844, 320 × 740 and 320 × 640 passed without screenshots. Default state has ten circles, seven numbered project markers, six nearby pairs and zero measurement lines. Locations start collapsed. Pair selection exposes one solid “Approx. 7.55 mi apart” label; unit conversion produces 12.15 km. Per-project counts are 1/1/2/2 for matching Dominion records and 2/2/2 for matching Georgia records.
- Keyboard pair/marker activation, focus return and modal Tab/Shift+Tab containment passed. Saved exclusions survive utility toggles; reference scope, selection and map position survive panel/overlay changes. Zero distance clears match badges/circles and nearby pairs. The 25-row exhaustive view still shows only six nearby pairs in the overview; a distant selected measurement is not marked as a match.
- Selected CSV preserves the 7.548090711868766-mile / 517-day comparison and original need-date/in-service meanings. Dense 10k and complete 100-row imports distinguish “At least 4,096” from exact 2,500 total pairs, while both retain 200 displayed/exported rows and mark the badge count scope. Independent export checks confirmed hashes, dates, unique pairs and distances. Loading, cancellation, failure/retry and delayed stale-result checks passed without a false numeric count.
- Heat paints a nonempty canvas, matched-circle fill is absent in heat mode, and rapid filtering, toggling and zooming finish without page errors after the cleanup fix. Narrow overview/legend bounds do not overlap in the checked normal/assumed-date states. Short screens retain scrolling access to overview actions. These checks establish rendering and interaction behavior, not a subjective visual assessment of heatmap aesthetics.

Ignored local artifacts are `output/playwright/match-{main,mobile,assumptions}-*`, `match-edge-*`, and `match-selected-pair.csv`. Early development checks caught and corrected marker keyboard activation, heat redraw cleanup and a narrow-toolbar overlap. Prior screenshots/results above describe the preceding iteration. **Visual confirmation remains skipped at the user's request**; no screenshot review, physical-device or independent screen-reader certification is claimed.

## Compact pair summary

The summary now shows only the count, pair label and distance limit in the ordinary view. Its centered position does not depend on whether Comparisons is open. Focus/Show all remain available inside Comparisons, and the extra partner-number legend sentence is removed without changing marker badges. Loading/error states and incomplete-search lower bounds remain explicit; scoped reference/what-if counts use corresponding labels. The earlier match-visibility verification above describes the previous layout.

Functional Chromium checks of this refinement passed at 1440×1000, 1024×800, 390×844 and 320×740. The summary had identical position and dimensions before/after opening Comparisons at every size, with no desktop panel overlap or page overflow. Focus/Show all remained usable after pair selection, one map stayed mounted, and zero-distance/reset counts updated correctly. A synthetic large-count label also stayed within the card. All 79 tests, formatting, dependency notices, production build and whitespace checks passed. Visual screenshot review remained skipped at the user's request; local functional scripts/logs are under ignored `output/playwright/compact-summary-check.*`.

The subsequent top-placement refinement enlarges the count to 48px, the label to 18px and the limit to 14px. The card uses content width with viewport bounds. At wide desktop sizes it shares the toolbar's top edge; below 1280px the toolbar flows beneath it. Functional Chromium checks passed at 1440, 1280, 1024, 390 and 320px widths: the card remained 12px below the map's top and stayed at identical coordinates across panel toggles, with no toolbar overlap. Map actions, count updates and large-label containment passed, along with all 79 tests and required build/format/notice/whitespace checks. No screenshots were taken. Local checks are retained in ignored `output/playwright/top-summary-check.*`.

## Distance-slider continuity

Distance-only queries retain the last completed result while the worker calculates the next one. The count, displayed limit, circle radius, matches and evidence all use that completed query's threshold; the input remains responsive to the requested value. Exports are guarded while pending. A utility, date, reference, exclusion, assumption, dataset or retry change still clears incompatible results immediately. Heat-layer lifetime now depends on density coordinates/weights and display mode rather than distance or selection, and unchanged eligible project IDs retain stable presentation inputs.

Real mouse drags at 1440px and 390px widths sampled 409 animation frames: no missing markers, circles or count; no loading-list replacement; and the same connected heat canvas throughout. A 900ms worker-delay check retained “6 / Under 25 mi” while a new threshold was pending, disabled both exports, rejected an obsolete zero-distance response and updated coherently to “1 / Under 5 mi”. Changing utility scope still cleared the previous results synchronously. Tests cover scope isolation and repeated pending changes; all 81 tests, formatting, notices, production build and whitespace checks passed. No screenshot review was performed. Local evidence is in ignored `output/playwright/slider-*.{js,log}`.

The required seeded engine benchmark also completed on Apple M5 (10 logical CPUs, 32 GiB), Darwin 27.0.0, Node 24.14.1. All three 1,000-record distributions agreed with the exhaustive oracle. At 100,000 records, single-run queries took 32.6ms sparse (candidate-limited; at least 1,953 matches), 15.6ms dense (neighbor-limited; at least 4,096 matches), and 16.0ms separated (complete zero). These are bounded engine measurements, not completed dense searches or browser timings. Configuration, cancellation measurements and full results are in ignored `output/benchmarks/slider-refresh.json`.

## Header map tools

Filters, Map settings and Map help now use icon-only header triggers beside Data tools, with hover titles and accessible names. Their existing Base UI dialog trees remain mounted in the workspace; only the triggers are portaled into the header. The narrow header wraps the identity above the action row without introducing new navigation.

Functional Chromium checks passed at 1440×900, 768×900, 390×844 and 320×740: buttons remained aligned beside Data tools without page overflow, each appeared once, keyboard opening/Tab/Escape/focus return worked, and filter and heatmap settings survived close/reopen. One map remained present and the six-pair sample recovered after filter changes. All 81 tests, notices, formatting, build and whitespace checks passed; screenshot review remained skipped. Ignored local verification: `output/playwright/header-tools-check.*`.

## Comparison accordion

September 27, 2026: the default Comparisons panel contains its export header and the ranked accordion list. Selecting a row expands its existing timing, provenance and export content immediately below that row; selecting it again collapses it. Removed the scroll-to-evidence/focus transfers and the list's nested scroll container. Desktop panels are top-anchored so expansion does not recenter them. Location selections remain under Filters, map navigation under Map settings, and reference evidence is a contextual disclosure. Conditional assumptions, incomplete-results and error/empty states remain available. Earlier sections record historical layouts.

Functional Chromium checks passed at 1440×1000, 390×844 and 320×740: inline expansion, unchanged panel scroll position and trigger focus, Enter/Space toggling, one expanded pair, preserved selection on panel reopen, linked map selection, responsive bounds, retained location exclusions, reference evidence and map actions. All 81 tests, formatting, notices, production build and whitespace checks passed. No screenshot review was performed. Local verification scripts/logs are ignored under `output/playwright/accordion-*`.

These checks were repeated after integrating the concurrent header-icon update. Selected CSV export retained the exact 7.548090711868766-mile / 517-day pair; zero-distance empty state and reset also passed.


## Comparison export menu

September 27, 2026: the Comparisons header now has one export icon. The existing Base UI Menu provides displayed-comparisons and selected-comparison CSV actions, keyboard navigation, dismissal and focus return. Selected export is disabled until a pair is expanded; both options are disabled during pending searches or when unavailable. CSV contents and scope/provenance remain unchanged. This supersedes the separate export actions described in earlier verification notes.

Functional Chromium checks passed at 1440×1000, 390×844 and 320×740: both downloads, disabled selection/empty states, viewport bounds, Escape returning focus without closing the parent sheet, and retained accordion selection. Download inspection confirmed six displayed rows and the selected DESC_3::GPC_3 row with its exact distance, milestone meanings and provenance. No screenshot review was performed. Local verification scripts/logs are ignored under `output/playwright/export-menu-*`.

A delayed-worker check confirmed both exports are disabled while updating; ArrowDown/Enter exports through the menu. All 81 tests, formatting, notices, production build and whitespace checks passed. Vite reports a nonfatal main-chunk size warning (532 kB after adding the library menu).

## Expandable distance card

The top nearby-pair card is now a Base UI collapsible. Its labeled button and chevron open on click, touch or keyboard activation, revealing the existing slider, units and exact-value editor within the same container. Closing keeps its draft mounted but removes hidden controls from keyboard access. The card stays anchored at the top; tablet comparison width leaves room for the expanded editor. Map notices move down into the space vacated by the old bottom-left card.

Motion for React 12.35.0 was selected for this React-specific layout transition. [Motion's layout documentation](https://motion.dev/docs/react-layout-animations) describes transform-based size/position animation; [Base UI's animation guide](https://base-ui.com/react/handbook/animation) documents integration with Motion. Base UI supplies disclosure semantics, while Motion supplies the 180ms ease-out layout, opacity and chevron transitions. Reduced-motion preference removes the transition. This is a fit-for-project choice, not a claim that Motion is universally the best animation library. Feature code is split into a separate bundle; Motion still increases download size, and Vite reports its standard main-chunk size advisory. Production dependency notices include the added packages.

All 81 tests, format, notice, TypeScript/Vite build and whitespace checks pass. Browser checks at 1440, 1024, 390 and 320px widths covered top anchoring, viewport/panel fit, keyboard expansion, hidden-control exclusion, zero-distance matching, physical unit conversion and draft preservation. Reduced-motion mode had no running card animations. Actual mouse dragging at 1440 and 390px sampled 450 frames with no absent count, markers or circles, no loading-list replacement and one unchanged heat canvas. Source data and query semantics are unchanged. Visual screenshot review remains skipped at the user's request. Ignored local evidence: `output/playwright/expand-distance-*.{js,log}`.

### Stationary distance expansion

September 27, 2026: reserve a responsive 20rem card width in both states and set the Motion transform origin at the top center. Expansion changes only height; the summary and card edges remain stationary. This supersedes the earlier content-sized card width. Functional Chromium frame sampling verified opening and closing at 1440, 1024, 390 and 320px widths: no horizontal or top-edge movement, with summary movement below 0.001px. Keyboard toggling and hidden-slider exclusion passed. All 81 tests, notices, formatting, production build and whitespace checks passed; the existing bundle-size advisory remains. Screenshot review remains skipped as requested. Local evidence: `output/playwright/stationary-distance-check.{js,log}`.

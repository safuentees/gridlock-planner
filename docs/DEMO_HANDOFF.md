# GridLock demo handoff

Plan recorded **Saturday, September 26, 2026 at 4:07 a.m. EDT** (`America/New_York`, UTC−04:00). Submission and hacking end **Sunday, September 27 at 11:00 a.m. EDT**: approximately **30 hours 53 minutes remaining** at this checkpoint. These are remaining hours, not a new 36-hour hacking window. [Official schedule](https://shellhacks-2026.devpost.com/details/dates); evidence and remaining unknowns are in [event-rules.json](event-rules.json).

## Four responsibilities

Assign one owner to each lane; review another owner's work before the demo.

| Owner | Responsibility | Concrete handoff |
|---|---|---|
| 1 — Product and map | Filters, threshold and units, map/heat view, responsive and keyboard flows | Demonstrate all ten original records and 25 comparisons; keep representative points and density labels understandable. |
| 2 — Data and evidence | Workbook preservation, report extraction, source links, Jasper–Okatie / Goshen–Georgia Pacific scope review | Reproduce original values and six nearby pairs at 25 miles; explain scope corrections and missing construction intervals without silently changing originals. |
| 3 — Domain and verification | Distance/date logic, scenarios, automated tests, fresh-install and browser checks | Verify boundary and missing-data behavior, scenario purity, production build and report reproducibility; log actual failures. |
| 4 — Demo and submission | Three-minute story, attribution, team details, Devpost draft and submission verification | Inspect required form fields early, collect artifacts, rehearse with another presenter, and own the submission buffer. |

Keep API integrations optional. The core workflow needs no API keys or sponsor account: comparisons, evidence and scenarios run locally. The OpenStreetMap basemap needs internet; test the fallback with tiles unavailable and retain local source PDFs. Add a sponsor API only if it improves the story and is already reliable.

## Remaining-time plan

All times below are EDT. Move work earlier when possible; preserve rest and the final buffer.

| Window | Work |
|---|---|
| Sat 4:10–4:30 a.m. | Save the working state, assign owners, record known issues and opening instructions. No new feature scope. |
| Sat 4:30–10:30 a.m. | Rest. Avoid requiring the whole team to stay awake for a running development server. |
| Sat 10:30 a.m.–3:00 p.m. | Complete map, evidence and scenario interactions; inspect the authenticated submission form and resolve required fields early. Take a lunch break. |
| Sat 3:00–6:00 p.m. | Run automated and browser checks, verify source links and the detailed case, and test on the presentation laptop. Fix material defects. |
| Sat 6:00–7:00 p.m. | Dinner and a break. |
| Sat 7:00–10:00 p.m. | Rehearse, finish attribution and submission text, capture backup screenshots/video if useful or required, and freeze feature scope. |
| Sat 10:00 p.m.–Sun 6:00 a.m. | Rest; keep the tested version ready. |
| Sun 6:00–8:30 a.m. | Final regression and a timed rehearsal. Confirm every teammate, category, repository link and required form field. Fix only submission/demo blockers. |
| Sun 8:30–9:30 a.m. | Complete submission and verify its submitted state and links. Publishing a repository or site remains an explicit team action. |
| Sun 9:30–11:00 a.m. | Reserved submission/recovery buffer. Finish all hacking before 11:00 a.m.; do not depend on the last minute. |
| Sun after 11:00 a.m. | Break, check the announced judging location, and arrive by 1:00 p.m. with the presentation laptop ready. |

## Verification and three-minute demonstration

Run `npm test`, `npm run build`, and `python3 scripts/extract_reports.py --check` (Python dependencies are in `scripts/requirements.txt`). Check both display units, zero/exact distance boundaries, no companies selected, inclusive date bounds, an empty result, original values after scenario changes, CSV output, source links, keyboard operation, a narrow screen and unavailable basemap tiles. A successful build alone does not establish those UI behaviors.

Use this timed story:

1. **0:00–0:25 — Problem.** Public planning records make nearby work hard to investigate. Show ten supplied records, all 25 cross-company pairs and the original historical date basis.
2. **0:25–1:05 — Explore.** Switch to the heat map, change the adjustable threshold, and show the ranked comparisons. Explain equal-weight planning density and approximate center-point distances.
3. **1:05–1:50 — Inspect evidence.** Open Jasper–Okatie with the workbook's Goshen–McIntosh record. Explain that the reviewed rebuild concerns the Goshen–Georgia Pacific section, while the workbook geometry remains preserved. Show original dates, sources and uncertainty; proximity does not prove concurrent construction or savings.
4. **1:50–2:35 — Scenarios.** Change a company schedule assumption and target year. Show original versus shifted counts. Both shifted milestones must fall in the target calendar year; the later milestone must be within the chosen number of calendar months after the earlier one, with month-end clamping. These are explicit assumptions, with no future probabilities.
5. **2:35–3:00 — Evidence and contribution.** Explain the full-report assessment, why a validated construction forecast is unsupported, and the next data needed. Briefly identify team contributions and external code use. Keep more detail ready for questions.

Prepare a second presenter and local backup artifacts. The supplied guide specifies a three-minute in-person live demo; a possible second round is three to five minutes.

## Confirmed submission checklist

The [event rules](https://shellhacks-2026.devpost.com/rules), [public requirements](https://shellhacks-2026.devpost.com/) and supplied guide updated September 24 establish:

- At most four hackers; one submitted project per team. Do not submit the same project to another hackathon.
- Submit work created during the hacking period; libraries, frameworks and open-source code are allowed with external-code documentation in the submission and mention during judging.
- One teammate creates the Devpost project and invites every teammate. Use the registration email and include first/last names in accounts or submission comments.
- Include the GitHub repository link and at least one Discord tag for judge contact.
- Select intended prize categories before the deadline, including Sperry. Multiple challenges can use the same single project; each sponsor's own requirements still apply. General best-overall consideration is automatic under the supplied guide.
- Follow the MLH Code of Conduct, submit before **11:00 a.m. EDT Sunday**, and follow the announced judging room/table assignment.

## Attribution, disclosure and precise unknowns

Document actual external use in the README and Devpost, and mention it during judging: React, TypeScript/Vite, Tailwind, Base UI, Lucide, Leaflet/Leaflet.heat, OpenStreetMap, the supplied workbook and public utility reports, plus any copied code or additional tools actually used. Preserve required dependency and map attribution. Distinguish source data, library functionality and team-authored work; the lockfile is not a substitute for that explanation.

Disclose that **Codex assisted research, implementation, tests and documentation**, then state the team's actual design decisions, verification and contributions. Do not claim that unperformed manual checks were completed. The guide advertises AI coding workshops, but no precise AI-specific permission scope or disclosure field was found in the accessed public rules. This disclosure practice does not manufacture an organizer policy.

Disclose earlier research/data-review notes separately from event-created application code. Preserve their provenance and avoid claiming that all research was produced during the event. Sperry explicitly permits using the supplied historical data as-is; that clarification does not decide every event-level prior-work question.

Owner 4 should resolve only these remaining items from the event's available guidance/form before final submission:

- Exact organizer-declared hacking start time; Devpost's Friday 11:15 p.m. time is the **submission opening**, not proof of hacking start.
- Treatment of any pre-event authored research or curated notes included in the submission.
- Any AI-specific scope/disclosure requirement beyond the confirmed external-code attribution rule.
- Authenticated form requirements not visible publicly, including whether video, screenshots or a particular live URL are mandatory.

These targeted checks do not restart project selection or block fresh implementation. No account action, external message, publication or submission is performed by this document.

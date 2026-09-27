# GridLock demo handoff

Implementation handoff refreshed **Saturday, September 26, 2026 at 7:25 p.m. EDT**. The deadline remains **Sunday, September 27 at 11:00 a.m. EDT**: about **15 hours 35 minutes** at this checkpoint. This supersedes the earlier 4:07 a.m. work plan. The official schedule was rechecked; its hash and retrieval time are in [event-rules.json](event-rules.json). Recalculate time when using this handoff.

## Four responsibilities

| Owner | Responsibility | Next concrete handoff |
| --- | --- | --- |
| 1 — Spatial and performance | Own radius indexing, exact-distance ranking, bounded counts, cancellation and benchmarks | Explain complete versus partial results; independently run the fixture and seeded benchmark. Do not add an unbounded dense export. |
| 2 — Ingestion, provenance and ML | Own CSV/XLSX mapping, corrections, source hashes and extraction evaluation | Independently review extracted fields against original pages. Separate missing outcomes from negative labels; verify a teammate's upload and correction reset. |
| 3 — Main workspace | Own timeline, map/heat, filters, ranked list and source inspection | Test the presentation laptop, keyboard flow and narrow screen. Keep Planned, What-if and unavailable Forecast visibly distinct. |
| 4 — Integration and demonstration | Own fresh-install checks, team review, presentation, attribution and submission preparation | Prepare the Devpost draft, required identities/links, backup screenshots and timed rehearsal; verify submitted state when the team authorizes submission. |

The implemented vertical slice is local and browser-first: default source sample → map/timeline → nearby list → original evidence; upload → sheet/header → mapping → validation → acceptance; separate reversible corrections; separate what-if shifts; bounded CSV export. Offline Gemini extraction is evaluated and review-gated. No construction forecast was trained. The core demo requires no API credential or live model call. Basemap tiles need internet; source PDFs and calculations are local. Imports, corrections and extraction-review acknowledgments are session-only; export corrections before refreshing.

## Remaining-time plan

All times below are EDT. Feature implementation is complete; prioritize verification and rest.

| Window | Work |
| --- | --- |
| Sat 7:25–8:30 p.m. | Peer-review the working slice and run it on the presentation laptop. Fix demonstrated blockers only; verify the authenticated submission requirements. |
| Sat 8:30–9:15 p.m. | Dinner/break and a timed three-minute rehearsal with a second presenter. |
| Sat 9:15–10:00 p.m. | Finish attribution, submission draft and backup artifacts. Freeze feature scope and keep the tested local revision. |
| Sat 10:00 p.m.–Sun 6:00 a.m. | Rest. No overnight model/data collection dependency. |
| Sun 6:00–8:30 a.m. | Final regression, source/evidence check and rehearsal. Confirm every teammate, repository link and required form field. |
| Sun 8:30–9:30 a.m. | Team completes and verifies submission. Publishing/pushing/submitting remains an explicit team action; none was done by this implementation task. |
| Sun 9:30–11:00 a.m. | Submission/recovery buffer. Finish all hacking before 11:00 a.m. |
| Sun after 11:00 a.m. | Break, check the announced judging location and arrive by 1:00 p.m. |

## Verification and three-minute demonstration

Run the [README checks](../README.md#verify-and-reproduce) and see [PERFORMANCE.md](PERFORMANCE.md), [EXTRACTION_EVALUATION.md](EXTRACTION_EVALUATION.md) and [IMPLEMENTATION_VERIFICATION.md](IMPLEMENTATION_VERIFICATION.md) for measured evidence and limitations.

1. **0:00–0:20 — Problem.** Nearby utility plans are hard to investigate across reports. Open the supplied historical sample and identify source dates and approximate geometry.
2. **0:20–1:00 — Map and evidence.** Show six nearby pairs at 25 miles; inspect Jasper–Okatie/Goshen–McIntosh at 7.5481 miles. Explain the reviewed Goshen–Georgia Pacific scope and why proximity does not prove concurrent work.
3. **1:00–1:30 — Time exploration.** Open More filters & what-if, enable schedule assumptions, set explicit year shifts and adjust the range. Show original evidence below the separate assumptions. Disable assumptions to return to planned dates.
4. **1:30–2:00 — New data.** Open Data tools → Import CSV / XLSX, verify the small template’s mapped columns and year/month precision, accept it, then restore the sample through Source files and date limitations. Keep the template downloaded before judging.
5. **2:00–2:40 — Useful ML.** Open Data tools → Review extracted report fields and inspect a page, source quote and missing fields. Explain Gemini's narrow 80/80-field result on ten selected pages, Codex-checked gold and the need for independent review. It extracts planning fields; it does not predict construction.
6. **2:40–3:00 — Engineering and next step.** Explain bounded indexed search, source hashes and the visible partial-result labels. The next product improvement is resumable dense queries; credible forecasting separately needs linked, cutoff-safe activity outcomes. Attribute external libraries and AI assistance.

The supplied guide specifies a three-minute live demo, with a possible three-to-five-minute second round. Do not make a live API call part of the critical path. Keep the performance table and deeper source review ready for questions.

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

# Gemini-assisted public report extraction

GridLock now has a small, evaluated **document-extraction experiment**. It uses the pretrained Gemini API to read planning fields, with source evidence and mandatory review. It does not train a custom model, forecast activity, or add model-generated projects to the map.

The live run on September 26, 2026 matched **80/80 selected field values** on ten pages: **42/42 nonmissing values** and **38/38 explicit missing values**. This is a narrow observed result, not a claim of universal accuracy. The existing deterministic parser remains the preferred path for its known report editions.

## Why this ML target

The preferred eventual forecast is documented field activity for an already-known project in a future month, using information available at the forecast cutoff. The supplied catalog provides one planning snapshot per reporting system, no verified construction interval cohort, and no reliable negative activity labels. Thirteen completed-status rows contain previous planned need dates, not actual completion dates. Some reviewed projects have later schedules or completion statements; those case notes do not establish an independently evaluable activity cohort.

A schedule-revision target would require linked frozen plan vintages, stable identity and a later untouched evaluation cohort. The available case-level revisions and this small SERTP sample do not provide that audited panel. The bounded decision is therefore **no activity or schedule-revision forecast** for this release. Missing activity remains unknown. Transparent what-if scenarios continue independently.

The extraction target is eight fields for the **first/topmost project on one public PDF page**: project ID, name, work description, explicit project status, all printed phase milestones, planned implementation start, actual start and actual end. Gemini performs inference with a fixed instruction and structured-output schema; no examples, training, fine-tuning or prediction labels are supplied.

## Frozen reference set and comparison

The gold fields and prompt/schema were fixed before the first inference request. Every selected page was rendered and visually checked by Codex. Known-parser output was used as a transcription aid for the six known-layout pages, then checked against the rendering. The four unfamiliar-layout cases were manually transcribed from their rendered pages. No independent human double-annotation or human review timing was performed.

| Split | Pages, one-based PDF numbering | Purpose |
| --- | --- | --- |
| Known layout | DESC 2, 16, 34; Georgia Power 231, 314, 366 | Regression comparison with existing parser output; includes two phase dates, a summary/detail conflict's detail date, and start-after-need chronology. |
| Unfamiliar layout | Public 2026 SERTP preliminary report 1, 2, 51, 53 | First project only; year precision, absent IDs/status/actual dates, and other cards that must not be merged. |

“Unfamiliar” means that GridLock's existing deterministic parsers do not support that layout. It does not mean the foundation model never saw related documents during training. These four pages share one report, and Goshen appears in both a Georgia and SERTP case. Counts are source-page extraction tasks, not independent jobs or an independent-project holdout. No prompt tuning or reruns were performed after observing results.

The extra source is the official [2026 SERTP Preliminary Expansion Plan public Non-CEII edition](https://www.southeasternrtp.com/docs/general/2026/2026_SERTP_Preliminary_Expansion_Plan_Report_%28Non-CEII%29.pdf), dated June 12, 2026. Public-disclosure markings and released fields are preserved. The experiment neither accesses restricted editions nor reconstructs redactions. Costs and precise geometry are outside its schema.

## Observed results

| Measure | Gemini, known layout | Deterministic, known layout | Gemini, unfamiliar layout | Deterministic, unfamiliar layout |
| --- | --- | --- | --- | --- |
| Supported pages | 6/6 | 6/6 | 4/4 | 0/4; abstained |
| Correct field values | 48/48 | 48/48 | 32/32 | Not scored |
| Correct nonmissing values | 30/30 | 30/30 | 12/12 | Not scored |
| Date-meaning errors | 0 | 0 | 0 | Not scored |
| Unsupported nonempty fills where gold is absent | 0 | 0 | 0 | Not scored |

Field comparison normalizes case, Unicode dashes and whitespace. Other content changes remain errors. All milestones, their phases, precision and meaning count together as one field. Unsupported parser pages are not credited as correct nulls. Wrong nonmissing values would also be listed separately; the “invented values” counter is deliberately limited to filling an absent field and is not a general hallucination detector.

Ten actual `generateContent` requests took **226.469 seconds total**, **16.281 seconds median**, and **54.533 seconds maximum**, excluding PDF slicing/source download. Cached replay preserves original request latency rather than reporting near-zero inference time. The local full-report parser `--check` took **12.384 seconds** over its different, much larger workload; these timings are not a controlled speed comparison. See [local measurements](../data/extraction/local-checks.json) for runtime and command details. Provider token usage and returned model versions are retained per page; no estimated bill or universal speedup is claimed.

Review effort is reported only as a **correction-cell proxy**: zero fields differed from the checked reference, and zero evidence-quote/schema issues were observed. Human seconds and time saved are unavailable. All 80 field cells still require source review before operational use. A correct-looking JSON object or source quote cannot prove that the selected record or its meaning is right.

## Run and reproduce

Python dependencies are separate from the browser app:

```sh
python -m pip install -r scripts/requirements-extraction.txt
python -m unittest discover -s scripts/extraction -p 'test_*.py' -v
python scripts/extraction/benchmark.py evaluate --check
```

The last command is entirely offline. It reproduces metrics from committed structured predictions, the frozen gold/configuration and the existing deterministic catalog. It does not claim to reproduce a new provider response.

For a new live replay of the same frozen benchmark, set `GEMINI_API_KEY` or `GOOGLE_API_KEY` in the process environment using your normal secret-management mechanism, then:

```sh
python scripts/extraction/benchmark.py fetch-sources
python scripts/extraction/benchmark.py run --live --max-api-calls 10
python scripts/extraction/benchmark.py evaluate
```

The adapter uses the stable `gemini-3.5-flash-lite` endpoint, verified by the actual model-list API and [official model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), which lists PDF input and structured output. Its REST request follows the [generateContent reference](https://ai.google.dev/api/generate-content), [structured-output guidance](https://ai.google.dev/gemini-api/docs/structured-output) and [document-processing guidance](https://ai.google.dev/gemini-api/docs/document-processing). API access, model availability and rate limits can change; errors stop the run and are not replaced with synthetic results. The first pass used ten inference calls plus a read-only model-list request.

Raw provider responses live only in `gridlock-extraction-cache` beneath the system temporary directory, or an explicit `--cache-dir` outside the repository. The cache key includes the full document hash, selected page number, sliced page hash, model, prompt, schema and generation configuration. Files are private to the local user; no credentials are written to them. Temporary caches can disappear. A new live run can vary even at temperature zero, and provider/model updates are not under repository control.

All source hashes are verified before spending an inference call. Missing cached sources require the explicit fetch step; changed source bytes require review. The run refuses an altered frozen prompt/configuration. To extend or tune the benchmark, create a new version with a separate development set and untouched evaluation set; do not edit this gold to match predictions.

## Contracts and review gates

- [gold.json](../data/extraction/gold.json): selected pages, source hashes/URLs, visually checked values and reference-set provenance.
- [config.json](../data/extraction/config.json): the exact fixed prompt, model and schema. It contains no credential.
- [predictions.json](../data/extraction/predictions.json): structured fields from actual responses, evidence quotes, missing reasons, response hashes, timestamps, model version, token usage and original call latency. Raw response objects stay outside Git.
- [extraction-evaluation.json](../public/data/extraction-evaluation.json): versioned UI report with `decision`, `target`, `model`, separate `splits`, `totals`, `latency`, `review_effort`, `limitations` and `pages`.

Each page includes `source.{url,sha256,pdf_page,title}`, eight `fields` with `value`, `evidence_quote` and `missing_reason`, plus validation issues. Milestones preserve day/month/year precision and distinguish `planned_in_service` from `need_date`. The selected pages contain only exact planned-start dates; partial-precision start/end extraction is not evaluated. Null actual dates are absence of evidence, never an inactivity label.

Every result is `review_status: "review_required"`, `map_eligible: false` and `training_eligible: false`. Schema/date validation, evidence-quote checks, configuration identity and source hashes guard the pipeline, but do not approve a record. A reviewer must confirm identity, scope, date meanings, precision and evidence; approve corrections separately; and obtain credible geometry before map inclusion. Training additionally requires an appropriate outcome-label and temporal-data audit. This adapter has no automatic promotion path into either dataset.

The highest-value next improvement is a human-double-annotated evaluation from additional public report families, including scans, multi-page records and partial dates, with a separate development set and measured human review time. Keep the known-report parsers, rather than paying for inference to replace a parser already correct on its supported documents.

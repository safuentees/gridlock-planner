#!/usr/bin/env python3
"""Run a frozen public-page extraction benchmark or reproduce its offline report."""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
import statistics
import sys
import time

from adapter import (ROOT, FIELDS, MODEL, DEFAULT_CACHE, cache_directory, config, digest,
                     extract, json_bytes, load_source, normalize)

GOLD = ROOT / 'data/extraction/gold.json'
CONFIG = ROOT / 'data/extraction/config.json'
PREDICTIONS = ROOT / 'data/extraction/predictions.json'
REPORT = ROOT / 'public/data/extraction-evaluation.json'


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def same_value(a, b):
    if isinstance(a, str) and isinstance(b, str):
        return normalize(a) == normalize(b)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(same_value(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return set(a) == set(b) and all(same_value(a[k], b[k]) for k in a)
    return type(a) == type(b) and a == b


def baseline(case, catalog):
    """Adapt existing known-report parser output; abstain on an unsupported layout."""
    if case['source_id'] == 'desc_supplied':
        row = next(r for r in catalog['desc_transmission'] if r['source_pdf_page'] == case['pdf_page'])
        return {'project_id': row['source_project_id'], 'project_name': row['name'],
                'work_scope': row['description'], 'status': row['source_status'],
                'milestones': [{'value': m['value'], 'precision': m['precision'],
                  'meaning': 'planned_in_service', 'phase': m['phase']} for m in row['planned_milestones']],
                'planned_start': None, 'actual_start': row['actual_start'], 'actual_end': row['actual_end']}
    if case['source_id'] == 'gpc_supplied':
        row = next(r for r in catalog['georgia_its_active_transmission'] if r['detail_pdf_page'] == case['pdf_page'])
        return {'project_id': row['teams_id'], 'project_name': row['name'],
                'work_scope': row['description'], 'status': None,
                'milestones': [{'value': row['detail_need_date'], 'precision': 'day',
                  'meaning': 'need_date', 'phase': None}], 'planned_start': row['planned_implementation_start'],
                'actual_start': row['actual_start'], 'actual_end': row['actual_end']}
    return None


def score(values, gold):
    if values is None:
        return {'status': 'unsupported_layout', 'fields_scored': 0, 'correct_fields': 0,
                'nonmissing_fields': 0, 'nonmissing_correct': 0, 'missing_fields': 0,
                'missing_correct': 0, 'date_meaning_errors': 0, 'invented_values': 0,
                'corrections_required': None, 'differences': []}
    differences, correct, nonmissing, nonmissing_correct, missing_correct = [], 0, 0, 0, 0
    invented = meaning_errors = 0
    for key in FIELDS:
        expected = gold[key]
        present = key in values
        actual = values.get(key)
        matches = present and same_value(actual, expected)
        correct += int(matches)
        if expected is not None and expected != []:
            nonmissing += 1
            nonmissing_correct += int(matches)
        else:
            missing_correct += int(matches)
            if actual is not None and actual != []:
                invented += 1
        if not matches:
            differences.append({'field': key, 'expected': expected, 'extracted': actual,
                                'field_present': present})
        if key in ('actual_start', 'actual_end') and actual is not None and expected is None:
            meaning_errors += 1
        if key == 'milestones' and isinstance(actual, list):
            for index, item in enumerate(actual):
                if isinstance(item, dict) and index < len(expected) and item.get('meaning') != expected[index]['meaning']:
                    meaning_errors += 1
    return {'status': 'scored', 'fields_scored': len(FIELDS), 'correct_fields': correct,
            'nonmissing_fields': nonmissing, 'nonmissing_correct': nonmissing_correct,
            'missing_fields': len(FIELDS) - nonmissing, 'missing_correct': missing_correct,
            'date_meaning_errors': meaning_errors, 'invented_values': invented,
            'corrections_required': len(differences), 'differences': differences}


def aggregate(results, engine):
    counts = {key: sum(r['scores'][engine][key] for r in results) for key in
              ('fields_scored', 'correct_fields', 'nonmissing_fields', 'nonmissing_correct',
               'missing_fields', 'missing_correct', 'date_meaning_errors', 'invented_values')}
    counts['supported_pages'] = sum(r['scores'][engine]['status'] == 'scored' for r in results)
    counts['total_pages'] = len(results)
    counts['field_correctness'] = counts['correct_fields'] / counts['fields_scored'] if counts['fields_scored'] else None
    counts['nonmissing_field_correctness'] = counts['nonmissing_correct'] / counts['nonmissing_fields'] if counts['nonmissing_fields'] else None
    counts['corrections_required'] = sum(r['scores'][engine]['corrections_required'] or 0 for r in results) if counts['supported_pages'] else None
    return counts


def evaluate(gold, predictions, catalog):
    if predictions['gold_sha256'] != digest(GOLD.read_bytes()):
        raise ValueError('Frozen gold changed after inference; evaluation invalidated')
    if predictions['config_sha256'] != digest(CONFIG.read_bytes()):
        raise ValueError('Frozen extraction configuration changed')
    if predictions['catalog_sha256'] != digest(json_bytes(catalog)):
        raise ValueError('Known-parser baseline changed; regenerate and review explicitly')
    by_id = {p['case_id']: p for p in predictions['results']}
    if set(by_id) != {c['case_id'] for c in gold['cases']} or len(by_id) != len(predictions['results']):
        raise ValueError('Evaluation must include each frozen case exactly once')
    pages = []
    for case in gold['cases']:
        prediction = by_id[case['case_id']]
        source = gold['sources'][case['source_id']]
        if prediction['source']['sha256'] != source['sha256'] or prediction['source']['pdf_page'] != case['pdf_page']:
            raise ValueError('Prediction source identity changed')
        model_values = {k: f.get('value') for k, f in prediction['fields'].items() if isinstance(f, dict)}
        pages.append({**prediction, 'scores': {'gemini': score(model_values, case['gold']),
                                             'deterministic': score(baseline(case, catalog), case['gold'])}})
    latencies = [p['latency_seconds'] for p in pages]
    metrics = {split: {engine: aggregate([p for p in pages if p['split'] == split], engine)
                       for engine in ('gemini', 'deterministic')}
               for split in ('known_layout', 'unfamiliar_layout')}
    totals = {engine: aggregate(pages, engine) for engine in ('gemini', 'deterministic')}
    local_checks = json.loads((ROOT / 'data/extraction/local-checks.json').read_text())
    return {
        'schema_version': 1, 'status': 'evaluated', 'evaluated_at': max(p['received_at'] for p in pages),
        'target': 'Extract eight source-grounded planning fields for the first project on a PDF page.',
        'decision': {'activity_forecast': 'unsupported', 'schedule_revision_forecast': 'unsupported',
            'shipped_ml_task': 'assisted_document_extraction', 'custom_model_trained': False,
            'reason': 'The supplied reports lack verified project-month activity labels and frozen linked schedule cohorts. Missing activity is not a negative label. Use explicit scenarios; evaluate extraction separately.'},
        'model': predictions['model'], 'model_versions': sorted({p['model_version'] for p in pages}),
        'gold_sha256': predictions['gold_sha256'], 'config_sha256': predictions['config_sha256'],
        'catalog_sha256': predictions['catalog_sha256'], 'selection_policy': gold['selection_policy'],
        'splits': metrics, 'totals': totals,
        'latency': {'meaning': 'Original end-to-end generateContent request seconds, excluding source download and PDF slicing; cached replay does not count as a new call.',
            'calls': len(pages), 'total_seconds': round(sum(latencies), 3),
            'median_seconds': round(statistics.median(latencies), 3), 'max_seconds': max(latencies),
            'baseline_seconds': None, 'baseline_note': 'Baseline uses previously generated known-report parser output; lookup time is not a fair parser/API latency comparison.'},
        'review_effort': {'human_seconds': None,
            'proxy': 'Field cells differing from visually checked gold; not a measurement of human time saved.',
            'model_corrections_required': totals['gemini']['corrections_required'],
            'field_cells_requiring_source_review': len(pages) * len(FIELDS),
            'validation_issue_count': sum(len(p['validation_issues']) for p in pages),
            'all_pages_require_review': True},
        'local_parser_measurements': local_checks,
        'metric_definitions': {
            'field_correctness': 'Exact structured value match after case, Unicode dash and whitespace normalization; milestones count as one field including all phases, values, precision and meaning.',
            'invented_values': 'Nonempty model field where the visually checked source field is absent; other wrong values appear in differences. This narrow counter is not a complete hallucination detector.',
            'date_meaning_errors': 'Wrong milestone meaning, or an actual-start/end value where no actual date is supplied.',
            'unsupported_layout': 'Existing deterministic parser abstains. These fields are not treated as correct nulls or included in its accuracy denominator.'},
        'limitations': [
            'Ten purposively selected pages, eight fields per first project; not all projects on each page and not an arbitrary-PDF ingestion benchmark.',
            'Six known-layout pages are a regression comparison, not an independent generalization test of a parser developed on the same reports.',
            'Four unfamiliar-layout pages share one public SERTP report. Unfamiliar means unsupported by the application parser; foundation-model training exposure is unknown.',
            'The Goshen work appears in both a Georgia known-layout page and a SERTP unfamiliar-layout page. Counts are extraction tasks, not independent jobs or an independent-project holdout.',
            'Gold was visually checked by Codex, not independently double-annotated by humans; null fields and nonmissing fields are reported separately.',
            'No prompt tuning or custom-model training on evaluation cases. One model run per page; this does not measure repeat-run variance.',
            'Grounded-looking evidence and correct JSON are not approval. No extracted record is automatically mapped or used for training.',
            'The adapter extracts public released fields only; costs, redacted material and precise infrastructure geometry are outside this benchmark.',
            'Live reruns need the same public source bytes and an authorized Gemini credential. Offline evaluation reproduces scores from committed structured predictions, not raw provider responses.'
        ], 'pages': pages,
        'provider_docs': ['https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite',
                          'https://ai.google.dev/gemini-api/docs/structured-output',
                          'https://ai.google.dev/gemini-api/docs/document-processing',
                          'https://ai.google.dev/api/generate-content']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['freeze', 'fetch-sources', 'run', 'evaluate'])
    parser.add_argument('--cache-dir', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--live', action='store_true', help='Allow bounded Gemini requests for uncached cases')
    parser.add_argument('--max-api-calls', type=int, default=10)
    parser.add_argument('--check', action='store_true', help='Compare report without writing')
    args = parser.parse_args()
    gold = json.loads(GOLD.read_text())
    if args.command == 'freeze':
        if CONFIG.exists() or PREDICTIONS.exists():
            raise ValueError('Already frozen; create a new benchmark version instead of tuning this one')
        save(CONFIG, config())
        print('Extraction config frozen:', digest(CONFIG.read_bytes()))
        return
    if args.command == 'evaluate':
        report = evaluate(gold, json.loads(PREDICTIONS.read_text()),
                          json.loads((ROOT / 'public/data/full_report_catalog.json').read_text()))
        if args.check:
            if not REPORT.exists() or json.loads(REPORT.read_text()) != report:
                raise ValueError('Evaluation report differs; regenerate intentionally')
        else:
            save(REPORT, report)
        print(json.dumps({'status': 'verified' if args.check else 'written', 'totals': report['totals'],
                          'latency': report['latency'], 'review_effort': report['review_effort']}, indent=2))
        return
    cache = cache_directory(args.cache_dir)
    if args.command == 'fetch-sources':
        for source in gold['sources'].values():
            load_source(source, cache, allow_download=True)
        print('All three public-source hashes verified')
        return
    if not 0 <= args.max_api_calls <= 20:
        raise ValueError('First-pass request budget must be between 0 and 20')
    if json.loads(CONFIG.read_text()) != config():
        raise ValueError('Adapter configuration differs from frozen benchmark')
    # Fail source availability/hash checks before spending the first inference call.
    paths = {key: load_source(source, cache) for key, source in gold['sources'].items()}
    calls, results = 0, []
    for case in gold['cases']:
        source = gold['sources'][case['source_id']]
        path = paths[case['source_id']]
        result = extract(case, source, path, cache, live=args.live and calls < args.max_api_calls)
        calls += int(not result['cache_hit'])
        results.append(result)
        print(json.dumps({'case': case['case_id'], 'cache_hit': result['cache_hit'],
                          'latency_seconds': result['latency_seconds'],
                          'validation_issues': len(result['validation_issues'])}), flush=True)
    catalog = json.loads((ROOT / 'public/data/full_report_catalog.json').read_text())
    save(PREDICTIONS, {'schema_version': 1, 'model': MODEL, 'gold_sha256': digest(GOLD.read_bytes()),
                      'config_sha256': digest(CONFIG.read_bytes()), 'catalog_sha256': digest(json_bytes(catalog)),
                      'results': results})
    print('Structured predictions saved; raw responses remain outside the checkout.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(f'Extraction stopped: {error}', file=sys.stderr)
        sys.exit(1)

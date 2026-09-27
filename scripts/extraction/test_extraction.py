"""Offline synthetic unit fixtures. These are not model benchmark observations."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from adapter import (ROOT, FIELDS, cache_directory, cache_key, config, digest, extract,
                     json_bytes, load_source, normalize, page_input, valid_date, validate_fields)
from benchmark import aggregate, same_value, score


def fields():
    result = {k: {'value': None, 'evidence_quote': None, 'missing_reason': 'Not supplied.'} for k in FIELDS}
    result['milestones']['value'] = []
    return result


class ExtractionTests(unittest.TestCase):
    def test_cache_invalidates_source_page_and_prompt(self):
        cfg = config()
        original = cache_key('document', 1, 'pagebytes', cfg)
        changed = copy.deepcopy(cfg)
        changed['prompt'] += ' changed'
        self.assertEqual(original, cache_key('document', 1, 'pagebytes', config()))
        self.assertNotEqual(original, cache_key('new-document', 1, 'pagebytes', cfg))
        self.assertNotEqual(original, cache_key('document', 2, 'pagebytes', cfg))
        self.assertNotEqual(original, cache_key('document', 1, 'new-pagebytes', cfg))
        self.assertNotEqual(original, cache_key('document', 1, 'pagebytes', changed))

    def test_raw_cache_rejects_repository_paths(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            cache_directory(ROOT / 'data/extraction/raw')

    def test_null_requires_reason_and_no_invented_evidence(self):
        data = fields()
        self.assertEqual(validate_fields(data, 'no project dates supplied'), [])
        data['actual_end']['missing_reason'] = None
        data['actual_start']['evidence_quote'] = 'not on page'
        issues = validate_fields(data, '')
        self.assertTrue(any('missing value requires' in x for x in issues))
        self.assertTrue(any('absent value must not' in x for x in issues))

    def test_values_need_source_evidence(self):
        data = fields()
        data['project_id'] = {'value': '123', 'evidence_quote': 'Teams # 123', 'missing_reason': None}
        self.assertEqual(validate_fields(data, 'Teams #\n123'), [])
        data['project_id']['evidence_quote'] = 'Teams # 999'
        self.assertTrue(any('not found' in x for x in validate_fields(data, 'Teams # 123')))

    def test_dates_precision_and_invalid_rollovers(self):
        self.assertTrue(valid_date('2024-02-29'))
        self.assertFalse(valid_date('2025-02-29'))
        self.assertTrue(valid_date('2028', 'year'))
        self.assertFalse(valid_date('2028-06-01', 'year'))
        self.assertTrue(valid_date('2028-06', 'month'))
        self.assertFalse(valid_date('2028-13', 'month'))

    def test_schema_rejects_extra_and_wrong_types(self):
        data = fields()
        data['unexpected'] = {'value': 'ignored?'}
        self.assertTrue(validate_fields(data, ''))
        data = fields()
        data['milestones']['value'] = '2028'
        self.assertTrue(any('bounded list' in x for x in validate_fields(data, '')))
        self.assertTrue(validate_fields([], ''))

    def test_score_does_not_reward_omitted_null_fields(self):
        gold = {key: value['value'] for key, value in fields().items()}
        omitted = score({}, gold)
        self.assertEqual(omitted['correct_fields'], 0)
        self.assertEqual(omitted['corrections_required'], 8)
        filled = dict(gold, actual_start='2025-01-01')
        wrong = score(filled, gold)
        self.assertEqual(wrong['invented_values'], 1)
        self.assertEqual(wrong['date_meaning_errors'], 1)

    def test_milestone_semantics_and_phase_errors_are_scored(self):
        gold = {key: value['value'] for key, value in fields().items()}
        gold['milestones'] = [{'value': '2028', 'precision': 'year', 'meaning': 'planned_in_service', 'phase': None}]
        extracted = copy.deepcopy(gold)
        extracted['milestones'][0]['meaning'] = 'need_date'
        scored = score(extracted, gold)
        self.assertEqual(scored['correct_fields'], 7)
        self.assertEqual(scored['date_meaning_errors'], 1)
        extracted['milestones'][0]['meaning'] = 'planned_in_service'
        extracted['milestones'][0]['value'] = '2028-01-01'
        self.assertEqual(score(extracted, gold)['correct_fields'], 7)

    def test_unsupported_is_abstention_not_perfect_null_accuracy(self):
        scored = score(None, {})
        summary = aggregate([{'scores': {'deterministic': scored}}], 'deterministic')
        self.assertEqual(summary['supported_pages'], 0)
        self.assertEqual(summary['fields_scored'], 0)
        self.assertIsNone(summary['field_correctness'])

    def test_normalization_preserves_fact_changes(self):
        self.assertTrue(same_value('A – B\n 115 kV', 'a - b 115 kv'))
        self.assertFalse(same_value('A - B 115 kV', 'A - B 230 kV'))
        self.assertFalse(same_value('2028', '2028-01-01'))

    def test_source_hash_and_page_bounds_gate_inference(self):
        source = {'file': 'public/sources/Dominion_2024-2028_Project_Descriptions.pdf', 'sha256': 'wrong'}
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, 'hash changed'):
                load_source(source, Path(temp))
        path = ROOT / source['file']
        with self.assertRaises(ValueError):
            page_input(path, 0)
        self.assertEqual(page_input(path, 2)[0], page_input(path, 2)[0])

    def test_cached_provider_result_never_becomes_map_or_training_eligible(self):
        page = b'fixture-pdf'
        cfg = config()
        key = cache_key('abc', 1, digest(page), cfg)
        raw = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps(fields())}]}}]}
        record = {'cache_key': key, 'config': cfg, 'response': raw,
                  'latency_seconds': 1.0, 'received_at': '2026-09-26T00:00:00Z'}
        with tempfile.TemporaryDirectory() as temp:
            cache = Path(temp)
            (cache / f'{key}.json').write_text(json.dumps(record))
            with mock.patch('adapter.page_input', return_value=(page, '')):
                with mock.patch('adapter.urllib.request.urlopen', side_effect=AssertionError('network forbidden')):
                    result = extract({'case_id': 'fixture', 'split': 'test', 'source_id': 'x', 'pdf_page': 1},
                                     {'sha256': 'abc', 'url': 'https://example.invalid', 'title': 'Fixture'}, Path('unused'), cache)
        self.assertTrue(result['cache_hit'])
        self.assertEqual(result['review_status'], 'review_required')
        self.assertFalse(result['map_eligible'])
        self.assertFalse(result['training_eligible'])


if __name__ == '__main__':
    unittest.main()

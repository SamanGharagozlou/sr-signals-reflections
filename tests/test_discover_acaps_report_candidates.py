"""Offline Phase 15H source provenance and fail-closed discovery tests."""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
import discover_acaps_report_candidates as m

NOW = datetime(2026, 11, 7, tzinfo=timezone.utc)


def candidate(**overrides):
    fields = {
        'title': 'ACAPS Ukraine humanitarian access update',
        'status': 'published',
        'source': [{'name': 'ACAPS'}],
        'country': [{'iso3': 'UKR', 'name': 'Ukraine'}],
        'date': {'original': '2026-10-15T10:00:00+00:00', 'created': '2026-10-16T10:00:00+00:00'},
        'url_alias': 'https://reliefweb.int/report/ukraine/synthetic-test-report',
        'origin': 'https://www.acaps.org/en/countries/ukraine',
    }
    fields.update(overrides)
    return {'id': 12345, 'fields': fields}


def payload(*rows):
    return {'data': list(rows), 'totalCount': len(rows)}


class SourceDiscoveryTests(unittest.TestCase):
    def test_query_has_three_explicit_filters(self):
        q = m.request_body('UKR', 7)
        self.assertEqual(q['limit'], 7)
        self.assertEqual(q['sort'], ['date.created:desc'])
        self.assertEqual(q['filter']['operator'], 'AND')
        self.assertEqual({x['field']: x['value'] for x in q['filter']['conditions']},
                         {'country.iso3': 'UKR', 'source.name': 'ACAPS', 'status': 'published'})

    def test_reject_invalid_countries_and_limits(self):
        with self.assertRaises(ValueError): m.request_body('USA', 10)
        with self.assertRaises(ValueError): m.request_body('UKR', 100)

    def test_valid_report_candidate_not_approved(self):
        r = m.clean_response(payload(candidate()), 'ukraine', NOW.date())
        self.assertEqual(len(r['candidates']), 1)
        c = r['candidates'][0]
        self.assertEqual(c['source_published_on'], '2026-10-15')
        self.assertEqual(c['review_status'], 'REQUIRES_HUMAN_SOURCE_VERIFICATION')
        self.assertFalse('approved' in c)

    def test_reject_unpublished(self):
        self.assertEqual(m.clean_response(payload(candidate(status='to-review')), 'ukraine', NOW.date())['rejected_count'], 1)

    def test_reject_unmatched_acaps_label(self):
        self.assertEqual(m.clean_response(payload(candidate(source=[{'name':'Other NGO'}])), 'ukraine', NOW.date())['rejected_count'], 1)

    def test_reject_wrong_country(self):
        self.assertEqual(m.clean_response(payload(candidate(country=[{'iso3':'SDN'}])), 'ukraine', NOW.date())['rejected_count'], 1)

    def test_reject_bad_url(self):
        for url in ['http://reliefweb.int/report/bad', 'https://evil.com/report/abc', 'https://reliefweb.int.evil.com/x', 'https://reliefweb.int@evil.com/x']:
            with self.subTest(url=url):
                self.assertEqual(m.clean_response(payload(candidate(url_alias=url)), 'ukraine', NOW.date())['rejected_count'], 1)

    def test_source_origin_must_be_acaps(self):
        r = m.clean_response(payload(candidate(origin='https://evil.com/report/fake')), 'ukraine', NOW.date())
        self.assertIsNone(r['candidates'][0]['original_acaps_url'])

    def test_missing_source_date_not_invented(self):
        r = m.clean_response(payload(candidate(date={'created':'2026-10-16T10:00:00+00:00'})), 'ukraine', NOW.date())
        self.assertIsNone(r['candidates'][0]['source_published_on'])
        self.assertEqual(r['candidates'][0]['publication_date_label'], 'source_date_unavailable')

    def test_future_dated_report_rejected(self):
        r = m.clean_response(payload(candidate(date={'original':'2027-01-01','created':'2026-10-16'})), 'ukraine', NOW.date())
        self.assertEqual(r['rejected_count'], 1)

    def test_deduplicate_and_sort(self):
        x = candidate()
        second = candidate(date={'original':'2026-11-01', 'created':'2026-11-02'})
        second['id'] = 12346
        r = m.clean_response(payload(x, x, second), 'ukraine', NOW.date())
        self.assertEqual([e['reliefweb_id'] for e in r['candidates']], ['12346','12345'])

    def test_fail_closed_on_partial_country_response(self):
        with self.assertRaises(ValueError):
            m.discover(['ukraine', 'chad'], {'ukraine':payload(candidate())}, 10, NOW)

    def test_never_publish(self):
        r = m.discover(['ukraine'], {'ukraine':payload(candidate())}, 10, NOW)
        self.assertFalse(r['can_auto_publish'])
        self.assertIn('NOT APPROVED', r['purpose'])

    def test_save_never_overwrites(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)/'review.json'
            r = {'can_auto_publish':False}
            m.save_if_new(target, r)
            with self.assertRaises(ValueError): m.save_if_new(target, {'can_auto_publish':True})
            self.assertEqual(json.loads(target.read_text()), r)

    def test_bad_appname_rejected_before_curl(self):
        with self.assertRaises(ValueError):
            m.call_api('/usr/bin/curl', 'a', m.request_body('UKR',10), 15)


if __name__ == '__main__':
    unittest.main()

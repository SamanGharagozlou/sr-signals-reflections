"""Deterministic offline tests for the Phase 15G audit utility."""
import importlib.util
from datetime import date
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'audit_acaps_reports.py'
SPEC = importlib.util.spec_from_file_location('audit_acaps_reports', SCRIPT)
assert SPEC and SPEC.loader
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

FIXTURE = '''export const VERIFIED_REPORTS: Readonly<Record<string, VerifiedReport>> = Object.freeze({
  chad: {
    crisisId: "chad", title: "Chad: Impact of floods", publishedOn: "2024-10-31", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/archives/detail/chad-impact-of-floods", subject: "Historical floods",
  },
  ukraine: {
    crisisId: "ukraine", title: "Ukraine access update", publishedOn: "2026-10-15", verifiedOn: "2026-11-07", sourceName: "ACAPS",
    sourceUrl: "https://www.acaps.org/en/countries/ukraine", subject: "Access",
  },
});'''


class AuditTests(unittest.TestCase):
    def test_parse_manifest(self):
        rows=mod.extract_reports(FIXTURE)
        self.assertEqual([r['crisisId'] for r in rows], ['chad','ukraine'])

    def test_reject_changed_manifest(self):
        with self.assertRaises(ValueError): mod.extract_reports('export const VERIFIED_REPORTS = {}')

    def test_reject_missing_field(self):
        with self.assertRaises(ValueError): mod.extract_reports(FIXTURE.replace('sourceName: "ACAPS",', '', 1))

    def test_valid_metadata(self):
        row=mod.extract_reports(FIXTURE)[0]
        check=mod.validate_record(row,date(2026,11,7),30)
        self.assertEqual(check['metadata_status'],'current_review')

    def test_review_due(self):
        row=mod.extract_reports(FIXTURE)[0]
        check=mod.validate_record(row,date(2027,1,1),30)
        self.assertEqual(check['metadata_status'],'review_due')

    def test_future_verification_rejected(self):
        row=mod.extract_reports(FIXTURE)[0]
        row['verifiedOn']='2090-01-01'
        self.assertEqual(mod.validate_record(row,date(2026,11,7),30)['metadata_status'],'invalid')

    def test_untrusted_host_rejected(self):
        row=mod.extract_reports(FIXTURE)[0]
        row['sourceUrl']='https://www.acaps.org.attacker.example/en/evil'
        self.assertEqual(mod.validate_record(row,date(2026,11,7),30)['metadata_status'],'invalid')

    def test_country_page_not_a_permalink(self):
        row=mod.extract_reports(FIXTURE)[1]
        self.assertTrue(mod.validate_record(row,date(2026,11,7),30)['country_page_only'])

    def test_live_network_failure_not_success(self):
        from subprocess import CompletedProcess
        with patch.object(mod.subprocess,'run',return_value=CompletedProcess(['curl'], 60, '000\nhttps://www.acaps.org/en/a','SSL error')):
            self.assertEqual(mod.live_check('https://www.acaps.org/en/a','curl',2)['status'],'network_error')

    def test_live_external_redirect_blocked(self):
        from subprocess import CompletedProcess
        with patch.object(mod.subprocess,'run',return_value=CompletedProcess(['curl'], 0, '200\nhttps://not-acaps.org/page','')):
            self.assertEqual(mod.live_check('https://www.acaps.org/en/a','curl',2)['status'],'redirect_outside_allowlist')

    def test_offline_audit_does_not_fetch(self):
        with tempfile.TemporaryDirectory() as tmp:
            file=Path(tmp)/'index.ts'
            file.write_text(FIXTURE)
            with patch.object(mod, 'live_check', side_effect=AssertionError('network must not be used')):
                report=mod.make_report(file,date(2026,11,7),30,False,'curl',2)
            self.assertEqual(report['totals']['entries'],2)
            self.assertEqual(report['totals']['invalid'],0)


if __name__=='__main__': unittest.main()

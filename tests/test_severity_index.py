"""No invented INFORM Severity scores or automatic geographic matching."""
import json
import math
import tempfile
import unittest
from pathlib import Path
from severity_index import severity_for_risk


class SeverityIndexTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "severity.json"
        self.base = {
            "release": "2026-09",
            "source_url": "https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data",
            "records": [],
        }

    def write(self, record=None):
        self.base["records"] = [record] if record else []
        self.path.write_text(json.dumps(self.base), encoding="utf-8")

    def match(self, **changes):
        value = {
            "acaps_risk_id": "R1043", "country": "Chad", "crisis_id": "TEST-EXAMPLE-NOT-REAL",
            "crisis_name": "Test crisis (not an official datum)", "match_note": "TEST ONLY: verified by a reviewer",
            "score": 5.4, "level": "Medium", "dimensions": {"impact": 4.2, "conditions": 5.1, "complexity": None},
        }
        value.update(changes)
        return value

    def test_absent_manifest_is_not_available(self):
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_empty_manifest_is_not_available(self):
        self.write()
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_verified_exact_risk_match(self):
        self.write(self.match())
        result = severity_for_risk("R1043", "Chad", self.path)
        self.assertTrue(result["available"])
        self.assertEqual(result["score"], 5.4)
        self.assertIsNone(result["dimensions"]["complexity"])
        self.assertEqual(result["crisis_id"], "TEST-EXAMPLE-NOT-REAL")

    def test_no_country_based_lookup(self):
        self.write(self.match(acaps_risk_id="R9999"))
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_reject_country_mismatch(self):
        self.write(self.match(country="Sudan"))
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_reject_older_score_scale(self):
        self.base["release"] = "2026-01"
        self.write(self.match())
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_reject_invalid_score_and_nan(self):
        for val in [12, -1, float("nan"), True, "5.4"]:
            with self.subTest(score=repr(val)):
                self.write(self.match(score=val))
                self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_reject_untrusted_metadata(self):
        self.base["source_url"] = "https://not-official.example/data"
        self.write(self.match())
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_reject_ambiguous_matching(self):
        self.base["records"] = [self.match(), self.match(crisis_id="OTHER")]
        self.path.write_text(json.dumps(self.base))
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

    def test_bad_json_is_not_available(self):
        self.path.write_text("{not json")
        self.assertFalse(severity_for_risk("R1043", "Chad", self.path)["available"])

if __name__ == "__main__":
    unittest.main()

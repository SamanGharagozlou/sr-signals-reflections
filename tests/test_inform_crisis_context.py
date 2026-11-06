import json
import tempfile
import unittest
from pathlib import Path
from inform_crisis_context import crises_for_country

SRC = "https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity/Results-and-data"
ROW = {"crisis_id":"TCD005", "crisis_name":"Displacement from Sudan to Chad", "country":"Chad",
       "score":7.1,"level":"High","trend":"Increasing","reliability":"Very High","last_updated":"2026-09-30",
       "dimensions":{"impact":6.5301,"conditions":7.5748,"complexity":6.6605},
       "geographic_scope":"Subnational","subnational_areas":["Wadi Fira","Ouaddaï"],"source_row":88}

class CrisisContextTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "crises.json"
        self.write([ROW])
    def tearDown(self): self.tmp.cleanup()
    def write(self, crises, **updates):
        data = {"dataset":"INFORM Severity Index", "release":"2026-09", "release_date":"2026-09-30",
                "source_url":SRC,"crises":crises}
        data.update(updates)
        self.path.write_text(json.dumps(data), encoding="utf-8")
    def test_official_chad_crisis(self):
        d=crises_for_country("Chad",self.path)
        self.assertTrue(d["available"])
        self.assertEqual(d["crises"][0]["score"],7.1)
        self.assertIn("not a verified match", d["note"])
        self.assertNotIn("risk_id", str(d))
    def test_country_not_selected_by_risk_id(self):
        d=crises_for_country("Sudan",self.path)
        self.assertTrue(d["available"]);self.assertEqual(d["crises"],[])
    def test_no_file(self):
        self.assertFalse(crises_for_country("Chad", self.path.with_name("missing.json"))["available"])
    def test_bad_file(self):
        self.path.write_text("not-json")
        self.assertFalse(crises_for_country("Chad",self.path)["available"])
    def test_wrong_release(self):
        self.write([ROW],release="2025-09")
        self.assertFalse(crises_for_country("Chad",self.path)["available"])
    def test_source_host_must_be_official(self):
        self.write([ROW],source_url="https://evil.test/fake")
        self.assertFalse(crises_for_country("Chad",self.path)["available"])
    def test_bad_score_skipped(self):
        self.write([{**ROW,"score":101}])
        self.assertEqual(crises_for_country("Chad",self.path)["crises"],[])
    def test_bad_component_skipped(self):
        self.write([{**ROW,"dimensions":{**ROW["dimensions"],"impact":-1}}])
        self.assertEqual(crises_for_country("Chad",self.path)["crises"],[])
    def test_bad_id_skipped(self):
        self.write([{**ROW,"crisis_id":"R1043"}])
        self.assertEqual(crises_for_country("Chad",self.path)["crises"],[])
    def test_country_case(self):
        self.assertEqual(len(crises_for_country("chad",self.path)["crises"]),1)

if __name__ == "__main__": unittest.main()

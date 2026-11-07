"""Phase 10A: deterministic review prompts and moderator-only triage."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from evidence_quality import evaluate_records, decorate_review_state
import app as signal


def source_row(**updates):
    row = {
        "Risk ID": "R2000", "Risk Title": "Example humanitarian event", "Country": "Exampleland",
        "Status": "Active", "Risk Level": "High", "Probability": "High", "Impact": "4",
        "Triggers": "Observed change in market prices", "Source": "Source reference",
    }
    row.update(updates)
    return row


class PureQualityTests(unittest.TestCase):
    def test_complete_record_generates_no_alerts(self):
        q = evaluate_records([source_row()], "official organizer-provided CSV")
        self.assertEqual(q["items"], [])

    def test_active_missing_fields_only_prompts_not_inferences(self):
        q = evaluate_records([source_row(**{"Probability": "", "Triggers": ""})], "official organizer-provided CSV")
        item = q["items"][0]
        self.assertEqual([f["code"] for f in item["flags"]], ["probability", "triggers"])
        self.assertEqual(item["priority"], "review-first")
        self.assertIn("not", q["methodology"].lower())

    def test_resolved_record_does_not_assume_probability_required(self):
        q = evaluate_records([source_row(**{"Status": "Materialised", "Probability": ""})], "official organizer-provided CSV")
        self.assertEqual(q["items"], [])

    def test_missing_source_column_not_asserted_as_missing_evidence(self):
        r = source_row()
        del r["Source"]
        q = evaluate_records([r], "official organizer-provided CSV")
        self.assertEqual(q["items"], [])

    def test_fallback_is_not_official_evidence_queue(self):
        q = evaluate_records([source_row()], "built-in R1043 fallback")
        self.assertFalse(q["available"])
        self.assertEqual(q["items"], [])

    def test_source_change_reopens_tried_flag(self):
        old = evaluate_records([source_row(**{"Impact": ""})], "official organizer-provided CSV")
        flag = old["items"][0]["flags"][0]
        changed = evaluate_records([source_row(**{"Impact": None})], "official organizer-provided CSV")
        state = {("R2000", "impact"): {"fingerprint": flag["fingerprint"], "disposition": "triaged", "updated_at": "2026-11-07"}}
        self.assertEqual(decorate_review_state(old, state)["summary"]["triaged_flags"], 1)
        self.assertEqual(decorate_review_state(changed, state)["summary"]["open_flags"], 1)

    def test_stable_sort_and_scoped_flags(self):
        records=[source_row(**{"Risk ID":"R2001", "Country":"Zimbabwe", "Risk Level":""}),
                 source_row(**{"Risk ID":"R2000", "Country":"Algeria", "Impact":""})]
        q=evaluate_records(records, "official organizer-provided CSV")
        self.assertEqual([r["risk_id"] for r in q["items"]], ["R2000","R2001"])


class HttpTriageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_patcher = patch.object(signal, "DB_PATH", Path(self.tmp.name) / "test.db")
        self.db_patcher.start()
        self.addCleanup(self.db_patcher.stop)
        signal.initialize()
        self.fake_rows = [source_row(**{"Probability": ""})]
        self.records_patcher = patch.object(signal, "get_risks", return_value=(self.fake_rows,"official organizer-provided CSV"))
        self.records_patcher.start()
        self.addCleanup(self.records_patcher.stop)
        self.client = TestClient(signal.app)
        response = self.client.post("/api/login", json={"code": "ACAPS-DEMO"})
        self.assertEqual(response.status_code, 200, response.text)
        self.auth = {"Authorization": f"Bearer {response.json()['token']}"}

    def test_moderator_only(self):
        self.assertEqual(self.client.get("/api/moderator/evidence-queue").status_code, 401)
        token = self.client.post("/api/login", json={"code": "FIELD-05"}).json()["token"]
        self.assertEqual(self.client.get("/api/moderator/evidence-queue", headers={"Authorization":f"Bearer {token}"}).status_code, 403)

    def test_expert_cannot_triage(self):
        q = self.client.get("/api/moderator/evidence-queue", headers=self.auth).json()
        flag = q["items"][0]["flags"][0]
        token = self.client.post("/api/login", json={"code": "FIELD-05"}).json()["token"]
        payload={"risk_id": "R2000", "rule_code": flag["code"], "fingerprint": flag["fingerprint"], "disposition": "triaged"}
        self.assertEqual(self.client.post("/api/moderator/evidence-queue/triage", json=payload,
            headers={"Authorization": f"Bearer {token}"}).status_code, 403)

    def test_triage_and_reopen_is_persisted_without_mutating_risk(self):
        q = self.client.get("/api/moderator/evidence-queue", headers=self.auth)
        self.assertEqual(q.status_code, 200, q.text)
        flag = q.json()["items"][0]["flags"][0]
        payload = {"risk_id":"R2000", "rule_code":flag["code"], "fingerprint":flag["fingerprint"], "disposition":"triaged"}
        self.assertEqual(self.client.post("/api/moderator/evidence-queue/triage", json=payload, headers=self.auth).status_code, 200)
        q = self.client.get("/api/moderator/evidence-queue", headers=self.auth).json()
        self.assertEqual(q["summary"]["triaged_flags"], 1)
        self.assertEqual(self.fake_rows[0]["Probability"], "")
        payload["disposition"]="open"
        self.assertEqual(self.client.post("/api/moderator/evidence-queue/triage", json=payload, headers=self.auth).status_code, 200)
        self.assertEqual(self.client.get("/api/moderator/evidence-queue", headers=self.auth).json()["summary"]["open_flags"], 1)
        with signal.db() as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM evidence_triage_events").fetchone()[0], 2)

    def test_rejects_stale_fingerprint_and_unmatched_flag(self):
        q = self.client.get("/api/moderator/evidence-queue",headers=self.auth).json()
        flag = q["items"][0]["flags"][0]
        bad = {"risk_id":"R2000","rule_code":flag["code"],"fingerprint":"0"*24,"disposition":"triaged"}
        self.assertEqual(self.client.post("/api/moderator/evidence-queue/triage",json=bad,headers=self.auth).status_code,409)
        self.assertEqual(self.client.post("/api/moderator/evidence-queue/triage",json={**bad,"rule_code":"other"},headers=self.auth).status_code,409)


if __name__ == "__main__":
    unittest.main()

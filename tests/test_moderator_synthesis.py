"""Guardrails and workflow for optional moderator-reviewed follow-up questions."""
import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from moderator_synthesis import build_moderator_synthesis


class PureSynthesisTests(unittest.TestCase):
    def test_full_panel_recurring_theme_yields_deterministic_question(self):
        group = {
            "ready": True,
            "count": 5,
            "agreement": {"underestimated": 1, "about_right": 3, "overestimated": 1},
            "theme_counts": {"Humanitarian access": 2, "Displacement": 1},
            "median": 70,
            "private_note": "UNIQUE PRIVATE NOTE AND EXPERT ID SHOULD NEVER ESCAPE",
        }
        result = build_moderator_synthesis(group, feedback_released=True)
        self.assertTrue(result["available"])
        self.assertEqual(result["proposed"]["id"], "humanitarian_access")
        self.assertIn("publicly shareable", result["proposed"]["question"])
        self.assertNotIn("UNIQUE PRIVATE NOTE", json.dumps(result))
        self.assertNotIn("theme_counts", result)
        self.assertNotIn("median", result)

    def test_non_recurring_themes_fall_back_to_general_question(self):
        group = {"ready": True, "count": 5,
                 "agreement": {"underestimated": 0, "about_right": 5, "overestimated": 0},
                 "theme_counts": {"Displacement": 1, "Food security": 1}}
        result = build_moderator_synthesis(group, feedback_released=True)
        self.assertEqual(result["proposed"]["id"], "general")
        self.assertIn("No recurring theme", result["evidence_status"])
        self.assertIn("similar", result["disagreement_summary"])

    def test_no_proposal_before_full_panel_and_feedback(self):
        group = {"ready": False, "count": 4, "agreement": {}, "theme_counts": {}}
        self.assertFalse(build_moderator_synthesis(group, True)["available"])
        group["ready"] = True
        self.assertFalse(build_moderator_synthesis(group, False)["available"])


class ModeratorSynthesisApiTests(unittest.TestCase):
    def setUp(self):
        import app
        self.app = app
        self.directory = tempfile.TemporaryDirectory()
        self.previous_db = app.DB_PATH
        self.app.DB_PATH = Path(self.directory.name) / "state.db"
        app.initialize()
        self.client = TestClient(app.app)
        self.client.__enter__()
        self.moderator = self._login("ACAPS-DEMO")
        self.expert = self._login("FIELD-05")

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.DB_PATH = self.previous_db
        self.directory.cleanup()

    def _login(self, code):
        token = self.client.post("/api/login", json={"code": code}).json()["token"]
        return {"Authorization": f"Bearer {token}"}

    def _fill_and_release(self):
        resp = self.client.post("/api/expert/submit", headers=self.expert,
                                json={"agreement": "underestimated", "probability": 75,
                                      "confidence": "high", "note": "Synthetic access report only.",
                                      "anonymity": "anonymous"})
        self.assertEqual(resp.status_code, 200)
        response = self.client.post("/api/moderator/release", headers=self.moderator)
        self.assertEqual(response.status_code, 200)

    def test_requires_moderator_and_returns_no_identifiable_notes(self):
        self._fill_and_release()
        self.assertEqual(self.client.get("/api/moderator/synthesis").status_code, 401)
        self.assertEqual(self.client.get("/api/moderator/synthesis", headers=self.expert).status_code, 403)
        self.assertEqual(self.client.post("/api/moderator/follow-up/approve",
                                          json={"question_id": "general"}, headers=self.expert).status_code, 403)
        payload = self.client.get("/api/moderator/synthesis", headers=self.moderator).json()
        self.assertTrue(payload["available"])
        self.assertNotIn("Synthetic access report only.", json.dumps(payload))
        self.assertNotIn("expert-05", json.dumps(payload))

    def test_cannot_approve_before_release(self):
        before = self.client.get("/api/moderator/synthesis", headers=self.moderator).json()
        self.assertFalse(before["available"])
        res = self.client.post("/api/moderator/follow-up/approve", headers=self.moderator,
                               json={"question_id": "general"})
        self.assertEqual(res.status_code, 409)
        self.assertFalse(self.client.get("/api/public-summary").json()["available"])

    def test_only_current_curated_question_can_be_approved_once(self):
        self._fill_and_release()
        proposal = self.client.get("/api/moderator/synthesis", headers=self.moderator).json()["proposed"]
        wrong = self.client.post("/api/moderator/follow-up/approve", headers=self.moderator,
                                 json={"question_id": "invalid-custom-question"})
        self.assertEqual(wrong.status_code, 400)
        first = self.client.post("/api/moderator/follow-up/approve", headers=self.moderator,
                                 json={"question_id": proposal["id"]})
        self.assertEqual(first.status_code, 200)
        self.assertFalse(first.json()["sent"])
        self.assertIn("not sent", first.json()["followup"]["status"].lower())
        self.assertEqual(self.client.post("/api/moderator/follow-up/approve", headers=self.moderator,
                                          json={"question_id": proposal["id"]}).status_code, 409)
        stored = self.client.get("/api/moderator/synthesis", headers=self.moderator).json()["approved"]
        self.assertEqual(stored["question"], proposal["question"])

    def test_followup_is_not_public_and_reset_clears_it(self):
        self._fill_and_release()
        proposal = self.client.get("/api/moderator/synthesis", headers=self.moderator).json()["proposed"]
        self.client.post("/api/moderator/follow-up/approve", headers=self.moderator,
                         json={"question_id": proposal["id"]})
        self.client.post("/api/moderator/publish", headers=self.moderator)
        summary = self.client.get("/api/public-summary").json()
        self.assertTrue(summary["available"])
        self.assertNotIn("followup", json.dumps(summary).lower())
        self.assertNotIn(proposal["question"], json.dumps(summary))
        self.assertEqual(summary, self.client.get("/api/public-summary").json())
        self.assertEqual(self.client.post("/api/demo/reset", headers=self.moderator).status_code, 200)
        new_mod = self._login("ACAPS-DEMO")
        with self.app.db() as conn:
            self.assertEqual(self.app.config(conn, "moderator_followup"), "")
        self.assertFalse(self.client.get("/api/moderator/synthesis", headers=new_mod).json()["available"])
        self.assertFalse(self.client.get("/api/public-summary").json()["available"])


if __name__ == "__main__":
    unittest.main()

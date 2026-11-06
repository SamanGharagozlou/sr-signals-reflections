"""Synthetic Delphi reflection card: moderator gating, privacy, and persistence."""
import json
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient


class ReflectionApiTests(unittest.TestCase):
    def setUp(self):
        import app
        self.app = app
        self.directory = tempfile.TemporaryDirectory()
        self.original_db = app.DB_PATH
        app.DB_PATH = Path(self.directory.name) / "test.db"
        app.initialize()
        self.client = TestClient(app.app)
        self.client.__enter__()
        self.moderator = self.login("ACAPS-DEMO")
        self.expert = self.login("FIELD-05")

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.DB_PATH = self.original_db
        self.directory.cleanup()

    def login(self, code):
        response = self.client.post("/api/login", json={"code": code})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": "Bearer " + response.json()["token"]}

    def finish_round(self):
        body = {"agreement": "underestimated", "probability": 75,
                "confidence": "high", "anonymity": "anonymous", "note": "Test only: access pressure."}
        self.assertEqual(self.client.post("/api/expert/submit", json=body, headers=self.expert).status_code, 200)
        self.assertEqual(self.client.post("/api/moderator/release", headers=self.moderator).status_code, 200)

    def test_only_moderator_can_approve_and_not_before_release(self):
        path = "/api/moderator/counterpoint/approve"
        self.assertEqual(self.client.get("/api/moderator/counterpoint").status_code, 401)
        self.assertEqual(self.client.get("/api/moderator/counterpoint", headers=self.expert).status_code, 403)
        self.assertEqual(self.client.post(path, json={"prompt_id":"attribution"}, headers=self.expert).status_code, 403)
        self.assertEqual(self.client.post(path, json={"prompt_id":"attribution"}, headers=self.moderator).status_code, 409)
        state = self.client.get("/api/moderator/counterpoint", headers=self.moderator).json()
        self.assertFalse(state["available"])
        self.assertIsNone(state["approved_id"])

    def test_card_is_never_visible_before_approval_and_not_public(self):
        self.finish_round()
        fb = self.client.get("/api/expert/feedback", headers=self.expert).json()
        self.assertTrue(fb["available"])
        self.assertIsNone(fb["counterpoint"])
        path = "/api/moderator/counterpoint/approve"
        wrong = self.client.post(path, json={"prompt_id": "user-supplied-text"}, headers=self.moderator)
        self.assertEqual(wrong.status_code, 422)
        approved = self.client.post(path, json={"prompt_id": "attribution"}, headers=self.moderator)
        self.assertEqual(approved.status_code, 200)
        self.assertFalse(approved.json()["sent"])
        self.assertEqual(self.client.post(path, json={"prompt_id": "documentation"}, headers=self.moderator).status_code, 409)
        fb = self.client.get("/api/expert/feedback", headers=self.expert).json()
        self.assertEqual(fb["counterpoint"]["id"], "attribution")
        self.assertIn("not a claim", fb["counterpoint"]["notice"])
        self.assertNotIn("Test only: access pressure", json.dumps(fb))
        self.assertNotIn("expert-05", json.dumps(fb))
        self.assertNotIn("counterpoint", json.dumps(self.client.get("/api/consultation").json()))
        self.assertNotIn("counterpoint", json.dumps(self.client.get("/api/public-summary").json()))
        self.assertEqual(self.client.get("/api/expert/feedback").status_code, 401)

    def test_reset_clears_approval_and_unreleased_feedback(self):
        self.finish_round()
        self.assertEqual(self.client.post("/api/moderator/counterpoint/approve",
            json={"prompt_id": "documentation"}, headers=self.moderator).status_code, 200)
        self.assertEqual(self.client.post("/api/demo/reset", headers=self.moderator).status_code, 200)
        new_mod = self.login("ACAPS-DEMO")
        new_exp = self.login("FIELD-01")
        self.assertIsNone(self.client.get("/api/moderator/counterpoint", headers=new_mod).json()["approved_id"])
        feedback = self.client.get("/api/expert/feedback", headers=new_exp).json()
        self.assertFalse(feedback["available"])
        self.assertNotIn("counterpoint", json.dumps(feedback))

    def test_approval_does_not_mutate_frozen_public_snapshot(self):
        self.finish_round()
        self.assertEqual(self.client.post("/api/moderator/publish", headers=self.moderator).status_code, 200)
        snapshot = self.client.get("/api/public-summary").json()
        self.assertEqual(self.client.post("/api/moderator/counterpoint/approve",
            json={"prompt_id": "documentation"}, headers=self.moderator).status_code, 200)
        self.assertEqual(snapshot, self.client.get("/api/public-summary").json())


if __name__ == "__main__":
    unittest.main()

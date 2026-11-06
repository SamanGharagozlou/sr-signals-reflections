"""Final-round publication, role gates, and immutable synthetic Delphi snapshots."""
import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class ForecastPublicationTests(unittest.TestCase):
    def setUp(self):
        import app
        self.backend = app
        self.tmp = tempfile.TemporaryDirectory()
        self.old_db = app.DB_PATH
        app.DB_PATH = Path(self.tmp.name) / "test.sqlite3"
        app.initialize()
        self.client = TestClient(app.app)
        self.client.__enter__()
        self.moderator = self.login("ACAPS-DEMO")
        self.expert5 = self.login("FIELD-05")

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.backend.DB_PATH = self.old_db
        self.tmp.cleanup()

    def login(self, code):
        response = self.client.post("/api/login", json={"code": code})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": "Bearer " + response.json()["token"]}

    def complete_panel(self):
        contribution = {
            "agreement": "underestimated", "probability": 75, "confidence": "medium",
            "anonymity": "anonymous", "note": "Synthetic only",
        }
        response = self.client.post("/api/expert/submit", json=contribution, headers=self.expert5)
        self.assertEqual(response.status_code, 200)

    def release(self):
        response = self.client.post("/api/moderator/release", headers=self.moderator)
        self.assertEqual(response.status_code, 200)

    def publish(self):
        return self.client.post("/api/moderator/publish", headers=self.moderator)

    def test_not_public_until_release_and_approval(self):
        self.assertFalse(self.client.get("/api/public-summary").json()["available"])
        self.assertEqual(self.publish().status_code, 409)
        self.complete_panel()
        self.assertEqual(self.publish().status_code, 409)
        self.release()
        self.assertFalse(self.client.get("/api/public-summary").json()["available"])
        self.assertEqual(self.client.post("/api/moderator/publish", headers=self.expert5).status_code, 403)
        self.assertEqual(self.client.post("/api/moderator/publish").status_code, 401)

    def test_initial_round_published_without_revisions(self):
        self.complete_panel()
        self.release()
        self.assertEqual(self.publish().status_code, 200)
        public = self.client.get("/api/public-summary").json()
        self.assertEqual(public["forecast_round"], "initial_panel")
        self.assertEqual(public["forecast_median_band"], "60–79%")
        self.assertEqual(public["panel_size"], 5)
        self.assertNotIn("round_two_count", public)
        self.assertNotIn("expert-05", json.dumps(public))
        self.assertNotIn("Synthetic only", json.dumps(public))

    def test_revised_complete_panel_median_not_original_or_revisers_only(self):
        self.complete_panel()
        self.release()
        # First-round values: 70, 85, 60, 45, 75 -> median 70.
        # Revised complete panel: 10, 85, 10, 45, 75 -> median 45.
        # Revise only two members; the other three carry their initial values.
        for code in ("FIELD-01", "FIELD-03"):
            expert = self.login(code)
            revised = self.client.post("/api/expert/revise", json={"probability": 10}, headers=expert)
            self.assertEqual(revised.status_code, 200)
        dashboard = self.client.get("/api/moderator/dashboard", headers=self.moderator).json()
        self.assertEqual(dashboard["group"]["median"], 70)
        self.assertEqual(dashboard["group"]["round_two_median"], 45)
        self.assertEqual(dashboard["group"]["round_two_count"], 2)
        self.assertEqual(self.publish().status_code, 200)
        public = self.client.get("/api/public-summary").json()
        self.assertEqual(public["forecast_round"], "revised_panel")
        self.assertEqual(public["forecast_median_band"], "40–59%")
        self.assertNotIn("round_two_count", public)
        self.assertNotIn("revision", json.dumps(public).lower())

    def test_publication_freezes_revisions_and_snapshot(self):
        self.complete_panel()
        self.release()
        self.assertEqual(self.publish().status_code, 200)
        before = self.client.get("/api/public-summary").json()
        self.assertEqual(self.client.post("/api/expert/revise", json={"probability": 0}, headers=self.expert5).status_code, 409)
        self.assertEqual(self.publish().status_code, 409)
        self.assertEqual(self.client.get("/api/public-summary").json(), before)
        self.assertEqual(self.client.get("/api/public-summary").content, self.client.get("/api/public-summary").content)

    def test_reset_reopens_demo_and_clears_old_snapshot(self):
        self.complete_panel()
        self.release()
        self.assertEqual(self.publish().status_code, 200)
        self.assertEqual(self.client.post("/api/demo/reset", headers=self.moderator).status_code, 200)
        self.assertFalse(self.client.get("/api/public-summary").json()["available"])
        moderator = self.login("ACAPS-DEMO")
        dashboard = self.client.get("/api/moderator/dashboard", headers=moderator).json()
        self.assertFalse(dashboard["public_approved"])
        self.assertEqual(dashboard["group"]["count"], 4)


if __name__ == "__main__":
    unittest.main()

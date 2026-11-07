"""Phase 10C: backend role isolation and no unauthorised expert information leakage."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as signal


class SituationRoomTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_patch = patch.object(signal, "DB_PATH", Path(self.tmp.name) / "situation.db")
        self.db_patch.start()
        self.addCleanup(self.db_patch.stop)
        signal.initialize()
        self.client = TestClient(signal.app)
        self.mod = self.login("ACAPS-DEMO")
        self.expert = self.login("FIELD-05")

    def login(self, code):
        response = self.client.post("/api/login", json={"code": code})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": "Bearer " + response.json()["token"]}

    def test_analyst_requires_moderator_server_side(self):
        self.assertEqual(self.client.get("/api/moderator/situation-room").status_code, 401)
        self.assertEqual(self.client.get("/api/moderator/situation-room", headers=self.expert).status_code, 403)
        response = self.client.get("/api/moderator/situation-room", headers=self.mod)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "moderator")
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")

    def test_analyst_read_model_excludes_private_expert_contributions(self):
        with signal.db() as conn:
            conn.execute("UPDATE submissions SET note=? WHERE expert_id=?", ("SENSITIVE-DEMO-CANARY", "expert-01"))
        payload = self.client.get("/api/moderator/situation-room", headers=self.mod).json()
        serialized = json.dumps(payload)
        for forbidden in ("SENSITIVE-DEMO-CANARY", "expert-01", "FIELD-01", "invite_code", "expert_id", "individual_forecasts"):
            self.assertNotIn(forbidden, serialized)
        self.assertEqual(payload["panel"]["count"], 4)
        self.assertIsNone(payload["panel"]["approved_band"])

    def test_public_publication_uses_frozen_aggregate_only(self):
        with signal.db() as conn:
            conn.execute("UPDATE submissions SET note=? WHERE expert_id=?", ("SECRET-NOTE-DO-NOT-SHARE", "expert-01"))
        response = self.client.get("/api/public-summary")
        self.assertFalse(response.json()["available"])
        contribution = {"agreement": "about_right", "probability": 80, "confidence": "high", "note": "SYNTHETIC-CANARY-NOTE", "anonymity": "anonymous"}
        self.assertEqual(self.client.post("/api/expert/submit", json=contribution, headers=self.expert).status_code, 200)
        self.assertEqual(self.client.post("/api/moderator/release", headers=self.mod).status_code, 200)
        self.assertEqual(self.client.post("/api/moderator/publish", headers=self.mod).status_code, 200)
        before = self.client.get("/api/public-summary").json()
        self.assertEqual(before["forecast_round"], "initial_panel")
        for forbidden in ("SECRET-NOTE-DO-NOT-SHARE", "SYNTHETIC-CANARY-NOTE", "expert-01", "FIELD-01", "round_two_count", "individual"):
            self.assertNotIn(forbidden, json.dumps(before))
        self.assertEqual(self.client.post("/api/expert/revise", json={"probability": 0}, headers=self.expert).status_code, 409)
        self.assertEqual(self.client.get("/api/public-summary").json(), before)
        room = self.client.get("/api/moderator/situation-room", headers=self.mod).json()
        self.assertEqual(room["panel"]["approved_band"], before["forecast_median_band"])


if __name__ == "__main__":
    unittest.main()

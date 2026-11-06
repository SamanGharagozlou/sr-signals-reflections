"""Historical evaluation, safe inference limits, and moderator access."""
import csv
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from historical_evaluation import risk_matrix_lookup, score_binary_forecasts, summarize_historical_outcomes


def row(level, status):
    return {"Risk ID": "R1043", "Risk Title": "Synthetic example", "Country": "Chad", "Risk Level": level, "Status": status}


class HistoricalEvaluationTests(unittest.TestCase):
    def test_resolved_denominator_excludes_active_and_missing(self):
        records = [row("High", "Materialised"), row("High", "Not materialised"),
                   row("High", "Active"), row("High", ""), row("Medium", "Materialised"),
                   row("Low", "Not materialised"), row("", "Materialised")]
        result = summarize_historical_outcomes(records, "test dataset")
        self.assertEqual(result["totals"], {"total": 7, "resolved": 5, "materialised": 3,
                                           "not_materialised": 2, "active": 1, "unknown_status": 1})
        high = result["by_risk_level"][0]
        self.assertEqual(high["total"], 4)
        self.assertEqual(high["resolved"], 2)
        self.assertEqual(high["observed_materialisation_pct"], 50.0)
        self.assertFalse(high["rate_displayable"])

    def test_group_threshold_and_unknown_categories(self):
        result = summarize_historical_outcomes([row("High", "Materialised")] * 10 +
                                               [row("Low", "Not materialised")], "synthetic")
        high, medium, low, unknown = result["by_risk_level"]
        self.assertTrue(high["rate_displayable"])
        self.assertEqual(high["observed_materialisation_pct"], 100.0)
        self.assertIsNone(medium["observed_materialisation_pct"])
        self.assertFalse(low["rate_displayable"])
        self.assertFalse(unknown["rate_displayable"])

    def test_historical_report_never_claims_calibration(self):
        report = summarize_historical_outcomes([row("High", "Materialised")], "test")
        self.assertIn("Not computed", report["brier_evaluation"])
        self.assertTrue(any("NOT numeric probability" in note for note in report["limitations"]))

    def test_versioned_risk_matrix_is_explicit_and_separate(self):
        self.assertEqual(risk_matrix_lookup("High", 4), "High")
        self.assertEqual(risk_matrix_lookup("Medium", 3), "Medium")
        self.assertEqual(risk_matrix_lookup("Very Low", 5), "Medium")
        for probability, impact in [("Unknown", 4), ("High", 0), ("High", 6), ("High", True)]:
            with self.subTest(value=(probability, impact)), self.assertRaises(ValueError):
                risk_matrix_lookup(probability, impact)

    def test_brier_requires_explicit_numeric_forecast_and_outcome(self):
        self.assertEqual(score_binary_forecasts([(80, 1), (25, 0)]),
                         {"count": 2, "mean_brier": 0.0513, "lower_is_better": True})
        for sample in [[], [("High", 1)], [(80, "Materialised")], [(101, 1)], [(50, True)]]:
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                score_binary_forecasts(sample)

    def test_moderator_only_endpoint_with_official_like_csv(self):
        import app
        prior_path, prior_db = app.RISK_CSV, app.DB_PATH
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "risk-radar-export.csv"
            with path.open("w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=["Risk ID", "Risk Title", "Country", "Risk Level", "Status"])
                writer.writeheader()
                writer.writerows([row("High", "Materialised"), row("Medium", "Not materialised"), row("Low", "Active")])
            app.RISK_CSV = path
            app.DB_PATH = Path(directory) / "state.db"
            app.initialize()
            try:
                with TestClient(app.app) as client:
                    self.assertEqual(client.get("/api/moderator/historical-evaluation").status_code, 401)
                    expert = client.post("/api/login", json={"code": "FIELD-05"}).json()["token"]
                    moderator = client.post("/api/login", json={"code": "ACAPS-DEMO"}).json()["token"]
                    self.assertEqual(client.get("/api/moderator/historical-evaluation", headers={"Authorization": "Bearer " + expert}).status_code, 403)
                    result = client.get("/api/moderator/historical-evaluation", headers={"Authorization": "Bearer " + moderator})
                    self.assertEqual(result.status_code, 200)
                    payload = result.json()
                    self.assertTrue(payload["available"])
                    self.assertEqual(payload["totals"]["resolved"], 2)
                    self.assertEqual(payload["totals"]["active"], 1)
                    self.assertNotIn("raw_records", payload)
            finally:
                app.RISK_CSV, app.DB_PATH = prior_path, prior_db

    def test_fallback_explains_missing_official_csv(self):
        import app
        orig_path, orig_db = app.RISK_CSV, app.DB_PATH
        with tempfile.TemporaryDirectory() as directory:
            app.RISK_CSV = Path(directory) / "missing.csv"
            app.DB_PATH = Path(directory) / "state.db"
            app.initialize()
            try:
                with TestClient(app.app) as client:
                    moderator = client.post("/api/login", json={"code": "ACAPS-DEMO"}).json()["token"]
                    payload = client.get("/api/moderator/historical-evaluation", headers={"Authorization": "Bearer " + moderator}).json()
                    self.assertFalse(payload["available"])
                    self.assertIn("Official historical", payload["reason"])
            finally:
                app.RISK_CSV, app.DB_PATH = orig_path, orig_db


if __name__ == "__main__":
    unittest.main()

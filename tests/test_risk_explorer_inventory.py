"""Risk Explorer inventory contract; operates on official data or the documented fallback."""
import unittest
from fastapi.testclient import TestClient


class RiskExplorerInventoryTests(unittest.TestCase):
    def test_inventory_exposes_source_risk_metadata_without_forecast_claims(self):
        import app
        with TestClient(app.app) as client:
            response = client.get('/api/risks')
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload['count'], len(payload['risks']))
            self.assertTrue(payload['source'])
            self.assertGreater(payload['count'], 0)
            ids = [r['id'] for r in payload['risks']]
            self.assertIn('R1043', ids)
            for record in payload['risks']:
                self.assertIn('country', record)
                self.assertIn('level', record)
                self.assertIn('status', record)
                self.assertIn('trend', record)
                self.assertIn('probability_category', record)
                self.assertIn('impact', record)
                self.assertNotIn('forecast_probability', record)
                self.assertNotIn('expert_predictions', record)

    def test_detail_remains_source_context_not_synthetic_forecast(self):
        import app
        with TestClient(app.app) as client:
            response = client.get('/api/risks/R1043')
            self.assertEqual(response.status_code, 200)
            risk = response.json()
            self.assertEqual(risk['id'], 'R1043')
            self.assertEqual(risk['country'], 'Chad')
            self.assertIn('triggers', risk)
            self.assertNotIn('panel_median', risk)

"""Deterministic ACAPS risk-context and historical methodology tests."""
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from acaps_methodology import probability_band
from risk_context import build_risk_context, clean_text, extract_sources, parse_triggers


class RiskContextTests(unittest.TestCase):
    def test_2019_probability_boundaries(self):
        for p, expected in [(0,"Very low"),(9,"Very low"),(10,"Low"),(33,"Low"),
                            (34,"Moderate"),(66,"Moderate"),(67,"High"),
                            (90,"High"),(91,"Very high"),(100,"Very high")]:
            with self.subTest(p=p):
                self.assertEqual(probability_band(p), expected)
        for value in [-1,101,True,3.5,"50"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                probability_band(value)

    def test_triggers_and_source_extraction(self):
        raw = """Trigger ID: R1043 - T0618_x000D_\r\nTitle: Border disruptions_x000D_\r\nDescription: _x000D_\r\n:Additional displacement\r\nSources: _x000D_\r\n[Organization](https://example.org/report)\r\nCompletion rate: 40%\r\nTrigger ID: R1043 - T0619\nTitle: Market disruptions\nDescription: Access becomes more difficult"""
        triggers = parse_triggers(raw)
        self.assertEqual(len(triggers),2)
        self.assertEqual(triggers[0]['id'], 'R1043 - T0618')
        self.assertEqual(triggers[0]['description'], 'Additional displacement')
        self.assertEqual(triggers[0]['sources'], [{'label':'Organization','url':'https://example.org/report'}])
        self.assertEqual(triggers[1]['title'], 'Market disruptions')
        self.assertEqual(len(extract_sources('[A](https://example.org/report) https://example.org/report')),1)
        self.assertEqual(clean_text(None), '')

    def test_fallback_has_no_invented_evidence(self):
        from app import R1043
        c = build_risk_context(R1043, 'synthetic fallback')
        self.assertEqual(c['risk_id'], 'R1043')
        self.assertEqual(c['assessment']['acaps_probability_category'],'High')
        self.assertEqual(c['assessment']['acaps_impact'],'4')
        self.assertEqual(c['triggers'],[])
        self.assertTrue(c['unstructured_triggers'])
        self.assertIsNone(c['evidence']['expected_impact']['text'])
        self.assertIn('Rationale',c['missing_fields'])

    def test_endpoint_role_protection_and_full_record(self):
        import app
        original_csv = app.RISK_CSV
        original_db = app.DB_PATH
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'risks.csv'
            p.write_text('Risk ID,Risk Title,Country,Probability,Impact,Risk Level,Rationale,Triggers,Source\n'
                         'R1043,Sample risk,Chad,High,4,High,Source-based context,Trigger ID: T1,https://example.org/source\n',encoding='utf-8')
            app.RISK_CSV=p
            app.DB_PATH=Path(td)/'test_demo.db'
            app.initialize()
            try:
                with TestClient(app.app) as client:
                    self.assertEqual(client.get('/api/risks/R1043/context').status_code,401)
                    expert=client.post('/api/login',json={'code':'FIELD-05'}).json()['token']
                    self.assertEqual(client.get('/api/risks/R1043/context',headers={'Authorization':'Bearer '+expert}).status_code,403)
                    moderator=client.post('/api/login',json={'code':'ACAPS-DEMO'}).json()['token']
                    response=client.get('/api/risks/R1043/context',headers={'Authorization':'Bearer '+moderator})
                    self.assertEqual(response.status_code,200,response.text)
                    c=response.json()
                    self.assertEqual(c['risk_id'],'R1043')
                    self.assertEqual(c['assessment']['acaps_risk_level'],'High')
                    self.assertEqual(c['evidence']['rationale']['sources'][0]['url'],'https://example.org/source')
                    self.assertIsNone(c['evidence']['expected_impact']['text'])
                    self.assertEqual(client.get('/api/risks/unknown/context',headers={'Authorization':'Bearer '+moderator}).status_code,404)
            finally:
                app.RISK_CSV=original_csv
                app.DB_PATH=original_db


if __name__=='__main__': unittest.main()

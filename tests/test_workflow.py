"""Synthetic end-to-end contract tests: run `python -m unittest discover -s tests -v`."""
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.temp.name) / 'unit_test.db'
        os.environ['SIGNAL_DB_PATH'] = str(cls.db_path)
        import importlib
        import app as app_module
        cls.mod = importlib.reload(app_module)
        cls.client = TestClient(cls.mod.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.temp.cleanup()

    def token(self, code):
        response = self.client.post('/api/login',json={'code':code})
        self.assertEqual(response.status_code,200,response.text)
        return {'Authorization':'Bearer '+response.json()['token']}

    def test_01_initial_state(self):
        c=self.client.get('/api/consultation').json()
        self.assertEqual(c['responded'],4)
        self.assertEqual(c['panel_size'],5)
        self.assertEqual(c['risk']['id'],'R1043')
        self.assertEqual(self.client.get('/api/risks/R1043').status_code,200)
        self.assertFalse(self.client.get('/api/public-summary').json()['available'])

    def test_02_no_early_access(self):
        mod=self.token('ACAPS-DEMO')
        expert=self.token('FIELD-05')
        self.assertEqual(self.client.post('/api/moderator/release',headers=mod,json={}).status_code,409)
        feedback=self.client.get('/api/expert/feedback',headers=expert)
        self.assertEqual(feedback.status_code,403)
        self.assertEqual(self.client.get('/api/moderator/dashboard',headers=expert).status_code,403)
        self.assertEqual(self.client.get('/api/me').status_code,401)

    def test_03_full_delphi_and_publish(self):
        mod=self.token('ACAPS-DEMO')
        expert=self.token('FIELD-05')
        body={'agreement':'underestimated','probability':80,'confidence':'high',
              'anonymity':'anonymous','note':'Potential access problems near the border.'}
        response=self.client.post('/api/expert/submit',headers=expert,json=body)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(self.client.post('/api/expert/submit',headers=expert,json=body).status_code,409)
        before=self.client.get('/api/expert/feedback',headers=expert).json()
        self.assertFalse(before['available'])
        dashboard=self.client.get('/api/moderator/dashboard',headers=mod).json()
        self.assertEqual(dashboard['group']['count'],5)
        self.assertTrue(dashboard['can_release'])
        self.assertNotIn('note',dashboard['group'])
        self.assertNotIn('expert_id',dashboard['group'])
        self.assertEqual(self.client.post('/api/moderator/release',headers=mod,json={}).status_code,200)
        feedback=self.client.get('/api/expert/feedback',headers=expert).json()
        self.assertTrue(feedback['available'])
        self.assertEqual(feedback['group']['count'],5)
        self.assertEqual(self.client.post('/api/expert/revise',headers=expert,json={'probability':65}).status_code,200)
        dashboard=self.client.get('/api/moderator/dashboard',headers=mod).json()
        self.assertEqual(dashboard['group']['round_two_count'],1)
        # A single expert's revised forecast must not be disclosed to peers.
        peer_feedback=self.client.get('/api/expert/feedback',headers=expert).json()['group']
        self.assertEqual(peer_feedback['round_two_count'],0)
        self.assertIsNone(peer_feedback['round_two_median'])
        self.assertEqual(peer_feedback['round_two_range'], [])
        self.assertIsNone(peer_feedback['round_two_iqr'])
        self.assertIsNone(peer_feedback['round_two_mad'])
        self.assertIsNone(peer_feedback['round_two_unrevised_count'])
        self.assertIsNone(peer_feedback['median_change_pp'])
        self.assertIsNone(peer_feedback['round_two_method'])
        self.assertTrue(all(n>=2 for n in peer_feedback['theme_counts'].values()))
        self.assertEqual(self.client.post('/api/moderator/publish',headers=mod,json={}).status_code,200)
        published=self.client.get('/api/public-summary').json()
        self.assertTrue(published['available'])
        self.assertNotIn('theme_counts',published)
        self.assertNotIn('agreement',published)
        self.assertNotIn('expert_id',published)
        self.assertEqual(published['panel_size'],5)
        # Mathematical property: p=70%, outcome=1 -> (0.7-1)^2=0.09
        score=self.client.post('/api/scoring/brier',json={'probability':70,'outcome':1}).json()
        self.assertEqual(score['brier_score'],0.09)
        self.assertEqual(self.client.post('/api/demo/reset',headers=mod,json={}).status_code,200)
        self.assertEqual(self.client.get('/api/consultation').json()['responded'],4)
        self.assertFalse(self.client.get('/api/public-summary').json()['available'])
        self.assertEqual(self.client.get('/api/me',headers=expert).status_code,401)

if __name__=='__main__':
    unittest.main()

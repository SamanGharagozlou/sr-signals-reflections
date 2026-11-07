"""Phase 2B regression tests for demo-only visibility and approval boundaries."""
import importlib
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient


class PrivacyBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.original = os.environ.get('SIGNAL_DB_PATH')
        os.environ['SIGNAL_DB_PATH'] = str(Path(self.tmp.name) / 'privacy.sqlite3')
        import app as module
        self.module = importlib.reload(module)
        self.client = TestClient(self.module.app)

    def tearDown(self):
        self.client.close()
        if self.original is None:
            os.environ.pop('SIGNAL_DB_PATH', None)
        else:
            os.environ['SIGNAL_DB_PATH'] = self.original
        self.tmp.cleanup()

    def token(self, code):
        response = self.client.post('/api/login', json={'code':code})
        self.assertEqual(response.status_code, 200, response.text)
        return {'Authorization': 'Bearer ' + response.json()['token']}

    def complete_panel(self):
        expert = self.token('FIELD-05')
        result = self.client.post('/api/expert/submit',headers=expert,json={
            'agreement':'underestimated', 'probability':80,'confidence':'medium',
            'note':'Unverified synthetic concern about humanitarian access',
            'anonymity':'anonymous'})
        self.assertEqual(result.status_code,200,result.text)
        return expert

    def release(self):
        expert = self.complete_panel()
        moderator = self.token('ACAPS-DEMO')
        self.assertEqual(self.client.post('/api/moderator/release',headers=moderator,json={}).status_code,200)
        return expert, moderator

    def test_access_is_role_scoped(self):
        mod = self.token('ACAPS-DEMO')
        expert = self.token('FIELD-05')
        self.assertEqual(self.client.get('/api/moderator/dashboard',headers=expert).status_code,403)
        self.assertEqual(self.client.post('/api/moderator/publish',headers=expert,json={}).status_code,403)
        self.assertEqual(self.client.post('/api/expert/submit',headers=mod,json={}).status_code,403)
        self.assertEqual(self.client.get('/api/expert/feedback').status_code,401)

    def test_no_peer_feedback_before_submission_and_release(self):
        expert = self.token('FIELD-05')
        self.assertEqual(self.client.get('/api/expert/feedback',headers=expert).status_code,403)
        self.complete_panel()  # separate token, same expert identity
        response=self.client.get('/api/expert/feedback',headers=expert)
        self.assertEqual(response.status_code,200)
        self.assertFalse(response.json()['available'])
        self.assertNotIn('group',response.json())

    def test_coarse_peer_feedback_never_discloses_small_cells_or_revision(self):
        expert, moderator = self.release()
        before=self.client.get('/api/expert/feedback',headers=expert).json()
        self.assertTrue(before['available'])
        self.assertEqual(before['group']['panel_size'],5)
        self.assertEqual(set(before['group']),{
            'panel_size','forecast_median_band','assessment_pattern','notice'})
        serialized=str(before)
        for sensitive in ('agreement', 'theme_counts', 'round_two_count', 'round_two_median',
                          'expert_id', 'range', '65.0', 'Unverified synthetic concern'):
            self.assertNotIn(sensitive, serialized)
        self.assertEqual(self.client.post('/api/expert/revise',headers=expert,json={'probability':5}).status_code,200)
        after=self.client.get('/api/expert/feedback',headers=expert).json()
        self.assertEqual(after,before)  # no differencing of individual forecast changes
        detailed=self.client.get('/api/moderator/dashboard',headers=moderator).json()['group']
        self.assertEqual(detailed['round_two_count'],1)

    def test_publication_snapshot_is_frozen_after_approval(self):
        expert,moderator=self.release()
        self.assertFalse(self.client.get('/api/public-summary').json()['available'])
        self.assertEqual(self.client.post('/api/moderator/publish',headers=moderator,json={}).status_code,200)
        snapshot=self.client.get('/api/public-summary').json()
        self.assertTrue(snapshot['available'])
        self.assertEqual(snapshot['panel_size'],5)
        self.assertNotIn('median_probability',snapshot)
        self.assertNotIn('agreement',snapshot)
        self.assertNotIn('expert_id',snapshot)
        self.assertNotIn('note',snapshot)
        self.assertEqual(self.client.post('/api/moderator/publish',headers=moderator,json={}).status_code,409)
        self.assertEqual(self.client.post('/api/expert/revise',headers=expert,json={'probability':0}).status_code,409)
        self.assertEqual(self.client.get('/api/public-summary').json(),snapshot)
        self.assertEqual(self.client.post('/api/demo/reset',headers=moderator,json={}).status_code,200)
        self.assertFalse(self.client.get('/api/public-summary').json()['available'])

    def test_sessions_expire_and_malformed_timestamps_are_denied(self):
        moderator=self.token('ACAPS-DEMO')
        token=moderator['Authorization'][7:]
        with self.module.db() as conn:
            old=(datetime.now(timezone.utc)-timedelta(hours=9)).isoformat()
            conn.execute('UPDATE sessions SET created_at=? WHERE token=?',(old,token))
        self.assertEqual(self.client.get('/api/moderator/dashboard',headers=moderator).status_code,401)
        token2=self.token('ACAPS-DEMO')
        with self.module.db() as conn:
            conn.execute('UPDATE sessions SET created_at=? WHERE token=?',('bad-timestamp',token2['Authorization'][7:]))
        self.assertEqual(self.client.get('/api/moderator/dashboard',headers=token2).status_code,401)

    def test_api_responses_not_cacheable(self):
        response=self.client.get('/api/public-summary')
        self.assertEqual(response.headers.get('cache-control'),'no-store')
        self.assertEqual(response.headers.get('x-content-type-options'),'nosniff')
        self.assertEqual(self.client.get('/api/me').headers.get('cache-control'),'no-store')

    def test_preexisting_approval_without_snapshot_fails_closed(self):
        with self.module.db() as conn:
            self.module.set_config(conn,'public_approved','true')
            self.module.set_config(conn,'public_snapshot','')
        self.module.initialize()
        with self.module.db() as conn:
            self.assertEqual(self.module.config(conn,'public_approved'),'false')
        self.assertFalse(self.client.get('/api/public-summary').json()['available'])


if __name__=='__main__':
    unittest.main()

"""Delphi statistics regression tests; independent of the live demo workflow tests."""
import os
import tempfile
import unittest
from pathlib import Path


class StatisticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ['SIGNAL_DB_PATH'] = str(Path(cls.temp.name) / 'statistics.db')
        import importlib
        import app
        cls.backend = importlib.reload(app)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        # Restore exactly 4 seeds for each test, then add a fifth synthetic expert.
        with self.backend.db() as conn:
            conn.execute('DELETE FROM revisions')
            conn.execute('DELETE FROM submissions')
            for seed in self.backend.SYNTHETIC_RESPONSES:
                conn.execute('''INSERT INTO submissions
                    (expert_id, agreement, probability, confidence, note, anonymity, created_at)
                    VALUES(?, ?, ?, ?, ?, ?, ?)''', (*seed, self.backend.now()))
            conn.execute('''INSERT INTO submissions
                (expert_id, agreement, probability, confidence, note, anonymity, created_at)
                VALUES(?, ?, ?, ?, ?, ?, ?)''',
                ('expert-05', 'underestimated', 80, 'medium', '', 'anonymous', self.backend.now()))

    def group(self):
        with self.backend.db() as conn:
            return self.backend.compute_group(conn)

    def revise(self, expert, value):
        with self.backend.db() as conn:
            conn.execute('''INSERT INTO revisions (expert_id, probability, created_at)
                VALUES(?, ?, ?)''', (expert, value, self.backend.now()))

    def test_first_round_descriptive_metrics(self):
        g = self.group()  # [70,85,60,45,80]
        self.assertEqual(g['median'], 70)
        self.assertEqual(g['average'], 68)
        self.assertEqual(g['range'], [45,85])
        self.assertEqual(g['iqr'], 20)
        self.assertEqual(g['mad'], 10)
        self.assertIsNone(g['round_two_median'])

    def test_one_revision_does_not_create_one_person_round_median(self):
        self.revise('expert-05', 65)
        g = self.group()  # [70,85,60,45,65]
        self.assertEqual(g['round_two_count'], 1)
        self.assertEqual(g['round_two_unrevised_count'], 4)
        self.assertEqual(g['round_two_median'], 65)
        self.assertEqual(g['round_two_range'], [45,85])
        self.assertEqual(g['round_two_iqr'], 10)
        self.assertEqual(g['round_two_mad'], 5)
        self.assertEqual(g['median_change_pp'], -5)

    def test_two_revisions_still_compare_identical_panel_members(self):
        self.revise('expert-02', 50)
        self.revise('expert-05', 65)
        g = self.group()  # [70,50,60,45,65] -> median 60
        self.assertEqual(g['round_two_count'], 2)
        self.assertEqual(g['round_two_median'], 60)
        self.assertEqual(g['median_change_pp'], -10)

    def test_small_panels_do_not_get_quartiles(self):
        f = self.backend.describe_probabilities
        self.assertIsNone(f([])['median'])
        self.assertIsNone(f([65])['iqr'])
        self.assertEqual(f([65])['mad'], 0)
        self.assertIsNone(f([50,70,80])['iqr'])


if __name__ == '__main__':
    unittest.main()

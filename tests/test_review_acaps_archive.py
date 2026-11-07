import importlib.util
from pathlib import Path
import unittest

PATH=Path(__file__).with_name('review_acaps_archive.py')
spec=importlib.util.spec_from_file_location('acaps_archive_refresh',PATH)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
HTML='''<html><body><h2>Explore our analysis products archive</h2>
<section><time>28 October 2026</time><h2>Afghanistan: community perspectives on early flood warning and preparedness</h2></section>
<section><time>15 October 2026</time><h2>Colombia: Humanitarian impacts in the municipalities along the Nariño–Ecuador border</h2></section>
<section><time>15 October 2026</time><h2>Ukraine: May–August 2026 humanitarian access update</h2></section>
<section><time>12 October 2026</time><h2>Yemen: Brand new report</h2></section></body></html>'''
class Tests(unittest.TestCase):
    def test_parses_dated_report_headings(self):
        rows=module.extract_archive(HTML)
        self.assertEqual(len(rows),4)
        self.assertEqual(rows[0]['publishedOn'],'2026-10-28')
        self.assertTrue(rows[1]['title'].startswith('Colombia'))
    def test_duplicate_titles_are_deduplicated(self):
        self.assertEqual(len(module.extract_archive(HTML+HTML)),4)
    def test_unsupported_headings_are_not_reports(self):
        self.assertFalse(any(x['title'].startswith('Explore our') for x in module.extract_archive(HTML)))
    def test_review_only_accepts_existing_titles(self):
        snapshot={'items':[{'title':'Afghanistan: community perspectives on early flood warning and preparedness'},{'title':'Colombia: Humanitarian impacts in the municipalities along the Nariño–Ecuador border'}]}
        known,new=module.review(HTML,snapshot)
        self.assertEqual(len(known),2)
        self.assertEqual(len(new),2)
if __name__=='__main__':unittest.main()

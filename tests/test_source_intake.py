"""Synthetic-only source intake contract tests; isolated SQLite, no local ACAPS datasets."""
import sqlite3
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from source_intake import create_router, extract_fields, safe_demo_text

SAMPLE = "From: [removed]\nOur team counted about 1,200 new arrivals on Tuesday. Most head to Iriba; border sites are full."

class EvidenceIntakeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        path = Path(self.tmp.name) / "test.sqlite"
        @contextmanager
        def db():
            conn = sqlite3.connect(path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys=ON")
            try:
                yield conn
                conn.commit()
            finally:
                conn.close()
        def session(authorization: str | None = Header(default=None)):
            if authorization == "Bearer expert": return {"role":"expert","expert_id":"expert-05"}
            if authorization == "Bearer moderator": return {"role":"moderator","expert_id":None}
            raise HTTPException(401,"Demo login required")
        def require_expert(auth=__import__('fastapi').Depends(session)):
            if auth["role"] != "expert": raise HTTPException(403,"Expert role required")
            return auth
        def require_moderator(auth=__import__('fastapi').Depends(session)):
            if auth["role"] != "moderator": raise HTTPException(403,"Moderator role required")
            return auth
        app = FastAPI()
        app.include_router(create_router(db,require_expert,require_moderator,lambda:([{"Risk ID":"R1043"}],"fixture")))
        self.client = TestClient(app)
        self.submit_data = {
            "source_type":"email","source_text":SAMPLE,"risk_id":"R1043",
            "reported_place":"Iriba","reported_date":"Tuesday","reported_count":1200,
            "event":"Reported population movement","source_category":"ngo_report",
            "proximity":"trusted_secondhand","confirmed_synthetic":True,"confirmed_no_pii":True,
        }
        self.expert={"Authorization":"Bearer expert"}
        self.mod={"Authorization":"Bearer moderator"}

    def tearDown(self): self.tmp.cleanup()

    def test_extract_does_not_invent_date_or_confidence(self):
        d=extract_fields(SAMPLE)
        self.assertEqual(d["reported_count"],1200)
        self.assertEqual(d["reported_place"],"Iriba")
        self.assertEqual(d["reported_date"],"Tuesday")
        self.assertEqual(d["suggested_risk_id"],"R1043")
        self.assertNotIn("confidence",d)
        self.assertFalse(d["redaction_automatically_verified"])

    def test_contact_regex_masks_email_and_phone(self):
        s=safe_demo_text("Contact: alice@example.org\nPhone: +31 612 345 678\nSafe note")
        self.assertNotIn("@",s)
        self.assertNotIn("612 345",s)

    def test_auth_guards_all_endpoints(self):
        self.assertEqual(self.client.post("/api/evidence/preview",json={"source_type":"email","source_text":SAMPLE}).status_code,401)
        self.assertEqual(self.client.post("/api/evidence/submit",json=self.submit_data,headers=self.mod).status_code,403)
        self.assertEqual(self.client.get("/api/moderator/source-intake",headers=self.expert).status_code,403)
        self.assertEqual(self.client.get("/api/evidence/mine").status_code,401)

    def test_submit_requires_explicit_demo_and_privacy_confirmation(self):
        for key in ("confirmed_synthetic","confirmed_no_pii"):
            bad={**self.submit_data,key:False}
            self.assertEqual(self.client.post("/api/evidence/submit",headers=self.expert,json=bad).status_code,422)

    def test_risk_link_must_be_in_inventory(self):
        data={**self.submit_data,"risk_id":"R0000"}
        self.assertEqual(self.client.post("/api/evidence/submit",headers=self.expert,json=data).status_code,400)

    def test_review_is_persisted_and_not_public(self):
        result=self.client.post("/api/evidence/submit",headers=self.expert,json=self.submit_data)
        self.assertEqual(result.status_code,200,result.text)
        record=result.json()["item"]
        self.assertEqual(record["id"],"EV-0001")
        self.assertEqual(record["status"],"pending_review")
        self.assertEqual(len(self.client.get("/api/evidence/mine",headers=self.expert).json()["items"]),1)
        inbox=self.client.get("/api/moderator/source-intake",headers=self.mod).json()["items"]
        self.assertEqual(len(inbox),1)
        wrong=self.client.post("/api/moderator/source-intake/1/review",json={"decision":"accepted_for_analysis","expected_version":0},headers=self.expert)
        self.assertEqual(wrong.status_code,403)
        approve=self.client.post("/api/moderator/source-intake/1/review",json={"decision":"accepted_for_analysis","note":"Reviewed as an illustration","expected_version":0},headers=self.mod)
        self.assertEqual(approve.status_code,200)
        self.assertEqual(approve.json()["item"]["status"],"accepted_for_analysis")
        stale=self.client.post("/api/moderator/source-intake/1/review",json={"decision":"rejected","expected_version":0},headers=self.mod)
        self.assertEqual(stale.status_code,409)
        with sqlite3.connect(Path(self.tmp.name)/"test.sqlite") as conn:
            self.assertEqual(conn.execute("select count(*) from sr_source_audit").fetchone()[0],2)
            self.assertEqual(conn.execute("select count(*) from sr_source_intake").fetchone()[0],1)

    def test_preview_cannot_be_used_by_moderator(self):
        r=self.client.post("/api/evidence/preview",json={"source_type":"note","source_text":SAMPLE},headers=self.mod)
        self.assertEqual(r.status_code,403)


# Additional Phase 13 tests for safe synthetic references and private PNG attachments.
class MultiSourceTests(unittest.TestCase):
    def setUp(self):
        self.original = EvidenceIntakeTests()
        self.original.setUp()
        self.client = self.original.client
        self.expert = self.original.expert
        self.mod = self.original.mod
        self.basic = self.original.submit_data

    def tearDown(self):
        self.original.tearDown()

    @staticmethod
    def tiny_png() -> str:
        import base64
        import struct
        import zlib
        def chunk(tag, content):
            crc = zlib.crc32(tag + content) & 0xffffffff
            return struct.pack('>I',len(content)) + tag + content + struct.pack('>I',crc)
        ihdr = struct.pack('>IIBBBBB', 2, 2, 8, 6, 0, 0, 0)
        pixels = (b'\x00' + bytes((120, 150, 175, 255))*2) * 2
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',ihdr) + chunk(b'IDAT',zlib.compress(pixels)) + chunk(b'IEND',b'')
        return base64.b64encode(png).decode()

    def test_link_preview_strips_tracking_and_never_fetches(self):
        data={"source_type":"link", "source_text":"https://example.org/synthetic-chad-arrivals?token=SECRET#fragment"}
        result=self.client.post('/api/evidence/preview',headers=self.expert,json=data)
        self.assertEqual(result.status_code,200,result.text)
        text=result.json()['sanitized_preview']
        self.assertEqual(text,'https://example.org/synthetic-chad-arrivals')
        self.assertNotIn('SECRET',text)
        submitted=self.client.post('/api/evidence/submit',headers=self.expert,json={**self.basic,**data})
        self.assertEqual(submitted.status_code,200,submitted.text)
        self.assertEqual(submitted.json()['item']['source_type'],'link')
        self.assertEqual(submitted.json()['item']['redacted_text'],text)
        self.assertFalse(submitted.json()['item']['has_photo'])

    def test_link_rejects_non_https_local_and_credential_urls(self):
        for url in ('http://example.org/x','https://localhost/a','https://127.0.0.1/a',
                    'https://a:b@example.org/x','https://example.org:8080/path',
                    'https://internal.local/a','file:///etc/passwd'):
            with self.subTest(url=url):
                r=self.client.post('/api/evidence/preview',headers=self.expert,
                                   json={"source_type":"link","source_text":url})
                self.assertIn(r.status_code,(400,422),r.text)

    def test_photo_is_private_and_persisted(self):
        photo={**self.basic,'source_type':'photo','source_text':'Fictional Chad arrivals near Iriba',
               'photo_png_base64':self.tiny_png()}
        saved=self.client.post('/api/evidence/submit',headers=self.expert,json=photo)
        self.assertEqual(saved.status_code,200,saved.text)
        self.assertTrue(saved.json()['item']['has_photo'])
        self.assertNotIn('photo_png_base64', saved.text)
        self.assertNotIn('png_data', self.client.get('/api/moderator/source-intake',headers=self.mod).text)
        self.assertEqual(self.client.get('/api/moderator/source-intake/1/photo').status_code,401)
        self.assertEqual(self.client.get('/api/moderator/source-intake/1/photo',headers=self.expert).status_code,403)
        self.assertEqual(self.client.get('/api/evidence/1/photo',headers=self.mod).status_code,403)
        with_photo=self.client.get('/api/moderator/source-intake/1/photo',headers=self.mod)
        self.assertEqual(with_photo.status_code,200)
        self.assertEqual(with_photo.headers['content-type'],'image/png')
        self.assertEqual(with_photo.headers['cache-control'],'private, no-store')
        self.assertEqual(with_photo.content[:8],b'\x89PNG\r\n\x1a\n')
        self.assertEqual(self.client.get('/api/evidence/1/photo',headers=self.expert).status_code,200)

    def test_photo_rejects_missing_invalid_and_metadata(self):
        import base64
        import struct
        import zlib
        photo={**self.basic,'source_type':'photo','source_text':'Fictional Chad arrivals near Iriba'}
        self.assertEqual(self.client.post('/api/evidence/submit',headers=self.expert,json=photo).status_code,400)
        self.assertEqual(self.client.post('/api/evidence/submit',headers=self.expert,
                         json={**photo,'photo_png_base64':'not base64!!'}).status_code,400)
        blob=base64.b64decode(self.tiny_png())
        extra=b'SECRET SOURCE'
        typ=b'tEXt'
        text_chunk=struct.pack('>I',len(extra))+typ+extra+struct.pack('>I',zlib.crc32(typ+extra)&0xffffffff)
        photo_with_text=base64.b64encode(blob[:33]+text_chunk+blob[33:]).decode()
        self.assertEqual(self.client.post('/api/evidence/submit',headers=self.expert,
                         json={**photo,'photo_png_base64':photo_with_text}).status_code,400)
        self.assertEqual(self.client.post('/api/evidence/submit',headers=self.expert,
                         json={**self.basic,'photo_png_base64':self.tiny_png()}).status_code,400)

    def test_photo_ownership_and_reviewer_workflow(self):
        photo={**self.basic,'source_type':'photo','source_text':'Fictional Chad arrivals near Iriba',
               'photo_png_base64':self.tiny_png()}
        self.assertEqual(self.client.post('/api/evidence/submit',headers=self.expert,json=photo).status_code,200)
        decision=self.client.post('/api/moderator/source-intake/1/review',headers=self.mod,
                                  json={'decision':'needs_more_evidence','note':'Synthetic image only','expected_version':0})
        self.assertEqual(decision.status_code,200,decision.text)
        self.assertEqual(decision.json()['item']['source_type'],'photo')
        self.assertEqual(decision.json()['item']['status'],'needs_more_evidence')

class FollowupWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.fixture=EvidenceIntakeTests()
        self.fixture.setUp()
        self.client=self.fixture.client
        self.expert=self.fixture.expert
        self.moderator=self.fixture.mod
        self.payload=self.fixture.submit_data
        self.saved=self.client.post("/api/evidence/submit",headers=self.expert,json=self.payload)
        assert self.saved.status_code==200,self.saved.text

    def tearDown(self): self.fixture.tearDown()

    def request_more(self):
        return self.client.post("/api/moderator/source-intake/1/review",headers=self.moderator,
            json={"decision":"needs_more_evidence","note":"Please clarify how the arrival count was estimated.","expected_version":0})

    def clarification(self, **overrides):
        body={"message":"Fictional follow-up: the count is an estimate from a two-hour observation.",
              "expected_version":1,"confirmed_synthetic":True,"confirmed_no_pii":True}
        body.update(overrides)
        return self.client.post("/api/evidence/1/followups",headers=self.expert,json=body)

    def test_end_to_end_request_followup_rereview_immutable_original(self):
        self.assertEqual(self.request_more().status_code,200)
        more=self.client.get("/api/evidence/mine",headers=self.expert).json()["items"][0]
        self.assertEqual(more["status"],"needs_more_evidence")
        self.assertIn("arrival count",more["reviewer_note"])
        result=self.clarification()
        self.assertEqual(result.status_code,200,result.text)
        new=result.json()["item"]
        self.assertEqual(new["status"],"pending_review")
        self.assertEqual(new["version"],2)
        self.assertEqual(new["redacted_text"],self.saved.json()["item"]["redacted_text"])
        hist=self.client.get("/api/evidence/1/followups",headers=self.expert)
        self.assertEqual(hist.status_code,200)
        self.assertEqual(len(hist.json()["items"]),1)
        self.assertIn("two-hour",hist.json()["items"][0]["redacted_message"])
        self.assertIn("arrival count",hist.json()["items"][0]["request_note"])
        self.assertEqual(self.client.get("/api/moderator/source-intake/1/followups",headers=self.moderator).status_code,200)
        accepted=self.client.post("/api/moderator/source-intake/1/review",headers=self.moderator,json={
            "decision":"accepted_for_analysis", "note":"Accepted as an illustrative unverified hypothesis", "expected_version":2})
        self.assertEqual(accepted.status_code,200,accepted.text)
        self.assertEqual(accepted.json()["item"]["version"],3)
        self.assertEqual(accepted.json()["item"]["status"],"accepted_for_analysis")
        self.assertEqual(self.client.get("/api/evidence/1/followups",headers=self.expert).json()["items"][0]["redacted_message"],hist.json()["items"][0]["redacted_message"])
        with sqlite3.connect(Path(self.fixture.tmp.name)/"test.sqlite") as conn:
            actions=[x[0] for x in conn.execute("SELECT action FROM sr_source_audit ORDER BY id").fetchall()]
        self.assertEqual(actions,["submitted","needs_more_evidence","followup_submitted","accepted_for_analysis"])

    def test_auth_ownership_and_ineligible_states(self):
        self.assertEqual(self.client.get("/api/evidence/1/followups").status_code,401)
        self.assertEqual(self.client.get("/api/evidence/1/followups",headers=self.moderator).status_code,403)
        self.assertEqual(self.client.get("/api/moderator/source-intake/1/followups",headers=self.expert).status_code,403)
        self.assertEqual(self.client.post("/api/evidence/1/followups",headers=self.moderator,json={"message":"Fictional follow-up message", "expected_version":0,"confirmed_synthetic":True,"confirmed_no_pii":True}).status_code,403)
        self.assertEqual(self.clarification(expected_version=0).status_code,409)
        self.assertEqual(self.request_more().status_code,200)
        self.assertEqual(self.clarification().status_code,200)
        self.assertEqual(self.clarification().status_code,409)
        self.assertEqual(self.client.get("/api/evidence/999/followups",headers=self.expert).status_code,404)
        self.assertEqual(self.client.get("/api/moderator/source-intake/999/followups",headers=self.moderator).status_code,404)

    def test_no_followup_without_privacy_confirmations(self):
        self.assertEqual(self.request_more().status_code,200)
        for field in ("confirmed_synthetic","confirmed_no_pii"):
            self.assertEqual(self.clarification(**{field:False}).status_code,422)
        redacted=self.clarification(message="me@real.example reported from a fictional location")
        self.assertEqual(redacted.status_code,200)
        self.assertNotIn("me@real.example",self.client.get("/api/evidence/1/followups",headers=self.expert).text)
        with sqlite3.connect(Path(self.fixture.tmp.name)/"test.sqlite") as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM sr_source_followup").fetchone()[0],1)

    def test_corroboration_request_requires_specific_note(self):
        no_note=self.client.post("/api/moderator/source-intake/1/review",headers=self.moderator,
            json={"decision":"needs_more_evidence","note":"","expected_version":0})
        self.assertEqual(no_note.status_code,400)
        self.assertEqual(self.client.get("/api/evidence/mine",headers=self.expert).json()["items"][0]["status"],"pending_review")

    def test_followup_cannot_be_sent_by_different_expert(self):
        self.assertEqual(self.request_more().status_code,200)
        # Session helper grants only one ID; forge an alternate current owner in the isolated DB.
        with sqlite3.connect(Path(self.fixture.tmp.name)/"test.sqlite") as conn:
            conn.execute("UPDATE sr_source_intake SET expert_id=? WHERE id=1",("expert-06",))
        self.assertEqual(self.clarification().status_code,404)
        self.assertEqual(self.client.get("/api/evidence/1/followups",headers=self.expert).status_code,404)

if __name__ == "__main__": unittest.main()

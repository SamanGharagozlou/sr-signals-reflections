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

if __name__ == "__main__": unittest.main()

from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import hashlib,sqlite3,tempfile,unittest
from contextlib import closing
from pathlib import Path
import httpx
from fastapi.testclient import TestClient
from app.services.live_provider_service import LiveListingClient,LiveSourceError,PRODUCTS,parse_clinics
from app.api.live_sources import create_live_app

HTML='''<html><div class="RadiologyMwebItemCard_title__test"><span>MRI KNEE JOINT SINGLE</span></div><div class="RadiologyTestsAtClinic_singleClinicCard__test"><div><h3>Synthetic Parser Clinic</h3><div><p>Synthetic test location</p></div></div><div><span>₹7,000</span></div></div></html>'''
ROOT=BACKEND_ROOT
class LivePublicTests(unittest.TestCase):
    def client(self,status=200,body=HTML,content_type='text/html'):
        def handle(request):
            self.assertEqual(request.url.host,'www.apollo247.com')
            self.assertNotIn('Authorization',request.headers)
            return httpx.Response(status,text=body,headers={'content-type':content_type})
        return LiveListingClient(httpx.MockTransport(handle))
    def test_parser_reads_provider_card_not_marketing_starting_price(self):
        rows=parse_clinics(HTML,PRODUCTS['mri-knee-single-hyderabad'])
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['published_amount_inr'],'7000.00')
        self.assertFalse(rows[0]['clinical_quote_verified']);self.assertIsNone(rows[0]['hospital_mapping'])
    def test_live_response_has_audit_provenance(self):
        result=self.client().fetch('mri-knee-single-hyderabad')
        self.assertEqual(result['source_sha256'],hashlib.sha256(HTML.encode()).hexdigest())
        self.assertEqual(result['data_mode'],'live_public_source')
        self.assertIn('+00:00',result['retrieved_at'])
    def test_blocked_and_ratelimited_sources_never_fallback(self):
        for status in [301,403,404,429,500]:
            with self.subTest(status=status),self.assertRaises(LiveSourceError):self.client(status=status).fetch('mri-knee-single-hyderabad')
    def test_heading_change_and_absent_cards_rejected(self):
        for body in [HTML.replace('MRI KNEE JOINT SINGLE','Other scan'),'<h1>MRI KNEE JOINT SINGLE</h1>',HTML.replace('₹7,000','Not quoted')]:
            with self.subTest(body=body),self.assertRaises(LiveSourceError):self.client(body=body).fetch('mri-knee-single-hyderabad')
    def test_wrong_content_type_and_oversized_document_rejected(self):
        with self.assertRaises(LiveSourceError):self.client(content_type='application/json').fetch('mri-knee-single-hyderabad')
        with self.assertRaises(LiveSourceError):self.client(body=HTML+' '*2000001).fetch('mri-knee-single-hyderabad')
    def test_network_failure_does_not_return_sample_prices(self):
        def fail(request):raise httpx.ConnectTimeout('synthetic failure')
        with self.assertRaises(LiveSourceError):LiveListingClient(httpx.MockTransport(fail)).fetch('mri-knee-single-hyderabad')
    def test_unknown_product_cannot_select_arbitrary_url(self):
        with self.assertRaises(ValueError):self.client().fetch('http://127.0.0.1/private')
    def test_api_audits_success_and_reports_missing_production_access(self):
        scratch=ROOT/'.scratch'/'live';scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temp:
            db=Path(temp)/'audit.sqlite'
            with TestClient(create_live_app(self.client(),db)) as client:
                self.assertEqual(client.get('/api/live/prices/mri-knee-single-hyderabad').status_code,200)
                self.assertFalse(client.get('/api/live/status').json()['sample_fallback'])
                self.assertEqual(client.get('/api/live/eligibility/status').json()['status'],'provider_access_required')
                self.assertEqual(client.get('/api/hospitals').status_code,404)
            with closing(sqlite3.connect(db)) as con:self.assertEqual(con.execute('SELECT count(*) FROM live_fetches').fetchone()[0],1)
    def test_api_source_failure_is_503_and_not_audited_as_success(self):
        scratch=ROOT/'.scratch'/'live';scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temp:
            db=Path(temp)/'audit.sqlite'
            with TestClient(create_live_app(self.client(status=403),db)) as client:
                self.assertEqual(client.get('/api/live/prices/mri-knee-single-hyderabad').status_code,503)
            self.assertFalse(db.exists())

if __name__=='__main__':unittest.main(verbosity=2)

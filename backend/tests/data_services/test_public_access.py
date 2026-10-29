from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import tempfile,unittest
from pathlib import Path
import httpx
from fastapi.testclient import TestClient
from app.services.live_provider_service import LiveListingClient
from app.public_main import create_public_app
from test_live_public import HTML

ROOT=BACKEND_ROOT
class PublicAccessTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'public-access';scratch.mkdir(parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=scratch)
        self.transport=httpx.MockTransport(lambda req:httpx.Response(200,text=HTML,headers={'content-type':'text/html'}))
        self.client=TestClient(create_public_app(LiveListingClient(self.transport),Path(self.temp.name)/'audit.sqlite'))
    def tearDown(self):self.client.close();self.temp.cleanup()
    def test_live_provider_filter_and_evidence(self):
        data=self.client.get('/api/live/providers?city=Hyderabad&name=Synthetic').json()
        self.assertEqual(data['total'],1);self.assertEqual(len(data['sources']),1)
        self.assertFalse(data['providers'][0]['clinical_quote_verified'])
    def test_budget_requires_exact_product(self):
        self.assertEqual(self.client.get('/api/live/providers?max_published_amount=8000').status_code,422)
        query='/api/live/providers?product_id=mri-knee-single-hyderabad&max_published_amount='
        self.assertEqual(self.client.get(query+'6999').json()['total'],0)
        self.assertEqual(self.client.get(query+'7000').json()['total'],1)
        self.assertEqual(self.client.get(query+'NaN').status_code,422)
    def test_exact_live_lookup_and_missing_provider(self):
        pid=self.client.get('/api/live/providers?city=Hyderabad').json()['providers'][0]['provider_id']
        response=self.client.get('/api/live/published-price/mri-knee-single-hyderabad/'+pid)
        self.assertEqual(response.status_code,200);self.assertEqual(response.json()['observation']['published_amount_inr'],'7000.00')
        self.assertEqual(self.client.get('/api/live/published-price/mri-knee-single-hyderabad/missing').status_code,404)
    def test_no_private_or_demo_eligibility_implied(self):
        data=self.client.get('/api/live/capabilities').json()
        self.assertFalse(data['sample_fallback']);self.assertFalse(data['patient_identifiers_accepted'])
        self.assertFalse(data['full_live_project_complete'])
        self.assertEqual(self.client.post('/api/live/eligibility/status',json={'patient_id':'synthetic'}).status_code,405)
        self.assertEqual(self.client.get('/api/hospitals').status_code,404)
    def test_city_product_mismatch_empty_without_fake_results(self):
        self.assertEqual(self.client.get('/api/live/providers?city=Bengaluru&product_id=mri-knee-single-hyderabad').json()['total'],0)

if __name__=='__main__':unittest.main(verbosity=2)

from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app.integration_preview import create_combined_app,DEFAULT_BACKEND

ROOT=BACKEND_ROOT
class CombinedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.application=create_combined_app(DEFAULT_BACKEND,ROOT/'.local'/'healthcare-directory-v3.sqlite')
    def setUp(self):self.client=TestClient(self.application)
    def tearDown(self):self.client.close()
    def test_original_health_unchanged(self):
        response=self.client.get('/api/health')
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['service'],'healthcare-agent-backend')
    def test_original_hospitals_keep_legacy_contract(self):
        data=self.client.get('/api/hospitals?city=Hyderabad').json()
        self.assertGreater(data['total'],0)
        self.assertEqual(data['data_mode'],'mock')
        self.assertIsInstance(data['hospitals'][0]['rating'],(int,float))
    def test_sourced_hospitals_keep_separate_provenance(self):
        data=self.client.get('/api/v2/data/hospitals?city=Hyderabad&specialty=Oncology&on_date=2026-10-29').json()
        self.assertEqual(data['total'],1)
        self.assertEqual(data['hospitals'][0]['provenance_status'],'sourced')
        self.assertNotIn('rating',data['hospitals'][0])
    def test_original_cost_and_new_unavailable_coexist(self):
        old=self.client.post('/api/cost-estimate',json={'procedure':'Angioplasty','city':'Hyderabad','room_type':'Semi-Private'})
        self.assertEqual(old.status_code,200);self.assertIn('average_cost',old.json())
        new=self.client.post('/api/v2/data/cost-estimate',json={'treatment_id':'treatment-mri-knee-single-plain','city':'Hyderabad','room_type':'Not Applicable','billing_unit':'per_scan','comparison_group':'single-knee-plain-no-sedation','on_date':'2026-10-29'})
        self.assertEqual(new.status_code,200);self.assertEqual(new.json()['status'],'unavailable')
    def test_original_chat_route_preserved(self):
        response=self.client.post('/api/chat',json={'message':'Find hospitals in Hyderabad','session_id':'integration-test'})
        self.assertEqual(response.status_code,200)
        self.assertIn('answer',response.json())
    def test_original_appointment_consent_preserved(self):
        response=self.client.post('/api/appointments/confirm',json={'hospital_id':'hosp-hyd-01','patient_name':'Synthetic Test','patient_phone':'+919999999999','specialty':'Cardiology','preferred_date':'2026-11-05','user_confirmed':False})
        self.assertEqual(response.status_code,400)
    def test_integration_status_is_honest(self):
        data=self.client.get('/integration/status').json()
        self.assertTrue(data['shared_server'])
        self.assertFalse(data['original_ui_uses_sourced_services'])
        self.assertFalse(data['original_agent_uses_sourced_services'])
    def test_schema_has_both_namespaces(self):
        paths=self.client.get('/openapi.json').json()['paths']
        for path in ['/api/chat','/api/hospitals','/api/v2/data/hospitals','/api/v2/data/cost-estimate','/integration/status']:
            self.assertIn(path,paths)
    def test_no_route_method_collisions(self):
        pairs=[]
        for route in self.application.routes:
            if hasattr(route,'methods'):
                pairs.extend((route.path,method) for method in route.methods)
        self.assertEqual(len(pairs),len(set(pairs)))
    def test_original_backend_missing_fails_clearly(self):
        with self.assertRaisesRegex(RuntimeError,'Original backend not found'):
            create_combined_app(ROOT/'does-not-exist')

if __name__=='__main__':unittest.main(verbosity=2)

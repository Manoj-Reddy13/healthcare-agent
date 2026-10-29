from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app.services.data_store import import_bundle
from app.api.data_routes import create_app
from app.services.price_service import create_snapshot
from test_price_extension import fixture,sign
from test_scheme_rules import policy

ROOT=BACKEND_ROOT

class ApiTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'api-tests';scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch)
        self.base=Path(self.tmp.name)/'base.sqlite'
        import_bundle(DATA_ROOT,self.base)
        self.client=TestClient(create_app(self.base))
        self.payload={'treatment_id':'treatment-mri-knee-single-plain','city':'Hyderabad','room_type':'Not Applicable','billing_unit':'per_scan','comparison_group':'single-knee-plain-no-sedation','on_date':'2026-10-29'}
    def tearDown(self):self.client.close();self.tmp.cleanup()
    def test_health_and_sourced_hospitals(self):
        self.assertEqual(self.client.get('/api/v2/data/health').status_code,200)
        data=self.client.get('/api/v2/data/hospitals').json()
        self.assertEqual(data['total'],2)
        self.assertTrue(all(h['provenance_status']=='sourced' for h in data['hospitals']))
    def test_bangalore_alias_and_pagination(self):
        self.assertEqual(self.client.get('/api/v2/data/hospitals',params={'city':'Bangalore'}).json()['total'],1)
        result=self.client.get('/api/v2/data/hospitals',params={'limit':1,'offset':1}).json()
        self.assertEqual(result['total'],2);self.assertEqual(len(result['hospitals']),1)
    def test_unknown_city_empty(self):
        self.assertEqual(self.client.get('/api/v2/data/hospitals',params={'city':'Delhi'}).json()['total'],0)
    def test_sql_input_does_not_expand_results(self):
        self.assertEqual(self.client.get('/api/v2/data/hospitals',params={'city':"' OR 1=1 --"}).json()['total'],0)
    def test_unsupported_filters_not_ignored(self):
        for params in [{'specialty':'Cardiology'},{'scheme':'PM-JAY'},{'max_budget_inr':'5000.00'},{'treatment_id':'MRI'},{'limit':101}]:
            with self.subTest(params=params):self.assertEqual(self.client.get('/api/v2/data/hospitals',params=params).status_code,422)
    def test_base_has_no_fabricated_cost(self):
        result=self.client.post('/api/v2/data/cost-estimate',json=self.payload)
        self.assertEqual(result.status_code,200);self.assertEqual(result.json()['status'],'unavailable')
    def test_invalid_requests_rejected(self):
        for change in [{'room_type':'Suite'},{'on_date':'yesterday'},{'city':''},{'treatment_id':' '},{'billing_unit':'per_week'},{'unrecognized':1}]:
            with self.subTest(change=change):self.assertEqual(self.client.post('/api/v2/data/cost-estimate',json=self.payload|change).status_code,422)
    def test_schema_and_treatment_catalog(self):
        self.assertEqual(self.client.get('/openapi.json').status_code,200)
        data=self.client.get('/api/v2/data/treatments').json()
        self.assertEqual(len(data['families']),6);self.assertEqual(len(data['treatments']),1)
    def test_schemes_no_fake_entitlement(self):
        self.assertEqual(self.client.get('/api/v2/data/schemes').json()['total'],0)
        self.assertEqual(self.client.post('/api/v2/data/schemes/missing/match',json={}).status_code,404)
    def test_missing_database_returns_503_without_creation(self):
        missing=Path(self.tmp.name)/'missing.sqlite'
        with TestClient(create_app(missing)) as client:
            result=client.get('/api/v2/data/health')
            self.assertEqual(result.status_code,503)
            self.assertNotIn(str(missing),result.text)
        self.assertFalse(missing.exists())
    def test_synthetic_price_http_journey(self):
        snapshot=Path(self.tmp.name)/'priced.sqlite'
        create_snapshot(self.base,snapshot,sign(fixture()),'2026-10-29')
        with TestClient(create_app(snapshot)) as client:
            estimate=client.post('/api/v2/data/cost-estimate',json=self.payload).json()
            self.assertEqual(estimate['maximum_inr'],'2000.00')
            query=self.payload|{'max_budget_inr':'2000.00'}
            self.assertEqual(client.get('/api/v2/data/hospitals',params=query).json()['total'],1)
            query['max_budget_inr']='1500.00'
            self.assertEqual(client.get('/api/v2/data/hospitals',params=query).json()['total'],0)
            query['max_budget_inr']='NaN'
            self.assertEqual(client.get('/api/v2/data/hospitals',params=query).status_code,422)
    def test_synthetic_policy_http_journey(self):
        with TestClient(create_app(self.base,[policy()])) as client:
            route='/api/v2/data/schemes/synthetic-only/match'
            result=client.post(route,json={'answers':{'state':'TS','age':72},'on_date':'2026-10-29'})
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.json()['status'],'potentially_applicable')
            self.assertEqual(client.post(route,json={'answers':{'state':'TS'},'on_date':'2026-10-29'}).json()['status'],'needs_information')
    def test_original_routes_not_claimed(self):
        self.assertEqual(self.client.post('/api/chat',json={'message':'hello'}).status_code,404)
    def test_cors_local_frontend(self):
        response=self.client.options('/api/v2/data/hospitals',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'GET'})
        self.assertEqual(response.headers.get('access-control-allow-origin'),'http://localhost:5173')

if __name__=='__main__':unittest.main(verbosity=2)

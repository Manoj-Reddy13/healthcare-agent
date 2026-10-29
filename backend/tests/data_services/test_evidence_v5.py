from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import copy,json,tempfile,unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app.api.evidence_routes import create_evidence_app,load_evidence,app_factory

ROOT=BACKEND_ROOT
class EvidenceTests(unittest.TestCase):
    def setUp(self):self.client=TestClient(create_evidence_app())
    def tearDown(self):self.client.close()
    def test_published_prices_preserve_real_provider_identity(self):
        result=self.client.get('/api/v3/evidence/prices').json()
        self.assertEqual(result['total'],3)
        self.assertEqual([r['amount_inr'] for r in result['observations']],['7000.00','7100.00','7100.00'])
        for row in result['observations']:
            self.assertIsNone(row['mapped_hospital_id'])
            self.assertFalse(row['estimator_eligible'])
            self.assertIsNone(row['contrast']);self.assertIsNone(row['valid_to'])
    def test_filters_do_not_invent_hospital_mapping(self):
        self.assertEqual(self.client.get('/api/v3/evidence/prices?provider_name=Kondapur').json()['total'],1)
        self.assertEqual(self.client.get('/api/v3/evidence/prices?provider_name=Jubilee').json()['total'],0)
        self.assertEqual(self.client.get('/api/v3/evidence/prices?city=Bengaluru').json()['total'],0)
    def test_age_screen_never_confirms_entitlement(self):
        route='/api/v3/evidence/pmjay/senior-path-screen'
        cases=[({},'needs_information'),({'age':69},'other_path_may_apply'),({'age':70},'potential_senior_path_candidate'),({'age':90},'potential_senior_path_candidate')]
        for payload,status in cases:
            with self.subTest(payload=payload):
                response=self.client.post(route,json=payload)
                self.assertEqual(response.status_code,200)
                self.assertEqual(response.json()['status'],status)
                self.assertFalse(response.json()['entitlement_confirmed'])
                self.assertEqual(response.json()['policy_source_as_of'],'2026-02-06')
    def test_invalid_age_types_and_extra_patient_details_rejected(self):
        for payload in [{'age':True},{'age':'70'},{'age':70.5},{'age':-1},{'age':131},{'age':70,'patient_id':'secret'}]:
            with self.subTest(payload=payload):self.assertEqual(self.client.post('/api/v3/evidence/pmjay/senior-path-screen',json=payload).status_code,422)
    def test_policy_fact_sources_resolve(self):
        response=self.client.get('/api/v3/evidence/policies').json()
        sources={s['source_id'] for s in response['sources']}
        self.assertTrue(all(f['source_id'] in sources for f in response['facts']))
    def test_observation_cannot_be_silently_promoted(self):
        doc=copy.deepcopy(load_evidence());doc['price_observations'][0]['estimator_eligible']=True
        scratch=ROOT/'.scratch'/'evidence-tests';scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temp:
            path=Path(temp)/'bad.json';path.write_text(json.dumps(doc),encoding='utf-8')
            with self.assertRaises(ValueError):load_evidence(path)
    def test_all_three_namespaces_coexist(self):
        with TestClient(app_factory()) as client:
            paths=client.get('/openapi.json').json()['paths']
            for path in ['/api/hospitals','/api/v2/data/hospitals','/api/v3/evidence/prices']:self.assertIn(path,paths)
            self.assertEqual(client.get('/api/v2/data/schemes').json()['total'],0)

if __name__=='__main__':unittest.main(verbosity=2)

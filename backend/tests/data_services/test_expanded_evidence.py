from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import copy,json,tempfile,unittest
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.treatment_references import load_guides,guides_router,coverage,app_factory

ROOT=BACKEND_ROOT
class ExpandedEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.doc=load_guides();app=FastAPI();app.include_router(guides_router(self.doc));self.client=TestClient(app)
    def tearDown(self):self.client.close()
    def test_reference_counts_and_partial_coverage(self):
        result=coverage(self.doc)
        self.assertEqual(result['record_count'],14);self.assertEqual(result['source_count'],7)
        self.assertEqual(len(result['families']),6);self.assertTrue(result['all_reference_families_present'])
        self.assertFalse(result['complete_cost_dataset']);self.assertTrue(all(not f['complete'] for f in result['families']))
    def test_scheme_fee_is_not_default_cash_guidance(self):
        result=self.client.get('/api/v3/evidence/treatment-guides').json()
        self.assertEqual(result['total'],13)
        self.assertFalse(any(r['value_kind']=='scheme_tariff_reference' for r in result['records']))
        result=self.client.get('/api/v3/evidence/treatment-guides?family=consultation&include_scheme_references=true').json()
        self.assertEqual(result['total'],1);self.assertIn('CGHS',result['records'][0]['context'])
    def test_city_alias_and_brain_product_context(self):
        result=self.client.get('/api/v3/evidence/treatment-guides?family=mri&city=Bangalore').json()
        self.assertEqual(result['total'],5)
        self.assertTrue(all('Brain' in r['context'] for r in result['records']))
    def test_conflicting_figures_stay_separate(self):
        result=self.client.get('/api/v3/evidence/references/knee-hyd-average-guide').json()
        self.assertEqual(result['record']['minimum_inr'],'180000.00')
        self.assertEqual(result['related_records'][0]['minimum_inr'],'160000.00')
        self.assertNotIn('average_cost',result)
    def test_filters_and_unknown_reference(self):
        self.assertEqual(self.client.get('/api/v3/evidence/treatment-guides?city=Delhi').json()['total'],0)
        self.assertEqual(self.client.get('/api/v3/evidence/treatment-guides?family=unknown').status_code,422)
        self.assertEqual(self.client.get('/api/v3/evidence/references/missing').status_code,404)
    def test_invalid_bounds_and_false_mapping_rejected(self):
        scratch=ROOT/'.scratch'/'guides';scratch.mkdir(parents=True,exist_ok=True)
        for key,value in [('maximum_inr','1.00'),('mapped_hospital_id','hospital-hyd-001'),('estimator_eligible',True),('valid_to','2027-01-01')]:
            doc=copy.deepcopy(self.doc);doc['records'][0][key]=value
            with self.subTest(key=key),tempfile.TemporaryDirectory(dir=scratch) as temp:
                path=Path(temp)/'bad.json';path.write_text(json.dumps(doc))
                with self.assertRaises(ValueError):load_guides(path)
    def test_all_namespaces_and_old_endpoints_preserved(self):
        with TestClient(app_factory()) as client:
            self.assertEqual(client.get('/api/health').status_code,200)
            self.assertEqual(client.get('/api/v3/evidence/prices').json()['total'],3)
            self.assertEqual(client.get('/api/v3/evidence/coverage').json()['record_count'],14)
            self.assertEqual(client.get('/api/v2/data/schemes').json()['total'],0)
    def test_scheme_fee_cannot_be_reclassified_as_cash(self):
        doc=copy.deepcopy(self.doc);doc['records'][-1]['value_kind']='guide_point'
        scratch=ROOT/'.scratch'/'guides';scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temp:
            path=Path(temp)/'bad.json';path.write_text(json.dumps(doc))
            with self.assertRaises(ValueError):load_guides(path)

if __name__=='__main__':unittest.main(verbosity=2)

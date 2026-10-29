from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import copy
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from app.services.data_store import import_bundle
from app.services.price_service import create_snapshot, fingerprint, PriceService, validate_prices

ROOT=BACKEND_ROOT
DATA=DATA_ROOT
TODAY='2026-10-29'

def fixture():
    return {'version':1,'purpose':'self_pay','batch_id':'synthetic-test-only','sources':[{'source_id':'test-source','url':'https://example.org/synthetic-test-only','publisher':'Synthetic fixture','title':'Synthetic test tariff','source_type':'official_hospital','accessed_on':TODAY}],
        'prices':[{'price_id':'test-price','hospital_id':'hospital-hyd-001','treatment_id':'treatment-mri-knee-single-plain','source_id':'test-source','price_basis':'published_tariff','currency':'INR','minimum_inr':'1000.00','maximum_inr':'2000.00','room_type':'Not Applicable','billing_unit':'per_scan','comparison_group':'single-knee-plain-no-sedation','valid_from':'2026-01-01','valid_to':'2027-01-01','refresh_by':'2026-12-01','observed_on':TODAY,'source_locator':'Synthetic fixture, not a real price','inclusions':['scan'],'exclusions':['sedation'],'scope_reviewed':True}]}

def sign(doc):
    doc.pop('review',None)
    doc['review']={'reviewer':'Synthetic test reviewer','reviewed_on':TODAY,'decision':'accepted','content_sha256':fingerprint(doc)}
    return doc

class PriceTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'price-extension-tests';scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch)
        self.base=Path(self.tmp.name)/'base.sqlite';self.dest=Path(self.tmp.name)/'snapshot.sqlite'
        import_bundle(DATA,self.base)
        self.doc=sign(fixture())
    def tearDown(self):self.tmp.cleanup()
    def service(self):
        create_snapshot(self.base,self.dest,self.doc,TODAY)
        return PriceService(self.dest)
    def estimate(self,service,**overrides):
        args=dict(treatment_id='treatment-mri-knee-single-plain',city='Hyderabad',room_type='Not Applicable',billing_unit='per_scan',comparison_group='single-knee-plain-no-sedation',on_date=TODAY)
        args.update(overrides);return service.estimate(**args)
    def test_original_unchanged_and_exact_range(self):
        original=self.base.read_bytes();service=self.service()
        result=self.estimate(service)
        self.assertEqual((result['minimum_inr'],result['maximum_inr']),('1000.00','2000.00'))
        self.assertEqual(result['evidence'][0]['source_id'],'test-source')
        self.assertEqual(self.base.read_bytes(),original)
    def test_existing_destination_not_overwritten(self):
        self.dest.write_bytes(b'preserve')
        with self.assertRaises(ValueError):self.service()
        self.assertEqual(self.dest.read_bytes(),b'preserve')
    def test_original_cannot_be_destination(self):
        with self.assertRaises(ValueError):create_snapshot(self.base,self.base,self.doc,TODAY)
    def test_review_digest_detects_price_tampering(self):
        self.doc['prices'][0]['maximum_inr']='1.00'
        with self.assertRaises(ValueError):self.service()
        self.assertFalse(self.dest.exists())
    def test_invalid_rows_rejected_before_creation(self):
        changes=[('price_basis','scheme_package'),('maximum_inr','999.99'),('minimum_inr','NaN'),('minimum_inr','1.001'),('currency','USD'),('hospital_id','missing'),('treatment_id','missing'),('source_id','missing'),('refresh_by','2026-01-01'),('valid_to','2025-01-01'),('scope_reviewed',False),('source_locator','')]
        for field,value in changes:
            with self.subTest(field=field):
                doc=fixture();doc['prices'][0][field]=value;sign(doc)
                with self.assertRaises(ValueError):create_snapshot(self.base,self.dest,doc,TODAY)
                self.assertFalse(self.dest.exists())
    def test_duplicate_price_rejected(self):
        self.doc['prices'].append(copy.deepcopy(self.doc['prices'][0]));sign(self.doc)
        with self.assertRaises(ValueError):self.service()
    def test_unsigned_review_rejected(self):
        self.doc.pop('review')
        with self.assertRaises(ValueError):self.service()
    def test_declined_review_rejected(self):
        self.doc['review']['decision']='pending'
        with self.assertRaises(ValueError):self.service()
    def test_scheme_document_rejected(self):
        self.doc['purpose']='scheme_tariff';sign(self.doc)
        with self.assertRaises(ValueError):self.service()
    def test_unknown_city_treatment_and_room_no_fallback(self):
        service=self.service()
        for change in [dict(city='Delhi'),dict(treatment_id='surgery'),dict(room_type='ICU'),dict(billing_unit='per_day'),dict(comparison_group='different-implant')]:
            with self.subTest(change=change):self.assertEqual(self.estimate(service,**change)['status'],'unavailable')
    def test_expiry_refresh_and_boundaries(self):
        service=self.service()
        self.assertEqual(self.estimate(service,on_date='2026-12-02')['status'],'unavailable')
        self.assertEqual(self.estimate(service,on_date='2025-12-31')['status'],'unavailable')
        self.assertEqual(self.estimate(service,on_date='2026-12-01')['status'],'estimated')
    def test_budget_uses_upper_bound_and_requested_treatment(self):
        service=self.service()
        args=('treatment-mri-knee-single-plain','Hyderabad','Not Applicable','per_scan','single-knee-plain-no-sedation')
        self.assertEqual(service.search_with_budget(*args,'1500.00',TODAY)['total'],0)
        self.assertEqual(service.search_with_budget(*args,'2000.00',TODAY)['total'],1)
        self.assertEqual(service.search_with_budget('surgery',*args[1:],'999999.00',TODAY)['total'],0)
    def test_missing_database_not_created(self):
        missing=Path(self.tmp.name)/'missing.sqlite'
        with self.assertRaises(sqlite3.OperationalError):validate_prices(self.doc,missing,TODAY)
        self.assertFalse(missing.exists())
    def test_empty_batch_preserves_unavailability(self):
        self.doc['prices']=[];self.doc['sources']=[];sign(self.doc)
        self.assertEqual(self.estimate(self.service())['status'],'unavailable')

if __name__=='__main__':unittest.main(verbosity=2)

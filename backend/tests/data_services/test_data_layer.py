from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Member 4 checks. Synthetic test prices never enter the delivered database."""
import copy
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from app.services.data_store import DataService, connect, import_bundle, load_bundle, money, validate

DATA=DATA_ROOT

class DataLayerTests(unittest.TestCase):
    def setUp(self):
        scratch=BACKEND_ROOT/'.scratch'/'data-layer-tests'
        scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch)
        self.db=Path(self.tmp.name)/'test.sqlite'
        self.bundle=load_bundle(DATA)[0]
    def tearDown(self):
        self.tmp.cleanup()
    def seed(self):
        return import_bundle(DATA,self.db)
    def test_pilot_validates(self):
        self.assertEqual(validate(self.bundle)['hospitals'],2)
    def test_repeat_import_has_no_duplicates(self):
        self.assertEqual(self.seed()['status'],'imported')
        self.assertEqual(self.seed()['status'],'already_imported')
        with connect(self.db) as con:
            self.assertEqual(con.execute('SELECT count(*) FROM hospitals').fetchone()[0],2)
    def test_duplicate_source_rejected(self):
        self.bundle['sources-v2.json'].append(copy.deepcopy(self.bundle['sources-v2.json'][0]))
        with self.assertRaises(ValueError):validate(self.bundle)
    def test_missing_claim_evidence_rejected(self):
        self.bundle['pilot-data.json']['evidence']=[]
        with self.assertRaises(ValueError):validate(self.bundle)
    def test_orphan_city_rejected(self):
        self.bundle['pilot-data.json']['hospitals'][0]['city_id']='missing'
        with self.assertRaises(ValueError):validate(self.bundle)
    def test_tariff_cannot_bypass_review(self):
        self.bundle['scheme-tariffs-v2.json']['records'][0]['release_status']='approved'
        with self.assertRaises(ValueError):validate(self.bundle)
    def test_unsupported_data_not_silently_dropped(self):
        self.bundle['pilot-data.json']['schemes']=[{'scheme_id':'new'}]
        with self.assertRaises(ValueError):validate(self.bundle)
    def test_exact_money(self):
        self.assertEqual(money('2550.00'),255000)
        for value in ['NaN','Infinity','-1.00','1.001',1.25]:
            with self.subTest(value=value),self.assertRaises(ValueError):money(value)
    def test_city_alias_and_unknown_city(self):
        self.seed();service=DataService(self.db)
        self.assertEqual(len(service.search_hospitals(' Bangalore ')),1)
        self.assertEqual(service.search_hospitals('Delhi'),[])
    def test_tariff_is_never_self_pay_estimate(self):
        self.seed()
        self.assertEqual(DataService(self.db).estimate_cost('treatment-mri-knee-single-plain','Hyderabad','Semi-Private')['status'],'unavailable')
    def test_unreviewed_policies_do_not_confirm_eligibility(self):
        self.seed();result=DataService(self.db).find_schemes()
        self.assertEqual(result['status'],'needs_information')
        self.assertEqual(result['candidates'],[])
    def test_foreign_keys_enforced(self):
        self.seed()
        with connect(self.db) as con,self.assertRaises(sqlite3.IntegrityError):
            con.execute("INSERT INTO tariff_cities VALUES ('missing','city-hyd')")
    def test_new_bundle_requires_new_database(self):
        self.seed();destination=Path(self.tmp.name)/'changed';destination.mkdir()
        for name,value in self.bundle.items():
            (destination/name).write_text(json.dumps(value),encoding='utf-8')
        with self.assertRaises(ValueError):import_bundle(destination,self.db)
        with connect(self.db) as con:
            self.assertEqual(con.execute('SELECT count(*) FROM hospitals').fetchone()[0],2)
    def insert_price(self,con,price_id='fixture',reviewed=1,unit='per_scan'):
        con.execute('INSERT INTO self_pay_prices VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            (price_id,'hospital-hyd-001','treatment-mri-knee-single-plain','source-001',100000,200000,'Semi-Private',unit,'2026-01-01','2027-01-01',reviewed,'{}'))
    def test_prices_exclude_expired_unreviewed_wrong_room(self):
        self.seed();service=DataService(self.db)
        with connect(self.db) as con:self.insert_price(con,reviewed=0)
        self.assertEqual(service.estimate_cost('treatment-mri-knee-single-plain','Hyderabad','Semi-Private','2026-10-29')['status'],'unavailable')
        with connect(self.db) as con:con.execute('UPDATE self_pay_prices SET reviewed=1')
        self.assertEqual(service.estimate_cost('treatment-mri-knee-single-plain','Hyderabad','ICU','2026-10-29')['status'],'unavailable')
        self.assertEqual(service.estimate_cost('treatment-mri-knee-single-plain','Hyderabad','Semi-Private','2027-01-01')['status'],'unavailable')
        result=service.estimate_cost('treatment-mri-knee-single-plain','Hyderabad','Semi-Private','2026-10-29')
        self.assertEqual((result['minimum_inr'],result['maximum_inr']),('1000','2000'))
    def test_incompatible_units_not_combined(self):
        self.seed()
        with connect(self.db) as con:
            self.insert_price(con)
            self.insert_price(con,'daily',unit='per_day')
        self.assertEqual(DataService(self.db).estimate_cost('treatment-mri-knee-single-plain','Hyderabad','Semi-Private','2026-10-29')['status'],'needs_information')
    def test_failed_validation_does_not_create_database(self):
        folder=Path(self.tmp.name)/'bad';folder.mkdir()
        self.bundle['pilot-data.json']['hospitals'][0]['city_id']='missing'
        for name,value in self.bundle.items():(folder/name).write_text(json.dumps(value),encoding='utf-8')
        with self.assertRaises(ValueError):import_bundle(folder,self.db)
        self.assertFalse(self.db.exists())

if __name__=='__main__':unittest.main(verbosity=2)

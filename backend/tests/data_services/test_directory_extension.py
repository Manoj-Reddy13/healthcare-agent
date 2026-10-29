from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import copy,json,tempfile,unittest
from pathlib import Path
from app.services.directory_service import add_directory,search_specialty
from app.services.data_store import import_bundle
from app.api.data_routes import create_app
from fastapi.testclient import TestClient

ROOT=BACKEND_ROOT
class DirectoryTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'directory-tests';scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch)
        self.base=Path(self.tmp.name)/'base.sqlite';self.dest=Path(self.tmp.name)/'directory.sqlite'
        import_bundle(DATA_ROOT,self.base)
        self.rows=json.loads((DATA_ROOT/'hospital-specialties-v3.json').read_text())
    def tearDown(self):self.tmp.cleanup()
    def test_specialty_city_and_original_preservation(self):
        before=self.base.read_bytes();add_directory(self.base,self.dest,self.rows)
        self.assertEqual(len(search_specialty(self.dest,'Cardiac Sciences','2026-10-29')),2)
        self.assertEqual(len(search_specialty(self.dest,'Cardiology','2026-10-29','Bangalore')),1)
        self.assertEqual(self.base.read_bytes(),before)
    def test_expired_and_uncollected_relationships_not_used(self):
        add_directory(self.base,self.dest,self.rows)
        for day in ['2027-01-28','2026-10-28']:
            self.assertEqual(search_specialty(self.dest,'Oncology',day),[])
    def test_invalid_reference_and_duplicate_rejected(self):
        for invalid in [self.rows+[copy.deepcopy(self.rows[0])],[dict(self.rows[0],source_id='missing')]]:
            with self.assertRaises(ValueError):add_directory(self.base,self.dest,invalid)
            self.assertFalse(self.dest.exists())
    def test_existing_destination_preserved(self):
        self.dest.write_bytes(b'preserve')
        with self.assertRaises(ValueError):add_directory(self.base,self.dest,self.rows)
        self.assertEqual(self.dest.read_bytes(),b'preserve')
    def test_api_specialty_search_and_scheme_not_faked(self):
        add_directory(self.base,self.dest,self.rows)
        with TestClient(create_app(self.dest)) as client:
            result=client.get('/api/v2/data/hospitals',params={'city':'Hyderabad','specialty':'Oncology','on_date':'2026-10-29'})
            self.assertEqual(result.status_code,200);self.assertEqual(result.json()['total'],1)
            self.assertIn('specialty_evidence',result.json()['hospitals'][0])
            self.assertEqual(client.get('/api/v2/data/hospitals',params={'scheme':'PM-JAY'}).status_code,422)

if __name__=='__main__':unittest.main(verbosity=2)

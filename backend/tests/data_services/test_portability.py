from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import json,sqlite3,tempfile,unittest
from pathlib import Path
from scripts.rebuild import rebuild

ROOT=BACKEND_ROOT
class PortabilityTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'portability';scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch);self.folder=Path(self.tmp.name)/'snapshots'
    def tearDown(self):self.tmp.cleanup()
    def test_rebuild_is_repeatable(self):
        self.assertEqual(rebuild(self.folder)['status'],'built')
        self.assertEqual(rebuild(self.folder)['status'],'already_built')
    def test_source_files_unchanged(self):
        before={p.name:p.read_bytes() for p in (DATA_ROOT).glob('*.json')}
        rebuild(self.folder)
        self.assertEqual(before,{p.name:p.read_bytes() for p in (DATA_ROOT).glob('*.json')})
    def test_generated_snapshot_has_no_cash_prices(self):
        result=rebuild(self.folder)
        con=sqlite3.connect(result['directory'])
        try:
            self.assertEqual(con.execute('SELECT count(*) FROM self_pay_prices').fetchone()[0],0)
            self.assertEqual(con.execute('SELECT count(*) FROM directory_specialties_v3').fetchone()[0],8)
        finally:con.close()
    def test_source_fingerprint_is_stable(self):
        first=rebuild(self.folder);second=rebuild(self.folder)
        self.assertEqual(first['source_fingerprint'],second['source_fingerprint'])

if __name__=='__main__':unittest.main(verbosity=2)

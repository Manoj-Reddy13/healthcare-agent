from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import json,tempfile,unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app.services.price_service import create_snapshot
from app.services.directory_service import add_directory
from app.api.data_routes import create_app
from test_price_extension import fixture,sign

ROOT=BACKEND_ROOT
class AdvancedSearchTests(unittest.TestCase):
    def test_specialty_and_budget_must_both_match(self):
        scratch=ROOT/'.scratch'/'advanced-search';scratch.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as temp:
            priced=Path(temp)/'priced.sqlite';directory=Path(temp)/'directory.sqlite'
            create_snapshot(ROOT/'.local'/'healthcare-pilot.sqlite',priced,sign(fixture()),'2026-10-29')
            add_directory(priced,directory,json.loads((DATA_ROOT/'hospital-specialties-v3.json').read_text()))
            query={'treatment_id':'treatment-mri-knee-single-plain','city':'Hyderabad','room_type':'Not Applicable','billing_unit':'per_scan','comparison_group':'single-knee-plain-no-sedation','on_date':'2026-10-29','max_budget_inr':'2000.00','specialty':'Oncology'}
            with TestClient(create_app(directory)) as client:
                self.assertEqual(client.get('/api/v2/data/hospitals',params=query).json()['total'],1)
                query['specialty']='Uncollected specialty'
                self.assertEqual(client.get('/api/v2/data/hospitals',params=query).json()['total'],0)
                query['specialty']='Oncology';query['max_budget_inr']='1500.00'
                self.assertEqual(client.get('/api/v2/data/hospitals',params=query).json()['total'],0)

if __name__=='__main__':unittest.main(verbosity=2)

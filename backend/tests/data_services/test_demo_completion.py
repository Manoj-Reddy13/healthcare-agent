from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import importlib,json,sqlite3,tempfile,unittest
from contextlib import closing
from decimal import Decimal
from pathlib import Path
from fastapi.testclient import TestClient
from app.services.demo_data_service import build_demo_database,DemoService
from app.demo_main import create_demo_app,database_tool_bridge

ROOT=BACKEND_ROOT
class DemoCompletionTests(unittest.TestCase):
    def setUp(self):
        scratch=ROOT/'.scratch'/'demo-completion';scratch.mkdir(parents=True,exist_ok=True)
        self.tmp=tempfile.TemporaryDirectory(dir=scratch)
        self.db=build_demo_database(Path(self.tmp.name)/'demo.sqlite')
        self.service=DemoService(self.db)
    def tearDown(self):self.tmp.cleanup()
    def test_normalized_database_and_repeat_build(self):
        self.assertEqual(build_demo_database(self.db),self.db)
        with closing(sqlite3.connect(self.db)) as con:
            self.assertEqual(con.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(con.execute('PRAGMA foreign_key_check').fetchall(),[])
            self.assertEqual(con.execute('SELECT count(*) FROM treatments').fetchone()[0],6)
            self.assertEqual(con.execute('SELECT count(*) FROM hospitals').fetchone()[0],6)
    def test_all_treatments_and_both_cities_return_demo_estimates(self):
        for treatment in self.service.catalog():
            for city in ['Hyderabad','Bangalore']:
                with self.subTest(treatment=treatment['id'],city=city):
                    result=self.service.estimate(treatment['id'],city)
                    self.assertEqual(result['data_mode'],'mock')
                    self.assertGreaterEqual(result['indicative_range_min'],0)
                    self.assertGreater(result['indicative_range_max'],0)
                    total=sum(Decimal(str(r['amount_inr'])) for r in result['breakdown'])
                    self.assertEqual(total,Decimal(str(result['average_cost'])))
    def test_budget_uses_requested_procedure_not_consultation(self):
        self.assertTrue(self.service.hospitals(city='Hyderabad',procedure='Doctor Consultation',max_budget=1000))
        self.assertEqual(self.service.hospitals(city='Hyderabad',procedure='Angioplasty',max_budget=1000),[])
        with self.assertRaises(ValueError):self.service.hospitals(max_budget=1000)
    def test_specialty_scheme_city_filters(self):
        result=self.service.hospitals(city='Hyderabad',specialty='Cardiology',scheme='PM-JAY')
        self.assertTrue(result)
        self.assertTrue(all(h['data_mode']=='mock' and h['verified'] is False for h in result))
        self.assertEqual(self.service.hospitals(city='Delhi'),[])
    def test_unknown_treatment_and_wrong_facility_rejected(self):
        with self.assertRaises(ValueError):self.service.estimate('Unknown operation')
        with self.assertRaises(ValueError):self.service.estimate('Angioplasty',hospital_id='missing')
    def test_city_room_facility_costs_and_state_scheme_filters(self):
        general=self.service.estimate('Angioplasty',room_type='General Ward')
        icu=self.service.estimate('Angioplasty',room_type='ICU')
        self.assertLess(general['average_cost'],icu['average_cost'])
        self.assertEqual(self.service.estimate('Angioplasty',hospital_id='hosp-hyd-01')['observation_count'],1)
        self.assertNotIn('scheme-aarogyasri',{s['id'] for s in self.service.schemes(state='Karnataka')})
    def test_demo_scheme_missing_and_matching_profiles(self):
        self.assertEqual(self.service.match_scheme('PM-JAY',{})['status'],'needs_information')
        result=self.service.match_scheme('PM-JAY',{'age':70})
        self.assertEqual(result['status'],'potential_demo_match');self.assertFalse(result['entitlement_confirmed'])
        result=self.service.match_scheme('Aarogyasri',{'state':'Karnataka','food_security_card':True,'annual_income_inr':1000})
        self.assertEqual(result['status'],'demo_criteria_not_met')
    def test_fictional_insurance_arithmetic_and_network(self):
        result=self.service.insurance('hosp-hyd-01','Cardiology','100000.00')
        self.assertGreater(result['total'],0)
        for match in result['matches']:
            self.assertFalse(match['authorization_confirmed'])
            self.assertEqual(match['simulated_reimbursement_inr']+match['simulated_out_of_pocket_inr'],100000)
        self.assertEqual(self.service.insurance('hosp-hyd-01','Unsupported','1000')['total'],0)
    def test_legacy_http_contracts_and_new_demo_endpoints(self):
        with TestClient(create_demo_app(self.db)) as client:
            self.assertTrue(client.get('/api/health').json()['database_backed'])
            self.assertEqual(client.get('/api/hospitals').json()['total'],6)
            self.assertEqual(client.get('/api/demo/treatments').json()['data_mode'],'mock')
            result=client.post('/api/cost-estimate',json={'procedure':'MRI Scan','city':'Hyderabad','room_type':'Semi-Private'})
            self.assertEqual(result.status_code,200);self.assertEqual(result.json()['data_mode'],'mock')
            self.assertEqual(client.post('/api/demo/insurance/match',json={'hospital_id':'hosp-hyd-01','specialty':'Cardiology','cost_inr':'100000.00'}).status_code,200)
            self.assertEqual(client.post('/api/demo/schemes/scheme-pmjay/match',json={'profile':{'age':70}}).json()['status'],'potential_demo_match')
    def test_original_agent_really_reads_demo_database_and_bridge_restores(self):
        app=create_demo_app(self.db)
        dispatcher=importlib.import_module('app.agent.tools').TOOL_DISPATCHER;before=dict(dispatcher)
        with closing(sqlite3.connect(self.db)) as con:
            con.execute("UPDATE prices SET paise=1234500 WHERE treatment_id='angioplasty'");con.commit()
        with TestClient(app) as client:
            response=client.post('/api/chat',json={'message':'What is the cost of angioplasty in Hyderabad?'})
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.json()['cost_estimate']['average_cost'],12345)
            self.assertIn('DEMO DATA',response.json()['answer'])
        self.assertEqual(dispatcher,before)
    def test_emergency_and_appointment_confirmation_preserved(self):
        with TestClient(create_demo_app(self.db)) as client:
            result=client.post('/api/chat',json={'message':'severe chest pain'}).json()
            self.assertTrue(result['emergency_detected']);self.assertEqual(result['tool_calls'],[])
            appointment={'hospital_id':'hosp-hyd-01','patient_name':'Synthetic Test','patient_phone':'+919999999999','specialty':'Cardiology','preferred_date':'2026-11-05','user_confirmed':False}
            self.assertEqual(client.post('/api/appointments/confirm',json=appointment).status_code,400)
            appointment['user_confirmed']=True
            self.assertTrue(client.post('/api/appointments/confirm',json=appointment).json()['is_simulated'])
    def test_unsupported_cost_chat_is_explicit_not_fake(self):
        with TestClient(create_demo_app(self.db)) as client:
            result=client.post('/api/chat',json={'message':'cost of a cardiology procedure'}).json()
            self.assertIn('Unsupported demo procedure',result['answer']);self.assertIsNone(result['cost_estimate'])
    def test_bridge_rejects_multiple_demo_apps_in_one_process(self):
        create_demo_app(self.db)
        with database_tool_bridge(self.service):
            with self.assertRaises(RuntimeError):
                with database_tool_bridge(self.service):pass
    def test_one_server_can_serve_frontend_and_api(self):
        dist=Path(self.tmp.name)/'dist';dist.mkdir();(dist/'index.html').write_text('<html><body>Unchanged frontend fixture</body></html>')
        with TestClient(create_demo_app(self.db,dist)) as client:
            self.assertIn('Unchanged frontend fixture',client.get('/').text)
            self.assertTrue(client.get('/api/health').json()['database_backed'])

if __name__=='__main__':unittest.main(verbosity=2)

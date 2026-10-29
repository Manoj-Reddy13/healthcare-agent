from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Complete sample-data services. No sample record is promoted to verified data."""
import hashlib,json,sqlite3
from contextlib import closing
from decimal import Decimal,ROUND_HALF_UP
from pathlib import Path
from app.services.data_store import require,money
from app.services.eligibility_rules import validate_node,evaluate_node

ROOT=BACKEND_ROOT
NOTICE='ACADEMIC DEMO: sample prices, ratings, distances, rules and insurance plans; not hospital quotations or confirmed eligibility.'
SCHEMA='''
PRAGMA foreign_keys=ON;
CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE cities(name TEXT PRIMARY KEY);
CREATE TABLE hospitals(id TEXT PRIMARY KEY,city TEXT NOT NULL REFERENCES cities(name),payload TEXT NOT NULL);
CREATE TABLE treatments(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
CREATE TABLE aliases(alias TEXT PRIMARY KEY,treatment_id TEXT NOT NULL REFERENCES treatments(id));
CREATE TABLE specialties(hospital_id TEXT NOT NULL REFERENCES hospitals(id),name TEXT NOT NULL,PRIMARY KEY(hospital_id,name));
CREATE TABLE prices(hospital_id TEXT NOT NULL REFERENCES hospitals(id),treatment_id TEXT NOT NULL REFERENCES treatments(id),paise INTEGER NOT NULL CHECK(paise>=0),PRIMARY KEY(hospital_id,treatment_id));
CREATE TABLE schemes(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
CREATE TABLE hospital_schemes(hospital_id TEXT NOT NULL REFERENCES hospitals(id),scheme_id TEXT NOT NULL REFERENCES schemes(id),PRIMARY KEY(hospital_id,scheme_id));
CREATE TABLE room_multipliers(name TEXT PRIMARY KEY,multiplier TEXT NOT NULL);
CREATE TABLE insurance(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
'''

def norm(value):return ' '.join(value.strip().casefold().split())
def scheme_key(value):
    value=norm(value)
    if any(x in value for x in ['pm-jay','pmjay','ayushman']):return 'scheme-pmjay'
    if 'aarogya' in value or 'arogya' in value:return 'scheme-aarogyasri'
    if 'cghs' in value:return 'scheme-cghs'
    if 'esi' in value:return 'scheme-esic'
    return value
def amount(paise):return float(Decimal(paise)/100)

def build_demo_database(destination=None,seed_path=None):
    destination=Path(destination or ROOT/'.local'/'demo.sqlite').resolve()
    raw=Path(seed_path or DATA_ROOT/'demo-seed.json').read_bytes();seed=json.loads(raw)
    require(seed['data_mode']=='mock','Demo seed must remain mock')
    fingerprint=hashlib.sha256(raw).hexdigest()
    require(len({h['id'] for h in seed['hospitals']})==len(seed['hospitals']),'Duplicate demo hospital')
    for h in seed['hospitals']:require(h['data_mode']=='mock' and h['verified'] is False,'Unverified fixtures only')
    for s in seed['schemes']:validate_node(s['demo_rule'])
    if destination.exists():
        with closing(sqlite3.connect(destination.as_uri()+'?mode=ro',uri=True)) as con:
            require(con.execute("SELECT value FROM meta WHERE key='fingerprint'").fetchone()[0]==fingerprint,'Seed changed; use a new demo database')
        return destination
    destination.parent.mkdir(parents=True,exist_ok=True)
    with destination.open('xb'):pass
    with closing(sqlite3.connect(destination)) as con:
        con.executescript(SCHEMA)
        with con:
            con.execute('INSERT INTO meta VALUES (?,?)',('fingerprint',fingerprint))
            con.executemany('INSERT INTO cities VALUES (?)',[(c,) for c in sorted({h['city'] for h in seed['hospitals']})])
            for key,t in seed['treatments'].items():
                con.execute('INSERT INTO treatments VALUES (?,?)',(key,json.dumps(t)))
                for alias in {norm(key),norm(t['display_name'])}:
                    con.execute('INSERT INTO aliases VALUES (?,?)',(alias,key))
            for name,multiplier in seed['room_multipliers'].items():
                require(Decimal(str(multiplier))>0,'Invalid demo room factor')
                con.execute('INSERT INTO room_multipliers VALUES (?,?)',(name,str(multiplier)))
            for row in seed['schemes']:con.execute('INSERT INTO schemes VALUES (?,?)',(row['id'],json.dumps(row)))
            for h in seed['hospitals']:
                con.execute('INSERT INTO hospitals VALUES (?,?,?)',(h['id'],h['city'],json.dumps(h)))
                con.executemany('INSERT INTO specialties VALUES (?,?)',[(h['id'],s) for s in h['specialties']])
                for proc,value in h['indicative_costs'].items():
                    match=con.execute('SELECT treatment_id FROM aliases WHERE alias=?',(norm(proc),)).fetchone()
                    require(match is not None,'Unmapped demo treatment price')
                    con.execute('INSERT INTO prices VALUES (?,?,?)',(h['id'],match[0],money(str(value))))
                for sch in {scheme_key(s) for s in h['accepted_schemes']}:
                    require(con.execute('SELECT id FROM schemes WHERE id=?',(sch,)).fetchone(),'Unknown demo hospital scheme')
                    con.execute('INSERT INTO hospital_schemes VALUES (?,?)',(h['id'],sch))
            for p in seed['insurance_products']:
                require(p['data_mode']=='mock' and set(p['hospital_ids'])<={h['id'] for h in seed['hospitals']},'Invalid demo insurance network')
                con.execute('INSERT INTO insurance VALUES (?,?)',(p['id'],json.dumps(p)))
    return destination

class DemoService:
    def __init__(self,database):self.database=Path(database).resolve()
    def read(self,sql,args=()):
        with closing(sqlite3.connect(self.database.as_uri()+'?mode=ro',uri=True)) as con:return con.execute(sql,args).fetchall()
    def city(self,value):
        normalized=norm(value)
        if normalized=='bangalore':normalized='bengaluru'
        cities=[r[0] for r in self.read('SELECT name FROM cities')]
        return next((c for c in cities if norm(c)==normalized),None)
    def treatment(self,value):
        rows=self.read('SELECT t.id,t.payload FROM aliases a JOIN treatments t ON t.id=a.treatment_id WHERE a.alias=?',(norm(value),))
        if not rows:raise ValueError('Unsupported demo procedure; use the treatment catalog')
        return rows[0][0],json.loads(rows[0][1])
    def catalog(self):return [{'id':k,**json.loads(p),'data_mode':'mock'} for k,p in self.read('SELECT id,payload FROM treatments ORDER BY id')]
    def hospitals(self,city=None,specialty=None,scheme=None,procedure=None,max_budget=None):
        if max_budget is not None:
            require(procedure is not None,'Budget search requires a procedure')
            budget=money(str(max_budget))
        sql='SELECT h.payload FROM hospitals h WHERE 1=1';args=[]
        if city:
            city=self.city(city)
            if city is None:return []
            sql+=' AND h.city=?';args.append(city)
        if specialty:
            sql+=' AND EXISTS(SELECT 1 FROM specialties s WHERE s.hospital_id=h.id AND lower(s.name)=?)';args.append(norm(specialty))
        if scheme:
            sql+=' AND EXISTS(SELECT 1 FROM hospital_schemes s WHERE s.hospital_id=h.id AND s.scheme_id=?)';args.append(scheme_key(scheme))
        if procedure:
            key,_=self.treatment(procedure)
            sql+=' AND EXISTS(SELECT 1 FROM prices p WHERE p.hospital_id=h.id AND p.treatment_id=?';args.append(key)
            if max_budget is not None:sql+=' AND p.paise<=?';args.append(budget)
            sql+=')'
        return [json.loads(r[0]) for r in self.read(sql+' ORDER BY h.id',args)]
    def estimate(self,procedure,city='Hyderabad',room_type='Semi-Private',hospital_id=None):
        key,treatment=self.treatment(procedure);city=self.city(city)
        require(city is not None,'Unsupported demo city')
        rooms=dict(self.read('SELECT name,multiplier FROM room_multipliers'))
        require(room_type in rooms,'Unsupported demo room type')
        sql='SELECT p.paise FROM prices p JOIN hospitals h ON h.id=p.hospital_id WHERE p.treatment_id=? AND h.city=?';args=[key,city]
        if hospital_id:sql+=' AND h.id=?';args.append(hospital_id)
        prices=[r[0] for r in self.read(sql,args)]
        require(bool(prices),'No demo price for this hospital, city and procedure')
        multiplier=Decimal(rooms[room_type])
        scale=lambda p:int((Decimal(p)*multiplier).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
        lo,hi=scale(min(prices)),scale(max(prices));mid=(lo+hi)//2
        # Illustrative allocation only, not an evidence-backed hospital bill.
        components=[];remaining=mid
        for name,percent in [('Procedure/team',50),('Facility/stay',20),('Consumables',20)]:
            value=mid*percent//100;remaining-=value;components.append({'name':name,'amount_inr':amount(value)})
        components.append({'name':'Diagnostics/other','amount_inr':amount(remaining)})
        return {'procedure':treatment['display_name'],'city':city,'room_type':room_type,'indicative_range_min':amount(lo),'indicative_range_max':amount(hi),'average_cost':amount(mid),'room_multiplier':float(multiplier),'factors':treatment['factors'],'covered_under_schemes':[],
                'disclaimer':NOTICE+' Range from sample facility prices; midpoint is not an observed average. Room factors and breakdown are illustrative. Scheme coverage requires separate checks.',
                'data_mode':'mock','breakdown':components,'observation_count':len(prices),'source':'demo-seed.json','coverage_status':'not_confirmed'}
    def schemes(self,state=None,category=None,specialty=None):
        rows=[json.loads(r[0]) for r in self.read('SELECT payload FROM schemes ORDER BY id')]
        if state:rows=[r for r in rows if not r['states'] or state.strip().casefold() in {s.casefold() for s in r['states']}]
        if category:rows=[r for r in rows if norm(r['category'])==norm(category)]
        if specialty:rows=[r for r in rows if norm(specialty) in {norm(s) for s in r['covered_specialties']}]
        return rows
    def match_scheme(self,scheme_id,profile,hospital_id=None,specialty=None):
        rows=self.read('SELECT payload FROM schemes WHERE id=?',(scheme_key(scheme_id),))
        require(bool(rows),'Unknown demo scheme')
        scheme=json.loads(rows[0][0]);trace=evaluate_node(scheme['demo_rule'],profile)
        status={'pass':'potential_demo_match','fail':'demo_criteria_not_met','unknown':'needs_information'}[trace['state']]
        participation=None if not hospital_id else bool(self.read('SELECT 1 FROM hospital_schemes WHERE hospital_id=? AND scheme_id=?',(hospital_id,scheme['id'])))
        discipline=None if not specialty else norm(specialty) in {norm(s) for s in scheme['covered_specialties']}
        if participation is False or discipline is False:status='demo_criteria_not_met'
        return {'scheme_id':scheme['id'],'status':status,'rule_trace':trace,'sample_hospital_participation':participation,'sample_specialty_match':discipline,'entitlement_confirmed':False,'data_mode':'mock','notice':NOTICE}
    def insurance(self,hospital_id,specialty,cost_inr):
        require(bool(self.read('SELECT id FROM hospitals WHERE id=?',(hospital_id,))),'Unknown demo hospital')
        cost=money(str(cost_inr));matches=[]
        for payload, in self.read('SELECT payload FROM insurance ORDER BY id'):
            p=json.loads(payload)
            if hospital_id not in p['hospital_ids'] or norm(specialty) not in {norm(s) for s in p['covered_specialties']}:continue
            eligible=max(0,cost-money(p['deductible_inr']))
            paid=min(money(p['remaining_cover_inr']),eligible*(100-p['copay_percent'])//100)
            matches.append({'product_id':p['id'],'name':p['name'],'simulated_reimbursement_inr':amount(paid),'simulated_out_of_pocket_inr':amount(cost-paid),'authorization_confirmed':False})
        return {'matches':matches,'total':len(matches),'data_mode':'mock','notice':NOTICE+' Simplified arithmetic excludes real policy exclusions, sublimits and authorization.'}

if __name__=='__main__':print(build_demo_database())

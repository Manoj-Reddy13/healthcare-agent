from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Independent Member 3 data layer. Standard library only; never imports the app."""
import argparse
import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

VERSION = '1'
FILES = ['pilot-data.json', 'treatment-catalog-v2.json', 'sources-v2.json',
         'scheme-tariffs-v2.json', 'policy-observations-v2.json', 'research-observations.json']

def require(condition, message):
    if not condition:
        raise ValueError(message)

def money(value):
    require(isinstance(value, str), 'Money must be an exact decimal string')
    try:
        amount = Decimal(value)
        require(amount.is_finite() and amount >= 0 and amount*100 == (amount*100).to_integral_value(), 'Invalid money precision or value')
        return int(amount*100)
    except InvalidOperation as exc:
        raise ValueError('Invalid money') from exc

def unique(rows, key):
    ids = [r[key] for r in rows]
    require(all(isinstance(x, str) and x.strip() for x in ids), f'Invalid {key}')
    require(len(ids) == len(set(ids)), f'Duplicate {key}')
    return set(ids)

def load_bundle(folder):
    folder = Path(folder)
    blobs = {name: (folder/name).read_bytes() for name in FILES}
    bundle = {name: json.loads(raw) for name, raw in blobs.items()}
    digest = hashlib.sha256()
    for name in sorted(blobs):
        digest.update(name.encode()+b'\0'+blobs[name]+b'\0')
    return bundle, digest.hexdigest()

def validate(bundle):
    pilot = bundle['pilot-data.json']
    # Unsupported populated tables must never disappear silently on import.
    supported = {'cities', 'hospitals', 'sources', 'evidence'}
    for key, rows in pilot.items():
        require(isinstance(rows, list), f'{key} must be a list')
        require(key in supported or not rows, f'Importer does not yet support populated table: {key}')
    cities = unique(pilot['cities'], 'city_id')
    hospitals = unique(pilot['hospitals'], 'hospital_id')
    source_rows = pilot['sources']+bundle['sources-v2.json']
    sources = unique(source_rows, 'source_id')
    unique(pilot['evidence'], 'evidence_id')
    for row in source_rows:
        url = urlparse(row['url'])
        require(url.scheme in ('http', 'https') and bool(url.netloc), 'Invalid source URL')
        date.fromisoformat(row['accessed_on'])
    for row in pilot['cities']:
        require(bool(row['name'].strip()) and bool(row['state_code']), 'Missing city fields')
    claims = ('name', 'city_id', 'address', 'postal_code', 'phone', 'website')
    for row in pilot['hospitals']:
        require(row['city_id'] in cities, 'Unknown hospital city')
        require(row['provenance_status'] in ('mock','sourced','verified','stale'), 'Invalid provenance')
        require(all(row.get(f) for f in ('name', 'address')), 'Missing hospital fields')
        for field in claims:
            if row.get(field) is not None and row['provenance_status'] != 'mock':
                require(any(e['entity_id']==row['hospital_id'] and e['field_or_relationship']==field for e in pilot['evidence']), f'Missing evidence: {field}')
    for row in pilot['evidence']:
        require(row['source_id'] in sources, 'Unknown evidence source')
        require(row['entity_type']=='hospitals' and row['entity_id'] in hospitals, 'Unsupported evidence target')
        require(bool(row['supporting_excerpt_or_locator']), 'Missing evidence locator')
    catalog = bundle['treatment-catalog-v2.json']
    families = unique(catalog['families'], 'family_id')
    treatments = unique(catalog['accepted_variants'], 'treatment_id')
    for row in catalog['accepted_variants']:
        require(row['family_id'] in families and row['source_id'] in sources, 'Invalid treatment references')
    tariffs = bundle['scheme-tariffs-v2.json']['records']
    unique(tariffs, 'tariff_id')
    for row in tariffs:
        require(row['treatment_id'] in treatments and row['source_id'] in sources, 'Invalid tariff references')
        require(money(row['amount_inr'])>0, 'Tariff must be positive')
        require(row['release_status']=='review_required', 'Tariff review gate must remain enabled')
        require(bool(row['applicable_city_ids']) and set(row['applicable_city_ids']) <= cities, 'Invalid tariff city')
        require(len(row['applicable_city_ids'])==len(set(row['applicable_city_ids'])), 'Duplicate tariff city')
        date.fromisoformat(row['valid_from'])
        if row['valid_to']:
            require(date.fromisoformat(row['valid_to'])>date.fromisoformat(row['valid_from']), 'Invalid tariff validity')
    policies = bundle['policy-observations-v2.json']['records']
    unique(policies, 'id')
    for row in policies:
        require(row['source_id'] in sources, 'Unknown policy source')
    research = bundle['research-observations.json']['observations']
    unique(research, 'observation_id')
    return {'cities':len(cities),'hospitals':len(hospitals),'sources':len(sources),
            'treatments':len(treatments),'tariffs':len(tariffs),'policy_observations':len(policies)}

@contextmanager
def connect(path):
    connection = sqlite3.connect(path)
    connection.execute('PRAGMA foreign_keys=ON')
    try:
        with connection:
            yield connection
    finally:
        connection.close()

def import_bundle(folder, database):
    bundle, fingerprint = load_bundle(folder)
    counts = validate(bundle)  # Complete validation before opening or changing a database.
    with connect(database) as con:
        con.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
        version = con.execute("SELECT value FROM metadata WHERE key='version'").fetchone()
        require(version is None or version[0]==VERSION, 'Unsupported database schema version')
        previous = con.execute("SELECT value FROM metadata WHERE key='fingerprint'").fetchone()
        if previous:
            require(previous[0]==fingerprint, 'Different bundle: import to a new database for review')
            return dict(counts, status='already_imported', fingerprint=fingerprint)
        pilot=bundle['pilot-data.json']
        dump=lambda row: json.dumps(row, ensure_ascii=False, sort_keys=True)
        for row in pilot['sources']+bundle['sources-v2.json']:
            con.execute('INSERT INTO sources VALUES (?,?,?)',(row['source_id'],row['url'],dump(row)))
        for row in pilot['cities']:
            con.execute('INSERT INTO cities VALUES (?,?,?)',(row['city_id'],row['name'],row['state_code']))
        for row in pilot['hospitals']:
            con.execute('INSERT INTO hospitals VALUES (?,?,?,?,?)',(row['hospital_id'],row['city_id'],row['name'],row['provenance_status'],dump(row)))
        catalog=bundle['treatment-catalog-v2.json']
        for row in catalog['families']:
            con.execute('INSERT INTO families VALUES (?,?)',(row['family_id'],dump(row)))
        for row in catalog['accepted_variants']:
            con.execute('INSERT INTO treatments VALUES (?,?,?)',(row['treatment_id'],row['family_id'],dump(row)))
        for row in pilot['evidence']:
            con.execute('INSERT INTO evidence VALUES (?,?,?,?,?)',(row['evidence_id'],row['source_id'],row['entity_id'],row['field_or_relationship'],dump(row)))
        for row in bundle['scheme-tariffs-v2.json']['records']:
            con.execute('INSERT INTO tariffs VALUES (?,?,?,?,?,?)',(row['tariff_id'],row['treatment_id'],row['source_id'],money(row['amount_inr']),row['release_status'],dump(row)))
            con.executemany('INSERT INTO tariff_cities VALUES (?,?)',[(row['tariff_id'],c) for c in row['applicable_city_ids']])
        for row in bundle['policy-observations-v2.json']['records']:
            con.execute('INSERT INTO observations VALUES (?,?)',('policy:'+row['id'],dump(row)))
        for row in bundle['research-observations.json']['observations']:
            con.execute('INSERT INTO observations VALUES (?,?)',('research:'+row['observation_id'],dump(row)))
        con.executemany('INSERT INTO metadata VALUES (?,?)',[('version',VERSION),('fingerprint',fingerprint)])
    return dict(counts,status='imported',fingerprint=fingerprint)

class DataService:
    def __init__(self, database):
        self.database=database

    def search_hospitals(self, city=None):
        aliases={'bangalore':'Bengaluru','bengaluru':'Bengaluru','hyderabad':'Hyderabad'}
        city=aliases.get(city.strip().lower(),city.strip()) if city else None
        sql='SELECT h.payload FROM hospitals h JOIN cities c USING(city_id) WHERE h.provenance != ?'
        params=['stale']
        if city:
            sql+=' AND lower(c.name)=lower(?)';params.append(city)
        with connect(self.database) as con:
            return [json.loads(row[0]) for row in con.execute(sql+' ORDER BY h.hospital_id',params)]

    def estimate_cost(self, treatment_id, city, room_type, on_date=None):
        on_date=on_date or date.today().isoformat()
        date.fromisoformat(on_date)
        require(room_type in ('General Ward','Semi-Private','Private Room','ICU'), 'Unsupported room category')
        with connect(self.database) as con:
            rows=con.execute('''SELECT p.minimum_paise,p.maximum_paise,p.billing_unit FROM self_pay_prices p
                JOIN hospitals h USING(hospital_id) JOIN cities c USING(city_id)
                WHERE p.treatment_id=? AND lower(c.name)=lower(?) AND p.room_type=?
                AND p.reviewed=1 AND p.valid_from<=? AND p.valid_to>?
                AND h.provenance IN ('sourced','verified')''',(treatment_id,city,room_type,on_date,on_date)).fetchall()
        if not rows:
            return {'status':'unavailable','reason':'No reviewed comparable self-pay prices','observation_count':0}
        if len({r[2] for r in rows}) != 1:
            return {'status':'needs_information','reason':'Price billing units differ; select comparable observations','observation_count':len(rows)}
        lo=min(r[0] for r in rows); hi=max(r[1] for r in rows)
        return {'status':'estimated','minimum_inr':str(Decimal(lo)/100),'maximum_inr':str(Decimal(hi)/100),'observation_count':len(rows),'currency':'INR','billing_unit':rows[0][2]}

    def find_schemes(self):
        return {'status':'needs_information','candidates':[], 'reason':'Policy observations are research only; reviewed executable eligibility rules are not yet available'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True)
    parser.add_argument('--database',type=Path)
    args=parser.parse_args()
    result=import_bundle(args.data,args.database) if args.database else validate(load_bundle(args.data)[0])
    print(json.dumps(result,indent=2))

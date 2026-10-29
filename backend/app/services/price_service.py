from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Additive price pipeline. Uses a NEW database snapshot; original files stay intact."""
import argparse
import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse
from app.services.data_store import connect, money, require

SCHEMA = '''
CREATE TABLE price_batches_v2(batch_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, reviewer TEXT NOT NULL, reviewed_on TEXT NOT NULL);
CREATE TABLE price_sources_v2(source_id TEXT PRIMARY KEY, url TEXT NOT NULL, payload TEXT NOT NULL);
CREATE TABLE prices_v2(price_id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES price_batches_v2(batch_id), hospital_id TEXT NOT NULL REFERENCES hospitals(hospital_id), treatment_id TEXT NOT NULL REFERENCES treatments(treatment_id), source_id TEXT NOT NULL REFERENCES price_sources_v2(source_id), minimum_paise INTEGER NOT NULL CHECK(minimum_paise>=0), maximum_paise INTEGER NOT NULL CHECK(maximum_paise>=minimum_paise), room_type TEXT NOT NULL, billing_unit TEXT NOT NULL, comparison_group TEXT NOT NULL, valid_from TEXT NOT NULL, valid_to TEXT NOT NULL CHECK(valid_to>valid_from), refresh_by TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX price_lookup_v2 ON prices_v2(treatment_id,room_type,billing_unit,comparison_group);
'''
ROOMS={'General Ward','Semi-Private','Private Room','ICU','Not Applicable'}
UNITS={'per_procedure','per_consultation','per_scan','per_day'}

def text_field(row, key):
    value=row.get(key)
    require(isinstance(value,str) and bool(value.strip()), f'Missing {key}')
    return value

def fingerprint(document):
    return hashlib.sha256(json.dumps(document,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def validate_prices(document, base_database, on_date):
    today=date.fromisoformat(on_date)
    require(document.get('version')==1,'Unsupported price document version')
    require(document.get('purpose')=='self_pay','Scheme tariffs cannot enter the self-pay pipeline')
    rows=document.get('prices');sources=document.get('sources')
    require(isinstance(rows,list) and isinstance(sources,list),'Prices and sources must be arrays')
    receipt=document.get('review')
    require(isinstance(receipt,dict),'Missing review receipt')
    reviewer=text_field(receipt,'reviewer')
    require(date.fromisoformat(text_field(receipt,'reviewed_on'))<=today,'Review is in the future')
    content={k:v for k,v in document.items() if k!='review'}
    require(receipt.get('content_sha256')==fingerprint(content),'Review receipt does not match the content')
    require(receipt.get('decision')=='accepted','Prices have not been reviewed')
    # A receipt records a review assertion; it does not authenticate the reviewer.
    source_ids=set()
    for source in sources:
        sid=text_field(source,'source_id')
        require(sid not in source_ids,'Duplicate source ID');source_ids.add(sid)
        url=urlparse(text_field(source,'url'))
        require(url.scheme=='https' and bool(url.netloc) and not url.username,'Invalid HTTPS source URL')
        require(source.get('source_type')=='official_hospital','Self-pay prices require a hospital primary source')
        text_field(source,'publisher');text_field(source,'title')
        accessed=date.fromisoformat(text_field(source,'accessed_on'))
        require(accessed<=today,'Source access date is in the future')
    # Read-only mode guarantees a misspelled database path cannot create an empty DB.
    with closing(sqlite3.connect(Path(base_database).resolve().as_uri()+'?mode=ro',uri=True)) as con:
        hospitals={r[0]:r[1] for r in con.execute('SELECT hospital_id,provenance FROM hospitals')}
        treatments={r[0] for r in con.execute('SELECT treatment_id FROM treatments')}
    ids=set()
    for row in rows:
        pid=text_field(row,'price_id');require(pid not in ids,'Duplicate price ID');ids.add(pid)
        require(row.get('hospital_id') in hospitals,'Unknown hospital')
        require(hospitals[row['hospital_id']] in ('sourced','verified'),'Hospital is not sourced/current')
        require(row.get('treatment_id') in treatments,'Unknown exact treatment variant')
        require(row.get('source_id') in source_ids,'Unknown price source')
        require(row.get('price_basis') in ('published_tariff','published_package'),'Not a published self-pay price')
        require(row.get('currency')=='INR','Only INR supported')
        require(row.get('room_type') in ROOMS and row.get('billing_unit') in UNITS,'Invalid room or billing unit')
        require(money(row['minimum_inr'])<=money(row['maximum_inr']),'Price bounds reversed')
        start=date.fromisoformat(text_field(row,'valid_from'));end=date.fromisoformat(text_field(row,'valid_to'))
        require(start<end,'Invalid effective date interval')
        refresh=date.fromisoformat(text_field(row,'refresh_by'))
        require(refresh>=today,'Price evidence is overdue for review')
        require(date.fromisoformat(text_field(row,'observed_on'))<=today,'Future price observation')
        text_field(row,'comparison_group');text_field(row,'source_locator')
        require(isinstance(row.get('inclusions'),list) and isinstance(row.get('exclusions'),list),'Missing package scope')
        require(all(isinstance(x,str) and x.strip() for x in row['inclusions']+row['exclusions']),'Invalid package scope item')
        require(row.get('scope_reviewed') is True,'Package comparability must be reviewed')
    return {'price_count':len(rows),'source_count':len(sources),'reviewer':reviewer,'fingerprint':fingerprint(document)}

def create_snapshot(base_database, destination, document, on_date):
    base_database=Path(base_database).resolve();destination=Path(destination).resolve()
    require(destination!=base_database,'Destination must be a separate snapshot')
    require(not destination.exists(),'Destination already exists; choose a new snapshot')
    result=validate_prices(document,base_database,on_date)
    # Reserve without overwriting; reject collisions even between validation and creation.
    with destination.open('xb'):
        pass
    try:
        with closing(sqlite3.connect(base_database.as_uri()+'?mode=ro',uri=True)) as original:
            with closing(sqlite3.connect(destination)) as copy:
                original.backup(copy)
        with connect(destination) as con:
            con.executescript(SCHEMA)
            review=document['review'];batch_id=text_field(document,'batch_id')
            con.execute('INSERT INTO price_batches_v2 VALUES (?,?,?,?)',(batch_id,result['fingerprint'],review['reviewer'],review['reviewed_on']))
            for source in document['sources']:
                con.execute('INSERT INTO price_sources_v2 VALUES (?,?,?)',(source['source_id'],source['url'],json.dumps(source)))
            for row in document['prices']:
                con.execute('INSERT INTO prices_v2 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    (row['price_id'],batch_id,row['hospital_id'],row['treatment_id'],row['source_id'],money(row['minimum_inr']),money(row['maximum_inr']),row['room_type'],row['billing_unit'],row['comparison_group'],row['valid_from'],row['valid_to'],row['refresh_by'],json.dumps(row)))
        return dict(result,status='created',database=str(destination))
    except Exception:
        # Preserve any failed new snapshot for diagnosis. Never remove an existing file.
        raise

class PriceService:
    def __init__(self,database):self.database=Path(database).resolve()
    def estimate(self,treatment_id,city,room_type,billing_unit,comparison_group,on_date,hospital_id=None):
        date.fromisoformat(on_date)
        require(room_type in ROOMS and billing_unit in UNITS,'Invalid room or billing unit')
        require(bool(comparison_group.strip()),'Comparison group required')
        city={'bangalore':'Bengaluru'}.get(city.strip().lower(),city.strip())
        sql='''SELECT p.payload,h.name FROM prices_v2 p JOIN hospitals h USING(hospital_id)
            JOIN cities c USING(city_id) WHERE p.treatment_id=? AND lower(c.name)=lower(?)
            AND p.room_type=? AND p.billing_unit=? AND p.comparison_group=?
            AND p.valid_from<=? AND p.valid_to>? AND p.refresh_by>=?
            AND h.provenance IN ('sourced','verified')'''
        params=[treatment_id,city,room_type,billing_unit,comparison_group,on_date,on_date,on_date]
        if hospital_id:sql+=' AND p.hospital_id=?';params.append(hospital_id)
        with closing(sqlite3.connect(self.database.as_uri()+'?mode=ro',uri=True)) as con:
            rows=[(json.loads(r[0]),r[1]) for r in con.execute(sql+' ORDER BY p.price_id',params)]
        if not rows:return {'status':'unavailable','observation_count':0,'reason':'No current comparable reviewed hospital cash prices'}
        lo=min(money(r['minimum_inr']) for r,_ in rows);hi=max(money(r['maximum_inr']) for r,_ in rows)
        return {'status':'estimated','currency':'INR','minimum_inr':f'{lo//100}.{lo%100:02d}','maximum_inr':f'{hi//100}.{hi%100:02d}',
                'billing_unit':billing_unit,'comparison_group':comparison_group,'observation_count':len(rows),
                'evidence':[{'price_id':r['price_id'],'source_id':r['source_id'],'observed_on':r['observed_on'],'source_locator':r['source_locator'],'hospital_id':r['hospital_id'],'hospital_name':name,'inclusions':r['inclusions'],'exclusions':r['exclusions']} for r,name in rows],
                'disclaimer':'Published indicative prices; hospital confirmation required. No room multiplier applied.'}
    def search_with_budget(self,treatment_id,city,room_type,billing_unit,comparison_group,max_budget_inr,on_date):
        budget=money(max_budget_inr)
        with closing(sqlite3.connect(self.database.as_uri()+'?mode=ro',uri=True)) as con:
            hospitals=[r[0] for r in con.execute('SELECT hospital_id FROM hospitals ORDER BY hospital_id')]
        matches=[]
        for hid in hospitals:
            estimate=self.estimate(treatment_id,city,room_type,billing_unit,comparison_group,on_date,hid)
            if estimate['status']=='estimated' and money(estimate['maximum_inr'])<=budget:
                matches.append({'hospital_id':hid,'estimate':estimate})
        return {'matches':matches,'total':len(matches),'budget_policy':'Entire observed range must fit the requested treatment budget'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base',required=True,type=Path);parser.add_argument('--destination',required=True,type=Path)
    parser.add_argument('--prices',required=True,type=Path);parser.add_argument('--on-date',required=True)
    args=parser.parse_args()
    print(json.dumps(create_snapshot(args.base,args.destination,json.loads(args.prices.read_text(encoding='utf-8')),args.on_date),indent=2))

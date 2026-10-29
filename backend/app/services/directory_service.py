from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Source-backed specialty relationship import, into a separate snapshot."""
import json
import sqlite3
from contextlib import closing
from datetime import date
from pathlib import Path
from app.services.data_store import connect,require

def add_directory(base,destination,relationships):
    base=Path(base).resolve();destination=Path(destination).resolve()
    require(base!=destination and not destination.exists(),'Use a new snapshot path')
    with closing(sqlite3.connect(base.as_uri()+'?mode=ro',uri=True)) as con:
        hospitals={r[0] for r in con.execute('SELECT hospital_id FROM hospitals')}
        sources={r[0] for r in con.execute('SELECT source_id FROM sources')}
        seen=set()
        for row in relationships:
            key=(row['hospital_id'],row['specialty'])
            require(key not in seen,'Duplicate specialty relationship');seen.add(key)
            require(row['hospital_id'] in hospitals and row['source_id'] in sources,'Invalid directory reference')
            require(row['specialty'] in ('Cardiology','Oncology','Neurology','Nephrology','Orthopedics','Pediatrics'),'Unsupported specialty')
            require(row.get('locator') and row.get('source_label'),'Evidence locator and original label required')
            require(date.fromisoformat(row['refresh_by'])>date.fromisoformat(row['observed_on']),'Invalid review interval')
        with destination.open('xb'):pass
        with closing(sqlite3.connect(destination)) as copied:con.backup(copied)
    with connect(destination) as con:
        con.execute('''CREATE TABLE directory_specialties_v3(hospital_id TEXT NOT NULL REFERENCES hospitals(hospital_id),specialty TEXT NOT NULL,source_id TEXT NOT NULL REFERENCES sources(source_id),observed_on TEXT NOT NULL,refresh_by TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(hospital_id,specialty))''')
        con.executemany('INSERT INTO directory_specialties_v3 VALUES (?,?,?,?,?,?)',[(r['hospital_id'],r['specialty'],r['source_id'],r['observed_on'],r['refresh_by'],json.dumps(r)) for r in relationships])

def search_specialty(database,specialty,on_date,city=None):
    date.fromisoformat(on_date)
    aliases={'orthopaedics':'Orthopedics','orthopedics':'Orthopedics','cardiac sciences':'Cardiology'}
    specialty=aliases.get(specialty.strip().lower(),specialty.strip())
    city={'bangalore':'Bengaluru'}.get(city.strip().lower(),city.strip()) if city else None
    sql='''SELECT h.payload,d.payload FROM directory_specialties_v3 d JOIN hospitals h USING(hospital_id)
        JOIN cities c USING(city_id) WHERE lower(d.specialty)=lower(?) AND d.observed_on<=? AND d.refresh_by>=?
        AND h.provenance IN ('sourced','verified')'''
    args=[specialty,on_date,on_date]
    if city:sql+=' AND lower(c.name)=lower(?)';args.append(city)
    with closing(sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True)) as con:
        return [dict(json.loads(h),specialty_evidence=json.loads(e)) for h,e in con.execute(sql+' ORDER BY h.hospital_id',args)]

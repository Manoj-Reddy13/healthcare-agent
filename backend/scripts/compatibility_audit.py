from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Read-only audit of sourced data against original response contracts."""
import importlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path
from pydantic import ValidationError
from app.integration_preview import load_original,DEFAULT_BACKEND,ROOT

def audit(backend=DEFAULT_BACKEND,database=ROOT/'.local'/'healthcare-directory-v3.sqlite'):
    load_original(backend)
    hospital_model=importlib.import_module('app.models.hospital').Hospital
    cost_model=importlib.import_module('app.models.cost').CostEstimate
    results=[]
    with closing(sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro',uri=True)) as con:
        rows=con.execute('SELECT h.payload,c.name FROM hospitals h JOIN cities c USING(city_id) ORDER BY hospital_id').fetchall()
    for raw,city in rows:
        source=json.loads(raw)
        # Candidate projection is validated only; it is never served to the UI.
        candidate={'id':source.get('legacy_id') or source['hospital_id'],'name':source['name'],'city':city,
                   'address':source['address'],'phone':source.get('phone'),'specialties':[],
                   'indicative_costs':{},'accepted_schemes':[],'accreditation':[],
                   'verified':False,'data_mode':source['provenance_status']}
        try:hospital_model.model_validate(candidate);issues=[]
        except ValidationError as exc:issues=[{'field':'.'.join(map(str,e['loc'])),'type':e['type']} for e in exc.errors()]
        results.append({'hospital_id':source['hospital_id'],'compatible':not issues,'issues':issues})
    try:cost_model.model_validate({'status':'unavailable','observation_count':0});cost_issues=[]
    except ValidationError as exc:cost_issues=[{'field':'.'.join(map(str,e['loc'])),'type':e['type']} for e in exc.errors()]
    return {'hospital_contract_checks':results,'unavailable_cost_compatible':not cost_issues,
            'unavailable_cost_issues':cost_issues,'safe_to_switch_existing_client':all(r['compatible'] for r in results) and not cost_issues,
            'required_decisions':['Support missing ratings instead of inventing values','Define distance origin and missing-distance display','Represent sourced and stale provenance explicitly','Add unavailable cost responses and exact treatment context'],
            'original_files_modified':False,'note':'This report detects schema incompatibilities. It does not implement frontend changes or relabel sourced data.'}

if __name__=='__main__':print(json.dumps(audit(),indent=2))

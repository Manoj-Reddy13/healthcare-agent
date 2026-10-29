from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""New evidence routes for provider guides. Existing estimators remain unchanged."""
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
from typing import Literal
from fastapi import APIRouter,HTTPException,Query
from app.services.data_store import money,require
from app.api.evidence_routes import app_factory as previous_factory

ROOT=BACKEND_ROOT
DATA=DATA_ROOT/'provider-guides-v6.json'
KINDS={'guide_range','guide_point','clinic_listing','scheme_tariff_reference'}
HOSTS={'www.yashodahospitals.com','www.apollo247.com','cdnbbsr.s3waas.gov.in'}

def load_guides(path=DATA):
    doc=json.loads(Path(path).read_text(encoding='utf-8'))
    require(doc.get('version')==1,'Unsupported guide document version')
    date.fromisoformat(doc['collected_on'])
    sources=doc['sources'];rows=doc['records']
    source_ids={s['source_id'] for s in sources};ids={r['record_id'] for r in rows}
    source_map={s['source_id']:s for s in sources}
    require(len(source_ids)==len(sources),'Duplicate source ID')
    require(len(ids)==len(rows),'Duplicate reference ID')
    for source in sources:
        url=urlparse(source['url'])
        require(url.scheme=='https' and url.hostname in HOSTS and not url.username,'Unrecognized primary source host')
        require(source.get('source_kind') in ('provider_guide','clinic_listing','scheme_tariff_reference'),'Unknown source kind')
        require(bool(source.get('publisher')),'Missing publisher')
        require(date.fromisoformat(source['accessed_on'])<=date.fromisoformat(doc['collected_on']),'Access date after collection')
    for row in rows:
        require(row['source_id'] in source_ids,'Unknown reference source')
        allowed={'provider_guide':{'guide_range','guide_point'},'clinic_listing':{'clinic_listing'},'scheme_tariff_reference':{'scheme_tariff_reference'}}
        require(row['value_kind'] in allowed[source_map[row['source_id']]['source_kind']],'Evidence class does not match source class')
        require(row['treatment_family'] in doc['target_families'],'Unknown treatment family')
        require(row['service_city'] in (None,'Hyderabad','Bengaluru'),'Unsupported city')
        require(row['currency']=='INR','Only INR reference values supported')
        require(row['value_kind'] in KINDS,'Unsupported evidence class')
        require(0<=money(row['minimum_inr'])<=money(row['maximum_inr']),'Invalid reference range')
        if row['value_kind']!='guide_range':require(money(row['minimum_inr'])==money(row['maximum_inr']),'Point reference must not become a range')
        if row['value_kind']=='clinic_listing':require(bool(row['provider_name']),'Clinic identity required')
        require(row['status']=='published_reference_only' and row['estimator_eligible'] is False,'Reference evidence cannot be promoted')
        require(row['mapped_hospital_id'] is None,'Unverified hospital mapping')
        require(row['valid_from'] is None and row['valid_to'] is None,'Guide dates must not imply a tariff validity interval')
        require(bool(row['context']) and bool(row['source_locator']) and bool(row['missing_fields']),'Missing reference context')
        require(set(row['related_figures'])<=ids and row['record_id'] not in row['related_figures'],'Invalid related figures')
        require(date.fromisoformat(row['observed_on'])<=date.fromisoformat(doc['collected_on']),'Observation after collection')
        require(date.fromisoformat(row['observed_on'])<=date.fromisoformat(source_map[row['source_id']]['accessed_on']),'Observation after source access')
    return doc

def coverage(doc):
    families=[]
    for family in doc['target_families']:
        records=[r for r in doc['records'] if r['treatment_family']==family]
        kinds=sorted({r['value_kind'] for r in records})
        families.append({'family':family,'reference_count':len(records),'evidence_classes':kinds,
                         'cities_with_provider_references':sorted({r['service_city'] for r in records if r['service_city'] and r['value_kind']!='scheme_tariff_reference'}),
                         'reviewed_cost_records':0,'complete':False})
    return {'families':families,'record_count':len(doc['records']),'source_count':len(doc['sources']),
            'all_reference_families_present':all(f['reference_count'] for f in families),
            'complete_cost_dataset':False,'notice':'Reference presence is not complete city, hospital or treatment-package coverage.'}

def guides_router(doc):
    router=APIRouter(prefix='/api/v3/evidence',tags=['Treatment price references'])
    sources={s['source_id']:s for s in doc['sources']}
    @router.get('/treatment-guides')
    def guides(family:Literal['angioplasty','knee-replacement','cataract','delivery','mri','consultation']|None=None,
               city:str|None=Query(None,min_length=1,max_length=100),include_scheme_references:bool=False):
        rows=doc['records']
        if family:rows=[r for r in rows if r['treatment_family']==family]
        if city:
            city={'bangalore':'bengaluru'}.get(city.strip().casefold(),city.strip().casefold())
            rows=[r for r in rows if r['service_city'] and r['service_city'].casefold()==city]
        if not include_scheme_references:rows=[r for r in rows if r['value_kind']!='scheme_tariff_reference']
        used={r['source_id'] for r in rows}
        return {'total':len(rows),'records':rows,'sources':[sources[s] for s in sorted(used)],
                'status':'published_references','notice':'Individual published guidance retained with context. No pooled average, hospital quotation or room adjustment is implied.'}
    @router.get('/coverage')
    def get_coverage():return coverage(doc)
    @router.get('/references/{record_id}')
    def reference(record_id:str):
        row=next((r for r in doc['records'] if r['record_id']==record_id),None)
        if row is None:raise HTTPException(404,'Published reference not found')
        return {'record':row,'source':sources[row['source_id']],'related_records':[r for r in doc['records'] if r['record_id'] in row['related_figures']]}
    return router

def app_factory():
    app=previous_factory()
    app.title='Healthcare Integration with Treatment References'
    app.version='0.6.0'
    app.include_router(guides_router(load_guides()))
    return app

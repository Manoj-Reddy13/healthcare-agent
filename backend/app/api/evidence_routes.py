from app.models.evidence_requests import SeniorPathRequest
from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Read-only evidence API. Never promotes incomplete observations into estimates."""
import json
from datetime import date
from pathlib import Path
from fastapi import APIRouter,FastAPI,HTTPException,Query
from pydantic import BaseModel,ConfigDict,Field,StrictInt
from app.services.data_store import money,require
from app.integration_preview import create_combined_app

DEFAULT_DATA=DATA_ROOT/'published-evidence-v5.json'

def load_evidence(path=DEFAULT_DATA):
    document=json.loads(Path(path).read_text(encoding='utf-8'))
    require(document.get('version')==1,'Unsupported evidence version')
    sources={s['source_id']:s for s in document['sources']}
    require(len(sources)==len(document['sources']),'Duplicate evidence source')
    products={p['product_id']:p for p in document['products']}
    ids=set()
    for row in document['price_observations']:
        require(row['observation_id'] not in ids,'Duplicate observation');ids.add(row['observation_id'])
        require(row['source_id'] in sources and row['product_id'] in products,'Invalid evidence reference')
        require(row['estimator_eligible'] is False and row['status']=='published_observation_only','Incomplete evidence cannot be promoted')
        require(row['mapped_hospital_id'] is None,'Provider mapping requires separate verification')
        require(money(row['amount_inr'])>0,'Price must be positive')
        date.fromisoformat(row['observed_on'])
    for fact in document['policy_facts']:
        require(fact['source_id'] in sources,'Unknown policy source')
        require(fact['status']=='dated_official_snapshot','Unexpected policy status')
    return document


def senior_path_screen(age,document):
    fact=next(f for f in document['policy_facts'] if f['fact_id']=='pmjay-selection-2026')
    threshold=fact['claims']['senior_path_minimum_age']
    source=next(s for s in document['sources'] if s['source_id']==fact['source_id'])
    if age is None:status='needs_information';reason='Age is needed to screen the senior pathway'
    elif age>=threshold:status='potential_senior_path_candidate';reason='Age meets the senior-path threshold described in the dated official answer'
    else:status='other_path_may_apply';reason='Below the senior-path threshold; this does not rule out other PM-JAY pathways'
    return {'status':status,'reason':reason,'policy_source_as_of':fact['source_as_of'],'source':source,
            'entitlement_confirmed':False,'next_checks':['Confirm current enrollment requirements with the official scheme service','Confirm beneficiary enrollment','Confirm treatment package and hospital participation'],
            'notice':'Limited age-path screening from a dated source, not a complete eligibility determination.'}

def evidence_router(document):
    router=APIRouter(prefix='/api/v3/evidence',tags=['Published evidence'])
    @router.get('/prices')
    def prices(city:str|None=Query(None,min_length=1),provider_name:str|None=Query(None,min_length=1)):
        rows=document['price_observations']
        if city:rows=[r for r in rows if r['city'].casefold()==city.strip().casefold()]
        if provider_name:rows=[r for r in rows if provider_name.strip().casefold() in r['provider_name'].casefold()]
        return {'total':len(rows),'observations':rows,'products':document['products'],'sources':document['sources'],
                'notice':'Published listing amounts only. Protocol, validity and inclusions need confirmation; these are not cost estimates.'}
    @router.get('/policies')
    def policies():return {'facts':document['policy_facts'],'sources':document['sources'],'notice':'Dated official facts; no approved executable full policy is implied.'}
    @router.post('/pmjay/senior-path-screen')
    def screen(payload:SeniorPathRequest):return senior_path_screen(payload.age,document)
    return router

def create_evidence_app(data_path=DEFAULT_DATA):
    app=FastAPI(title='Healthcare Published Evidence',version='0.5.0')
    app.include_router(evidence_router(load_evidence(data_path)))
    return app

def app_factory():
    app=create_combined_app()
    app.title='Healthcare Integration and Published Evidence Preview'
    app.version='0.5.0'
    app.include_router(evidence_router(load_evidence()))
    return app

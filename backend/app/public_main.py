from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Public-source runtime with no demo results or sample fallback."""
import sqlite3
from pathlib import Path
from typing import Literal
from fastapi import HTTPException,Query
from fastapi.responses import RedirectResponse
from app.services.data_store import money
from app.api.live_sources import create_live_app
from app.services.live_provider_service import PRODUCTS,LiveListingClient,LiveSourceError,LiveAuditStore

ROOT=BACKEND_ROOT
Product=Literal['mri-knee-single-hyderabad','mri-brain-plain-bengaluru']
def create_public_app(client=None,audit_path=None):
    client=client or LiveListingClient();path=audit_path or ROOT/'.local'/'public-audit.sqlite'
    app=create_live_app(client,path);audit=LiveAuditStore(path)
    app.title='Healthcare Public-Source Edition'
    app.description='Public provider listings only. No sample fallback, patient quotes or confirmed insurance/beneficiary eligibility.'
    def fetch(product_id):
        try:
            result=client.fetch(product_id);audit.save(result);return result
        except LiveSourceError as exc:raise HTTPException(503,str(exc)) from None
        except sqlite3.Error:raise HTTPException(503,'Live audit could not be saved; result not promoted') from None
    @app.get('/',include_in_schema=False)
    def root():return RedirectResponse('/docs')
    @app.get('/api/live/providers')
    def providers(city:Literal['Hyderabad','Bengaluru','Bangalore']|None=None,product_id:Product|None=None,
                  name:str|None=Query(None,min_length=1,max_length=150),max_published_amount:str|None=None):
        if max_published_amount is not None and product_id is None:raise HTTPException(422,'Select a product before filtering its published price')
        try:budget=money(max_published_amount) if max_published_amount is not None else None
        except ValueError as exc:raise HTTPException(422,str(exc)) from None
        city='Bengaluru' if city=='Bangalore' else city
        selected=[key for key,p in PRODUCTS.items() if (product_id is None or key==product_id) and (city is None or p['city']==city)]
        observations=[];sources=[]
        for key in selected:
            result=fetch(key)
            sources.append({k:result[k] for k in ['product_id','source_url','retrieved_at','source_sha256','parser_version']})
            for row in result['observations']:
                if name and name.strip().casefold() not in row['provider_name'].casefold():continue
                if budget is not None and money(row['published_amount_inr'])>budget:continue
                observations.append(dict(row,product_id=key))
        return {'total':len(observations),'providers':observations,'sources':sources,'data_mode':'live_public_source',
                'notice':'Clinic listings from official provider pages. A published amount is not a confirmed patient quote or hospital tariff.'}
    @app.get('/api/live/published-price/{product_id}/{provider_id}')
    def published_price(product_id:Product,provider_id:str):
        result=fetch(product_id)
        row=next((r for r in result['observations'] if r['provider_id']==provider_id),None)
        if row is None:raise HTTPException(404,'Provider was not found in the current official listing')
        return {'observation':row,'source_url':result['source_url'],'retrieved_at':result['retrieved_at'],
                'source_sha256':result['source_sha256'],'data_mode':'live_public_source','notice':result['notice']}
    @app.get('/api/live/capabilities')
    def capabilities():return {'available':['Live public clinic listing retrieval','Product-specific published price lookup','Source timestamps and audit hashes'],
                               'unavailable_without_authorized_access':['Confirmed hospital quotations','Private insurance coverage authorization','Government beneficiary verification'],
                               'sample_fallback':False,'patient_identifiers_accepted':False,'full_live_project_complete':False}
    return app

app=create_public_app()

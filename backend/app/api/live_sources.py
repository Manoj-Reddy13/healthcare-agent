from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Live-source-only endpoints. No original/mock routes are registered here."""
from pathlib import Path
from typing import Literal
from fastapi import FastAPI,HTTPException
from app.services.live_provider_service import PRODUCTS,LiveListingClient,LiveSourceError,LiveAuditStore

ROOT=BACKEND_ROOT
def create_live_app(client=None,audit_path=None):
    client=client or LiveListingClient();audit=LiveAuditStore(audit_path or ROOT/'.local'/'live-audit.sqlite')
    app=FastAPI(title='Healthcare Live Public Source API',version='1.0.0-live-public',description='Live official-provider listings only; no demo fallback. Production insurance/beneficiary APIs are not configured.')
    @app.get('/api/live/status')
    def status():return {'mode':'live_sources_only','configured_public_products':list(PRODUCTS),'sample_fallback':False,
                        'confirmed_patient_quotes_available':False,'production_insurance_integration':'not_configured',
                        'production_scheme_eligibility_integration':'not_configured','complete_live_project':False}
    @app.get('/api/live/products')
    def products():return {'products':[{'id':key,'source_url':p['url'],'source_product_label':p['expected_heading'],'service_city':p['city']} for key,p in PRODUCTS.items()]}
    @app.get('/api/live/prices/{product_id}')
    def prices(product_id:Literal['mri-knee-single-hyderabad','mri-brain-plain-bengaluru']):
        try:result=client.fetch(product_id)
        except LiveSourceError as exc:raise HTTPException(503,str(exc)) from None
        audit.save(result);return result
    @app.get('/api/live/eligibility/status')
    def eligibility():return {'status':'provider_access_required','eligibility_confirmed':False,
                             'required':'Authorized insurer or government beneficiary-service access and its current API contract. Do not send patient identifiers to this endpoint.'}
    return app

app=create_live_app()

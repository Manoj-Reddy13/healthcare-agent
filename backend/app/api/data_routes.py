from app.models.data_requests import india_today, CostRequest, MatchRequest
from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Standalone additive Member 3 API. Run on port 8001; no original app changes."""
import json
import os
import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from app.services.data_store import money
from app.services.price_service import PriceService
from app.services.eligibility_rules import match_scheme
from app.services.directory_service import search_specialty

ROOT=BACKEND_ROOT



def create_app(database=None,policies=None):
    database=Path(database or os.getenv('MEMBER3_DATABASE',ROOT/'.local'/'healthcare-pilot.sqlite')).resolve()
    policies=[] if policies is None else policies
    if not isinstance(policies,list):raise ValueError('Policy configuration must be a list')
    ids=[p['scheme_id'] for p in policies]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate configured policy ID')
    app=FastAPI(title='Member 3 Healthcare Data API',version='0.3.0',description='Independent evidence-aware data services. No chat or booking implementation.')
    app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_methods=['GET','POST'],allow_headers=['Content-Type'])

    def read(sql,parameters=()):
        try:
            with closing(sqlite3.connect(database.as_uri()+'?mode=ro',uri=True)) as con:
                return con.execute(sql,parameters).fetchall()
        except sqlite3.Error:
            raise HTTPException(503,'Data snapshot is unavailable or incompatible') from None

    def has_prices():return bool(read("SELECT name FROM sqlite_master WHERE type='table' AND name='prices_v2'"))

    @app.get('/api/v2/data/health')
    def health():
        count=read('SELECT count(*) FROM hospitals')[0][0]
        return {'status':'healthy','hospital_count':count,'price_pipeline_available':has_prices(),'configured_policy_count':len(policies),'integrated_with_original_app':False}

    @app.get('/api/v2/data/hospitals')
    def hospitals(city: str|None=Query(None,min_length=1,max_length=100),
                  treatment_id: str|None=Query(None,min_length=1,max_length=150),
                  max_budget_inr: str|None=None,
                  room_type: Literal['General Ward','Semi-Private','Private Room','ICU','Not Applicable']|None=None,
                  billing_unit: Literal['per_procedure','per_consultation','per_scan','per_day']|None=None,
                  comparison_group: str|None=None,
                  on_date: date=Query(default_factory=india_today),
                  specialty: str|None=None,scheme: str|None=None,
                  limit: int=Query(50,ge=1,le=100),offset: int=Query(0,ge=0)):
        if scheme is not None or (specialty is not None and max_budget_inr is None):
            if scheme is not None:raise HTTPException(422,'Scheme filters need sourced hospital participation data')
            available=read("SELECT name FROM sqlite_master WHERE type='table' AND name='directory_specialties_v3'")
            if not available:raise HTTPException(422,'Specialty search needs a directory snapshot')
            if any(x is not None for x in (treatment_id,room_type,billing_unit,comparison_group)):
                raise HTTPException(422,'Specialty filters cannot be combined with price filters yet')
            results=search_specialty(database,specialty,on_date.isoformat(),city)
            return {'total':len(results),'hospitals':results[offset:offset+limit],'status':'sourced'}
        if max_budget_inr is not None:
            if not all([city,treatment_id,room_type,billing_unit,comparison_group]):
                raise HTTPException(422,'Budget search requires city, treatment_id, room_type, billing_unit and comparison_group')
            try:money(max_budget_inr)
            except ValueError as exc:raise HTTPException(422,str(exc)) from None
            if not has_prices():return {'total':0,'hospitals':[],'status':'unavailable','reason':'No reviewed self-pay price dataset'}
            result=PriceService(database).search_with_budget(treatment_id,city,room_type,billing_unit,comparison_group,max_budget_inr,on_date.isoformat())
            if specialty is not None:
                available=read("SELECT name FROM sqlite_master WHERE type='table' AND name='directory_specialties_v3'")
                if not available:raise HTTPException(422,'Combined specialty search needs a directory snapshot')
                eligible={h['hospital_id'] for h in search_specialty(database,specialty,on_date.isoformat(),city)}
                result['matches']=[m for m in result['matches'] if m['hospital_id'] in eligible]
                result['total']=len(result['matches'])
            return {'total':result['total'],'hospitals':result['matches'][offset:offset+limit],'status':'sourced','budget_policy':result['budget_policy']}
        if any(x is not None for x in (treatment_id,room_type,billing_unit,comparison_group)):
            raise HTTPException(422,'Treatment price filters require max_budget_inr; use the cost endpoint for an estimate')
        city={'bangalore':'Bengaluru'}.get(city.strip().lower(),city.strip()) if city else None
        sql="SELECT h.payload FROM hospitals h JOIN cities c USING(city_id) WHERE h.provenance IN ('sourced','verified')"
        args=[]
        if city:sql+=' AND lower(c.name)=lower(?)';args.append(city)
        rows=read(sql+' ORDER BY h.hospital_id',args)
        return {'total':len(rows),'hospitals':[json.loads(r[0]) for r in rows[offset:offset+limit]],'status':'sourced','limit':limit,'offset':offset}

    @app.get('/api/v2/data/treatments')
    def treatments():
        return {'treatments':[json.loads(r[0]) for r in read('SELECT payload FROM treatments ORDER BY treatment_id')],
                'families':[json.loads(r[0]) for r in read('SELECT payload FROM families ORDER BY family_id')]}

    @app.post('/api/v2/data/cost-estimate')
    def estimate(payload:CostRequest):
        if not has_prices():return {'status':'unavailable','observation_count':0,'reason':'No reviewed self-pay price dataset'}
        try:
            return PriceService(database).estimate(payload.treatment_id,payload.city,payload.room_type,payload.billing_unit,payload.comparison_group,payload.on_date.isoformat(),payload.hospital_id)
        except ValueError as exc:raise HTTPException(422,str(exc)) from None

    @app.get('/api/v2/data/schemes')
    def schemes():
        # Research policies are not silently promoted into eligible candidates.
        return {'total':len(policies),'schemes':[{'scheme_id':p['scheme_id'],'release_status':p.get('release_status','draft')} for p in policies],
                'status':'sourced' if policies else 'needs_information','notice':'No confirmed eligibility; reviewed current policy data is still required'}

    @app.post('/api/v2/data/schemes/{scheme_id}/match')
    def match(scheme_id:str,payload:MatchRequest):
        policy=next((p for p in policies if p['scheme_id']==scheme_id),None)
        if policy is None:raise HTTPException(404,'Scheme policy is not configured')
        try:return match_scheme(policy,payload.answers,payload.on_date.isoformat())
        except (ValueError,KeyError,TypeError):raise HTTPException(503,'Configured scheme policy needs review') from None

    return app

app=create_app()

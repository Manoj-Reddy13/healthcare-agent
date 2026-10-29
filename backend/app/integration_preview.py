from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""New integration entry point: original routes plus Member 3 routes, unchanged."""
import importlib
import os
import sys
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from app.api.data_routes import create_app

ROOT=BACKEND_ROOT
DEFAULT_BACKEND=ROOT

def load_original(backend):
    backend=Path(backend).resolve()
    if not (backend/'app'/'main.py').is_file():
        raise RuntimeError('Original backend not found. Set HEALTHCARE_ORIGINAL_BACKEND to the repository backend folder.')
    existing=sys.modules.get('app')
    if existing is not None:
        locations=list(getattr(existing,'__path__',[]))
        if str(backend/'app').lower() not in [str(Path(p).resolve()).lower() for p in locations]:
            raise RuntimeError('Another Python package named app is already loaded; start in a fresh process.')
    sys.path.insert(0,str(backend))
    try:return importlib.import_module('app.main').app
    finally:sys.path.remove(str(backend))

def create_combined_app(backend=None,database=None,policies=None):
    original=load_original(backend or os.getenv('HEALTHCARE_ORIGINAL_BACKEND',DEFAULT_BACKEND))
    data=create_app(database or os.getenv('MEMBER3_DATABASE',ROOT/'.local'/'healthcare-directory-v3.sqlite'),policies)
    app=FastAPI(title='Healthcare Integration Preview',version='0.4.0',
                description='Original application routes preserved; sourced Member 3 services exposed separately under /api/v2/data. This does not switch the existing agent or UI to sourced data.')
    app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3000','http://127.0.0.1:3000'],allow_methods=['GET','POST'],allow_headers=['Content-Type'])
    # Import the existing route implementations rather than copying or replacing them.
    app.include_router(APIRouter(routes=[r for r in original.router.routes if isinstance(r,APIRoute)]))
    app.include_router(APIRouter(routes=[r for r in data.router.routes if isinstance(r,APIRoute)]))

    @app.get('/integration/status')
    def status():
        return {'original_routes':'preserved','member3_routes':'/api/v2/data','shared_server':True,
                'original_ui_uses_sourced_services':False,'original_agent_uses_sourced_services':False,
                'note':'Shared hosting is working; source-aware UI and agent wiring remain pending.'}
    return app

def app_factory():return create_combined_app()

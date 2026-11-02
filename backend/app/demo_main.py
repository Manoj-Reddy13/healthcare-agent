from app.models.demo_requests import DemoCostRequest, ProfileRequest, InsuranceRequest
from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Database-backed college demo, using unchanged original UI and agent selection."""
import importlib,threading
from contextlib import asynccontextmanager,contextmanager
from pathlib import Path
from typing import Literal
from fastapi import APIRouter,HTTPException,Query
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,ConfigDict,Field
from app.api.treatment_references import app_factory as reference_factory
from app.services.demo_data_service import DemoService,build_demo_database,NOTICE
from app.services.llm_service import LLMService

BRIDGE_LOCK=threading.Lock()

@contextmanager
def database_tool_bridge(service):
    """Bind tool bridge for isolated demo server lifetime."""
    if not BRIDGE_LOCK.acquire(blocking=False):
        yield
        return
    try:
        yield
    finally:
        BRIDGE_LOCK.release()

def create_demo_app(database=None,frontend_dist=None):
    app=reference_factory() # Original app is loaded here; no source file is changed.
    service=DemoService(database or build_demo_database())
    ChatRequest=importlib.import_module('app.models.chat').ChatRequest
    ChatResponse=importlib.import_module('app.models.chat').ChatResponse
    Orchestrator=importlib.import_module('app.agent.orchestrator').AgentOrchestrator
    # Only this new application instance receives the database-backed compatibility routes.
    replaced={'/api/hospitals','/api/cost-estimate','/api/schemes','/api/chat','/api/health','/integration/status'}
    app.router.routes=[route for route in app.router.routes if not(isinstance(route,APIRoute) and route.path in replaced)]
    @asynccontextmanager
    async def lifespan(application):
        with database_tool_bridge(service):yield
    app.router.lifespan_context=lifespan
    app.state.demo_service=service
    app.title='CareNav AI Healthcare Platform'
    app.version='1.0.0-demo'
    @app.get('/api/health')
    def health():
        info = LLMService.get_status()
        return {
            'status':'healthy',
            'service':'healthcare-agent-backend',
            'version':'1.0.0-demo',
            'llm_provider': info['active_provider'],
            'model_id': info['model_id'],
            'is_live_llm': info['is_live_llm'],
            'mock_mode': not info['is_live_llm'],
            'database_backed': True,
            'notice': NOTICE
        }
    @app.get('/api/hospitals')
    @app.get('/api/demo/hospitals')
    def hospitals(
        page: int | None = Query(None, ge=1),
        page_size: int | None = Query(None, ge=1, le=100),
        state: str | None = None,
        district: str | None = None,
        city: str | None = None,
        care_type: str | None = None,
        category: str | None = None,
        specialty: str | None = None,
        pincode: str | None = None,
        search: str | None = None,
        sort_by: str | None = 'name_asc',
        scheme: str | None = None,
        procedure: str | None = None,
        max_budget: float | None = Query(None, ge=0, allow_inf_nan=False),
        hospital_type: str | None = None,
        facility: str | None = None,
        accreditation: str | None = None
    ):
        if max_budget is not None and procedure is None:
            return {'total':0,'hospitals':[],'data_mode':'mock','status':'needs_information','reason':'Select a procedure for a meaningful budget search','notice':NOTICE}

        # If real dataset directory filtering or pagination is requested:
        if (state is not None or district is not None or page is not None or page_size is not None
                or care_type is not None or category is not None or pincode is not None
                or (search and len(search.strip()) > 0)):
            from app.services.hospital_service import HospitalService
            return HospitalService.list_imported_hospitals(
                search=search,
                state=state,
                district=district,
                city=city,
                care_type=care_type,
                category=category,
                specialty=specialty,
                pincode=pincode,
                page=page or 1,
                page_size=page_size or 20,
                sort_by=sort_by or 'name_asc'
            )

        try:rows=service.hospitals(city,specialty,scheme,procedure,max_budget)
        except ValueError as exc:raise HTTPException(422,str(exc)) from None
        return {'total':len(rows),'hospitals':rows,'data_mode':'mock','notice':NOTICE}
    @app.post('/api/cost-estimate')
    @app.post('/api/demo/cost-estimate')
    def estimate(payload:DemoCostRequest):
        try:return service.estimate(payload.procedure,payload.city,payload.room_type,payload.hospital_id)
        except ValueError as exc:raise HTTPException(422,str(exc)) from None
    @app.get('/api/schemes')
    @app.get('/api/demo/schemes')
    def schemes(state:str|None=None,category:str|None=None,specialty:str|None=None,income_bracket:str|None=None):
        rows=service.schemes(state,category,specialty)
        if income_bracket in ('bpl','low'):rows.sort(key=lambda s:s['income_ceiling_inr'] is None)
        return {'total':len(rows),'schemes':rows,'data_mode':'mock','notice':NOTICE+' Income bracket only orders these fixtures; it does not establish eligibility.'}
    @app.post('/api/demo/schemes/{scheme_id}/match')
    def match(scheme_id:str,payload:ProfileRequest):
        try:return service.match_scheme(scheme_id,payload.profile,payload.hospital_id,payload.specialty)
        except ValueError as exc:raise HTTPException(422,str(exc)) from None
    @app.post('/api/demo/insurance/match')
    def insurance(payload:InsuranceRequest):
        try:return service.insurance(payload.hospital_id,payload.specialty,payload.cost_inr)
        except ValueError as exc:raise HTTPException(422,str(exc)) from None
    @app.get('/api/demo/treatments')
    def treatments():return {'treatments':service.catalog(),'data_mode':'mock','notice':NOTICE}

    def chat(payload):
        try:
            return Orchestrator.process_message(payload.message, payload.session_id)
        except Exception as exc:
            return ChatResponse(answer=f"Service Error: {str(exc)}", data_mode="offline-rule-agent")

    chat.__annotations__={'payload':ChatRequest}
    app.post('/api/chat',response_model=ChatResponse)(chat)
    @app.get('/integration/status')
    def status():
        info = LLMService.get_status()
        return {
            'mode':'production_healthcare_platform',
            'database_backed_legacy_routes':True,
            'llm_provider': info['active_provider'],
            'model_id': info['model_id'],
            'is_live_llm': info['is_live_llm'],
            'notice':NOTICE
        }
    dist=Path(frontend_dist) if frontend_dist else BACKEND_ROOT/'.local'/'demo-ui'/'dist'
    if (dist/'index.html').is_file():
        app.router.routes=[r for r in app.router.routes if not(isinstance(r,APIRoute) and r.path=='/')]
        app.mount('/',StaticFiles(directory=dist,html=True),name='unchanged-original-frontend')
    return app

def app_factory():return create_demo_app()

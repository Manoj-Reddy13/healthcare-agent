from fastapi import APIRouter
from app.api.chat import router as chat_router
from app.api.hospitals import router as hospitals_router
from app.api.costs import router as costs_router
from app.api.schemes import router as schemes_router
from app.api.appointments import router as appointments_router
from app.api.sources import router as sources_router
from app.api.plans import router as plans_router
from app.api.insurers import router as insurers_router
from app.api.diseases import router as diseases_router
from app.api.network import router as network_router
from app.api.calculator import router as calculator_router

api_router = APIRouter()

api_router.include_router(chat_router, tags=["Chat Agent"])
api_router.include_router(hospitals_router, tags=["Hospitals"])
api_router.include_router(costs_router, tags=["Cost Estimates"])
api_router.include_router(schemes_router, tags=["Healthcare Schemes"])
api_router.include_router(appointments_router, tags=["Appointments"])
api_router.include_router(sources_router, tags=["Data Sources"])
api_router.include_router(plans_router, tags=["Healthcare Plans"])
api_router.include_router(insurers_router, tags=["Health Insurance"])
api_router.include_router(diseases_router, tags=["Diseases & Procedures"])
api_router.include_router(network_router, tags=["Hospital-Insurance Network"])
api_router.include_router(calculator_router, tags=["Out of Pocket Calculator"])

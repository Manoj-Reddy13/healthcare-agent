from typing import Any
from fastapi import APIRouter
from app.services.source_service import SourceService

router = APIRouter()

@router.get("/sources", summary="Authoritative healthcare data source registry")
def list_sources() -> dict[str, Any]:
    sources = SourceService.get_registered_sources()
    return {
        "total": len(sources),
        "sources": sources,
        "disclaimer": "This registry documents authoritative public health references, gazette orders, and hospital published schedules indexed by CareNav AI."
    }

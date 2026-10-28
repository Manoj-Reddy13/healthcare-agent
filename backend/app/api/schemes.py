from typing import Optional
from fastapi import APIRouter, Query
from app.models.scheme import SchemeListResponse
from app.services.scheme_service import SchemeService

router = APIRouter()

@router.get("/schemes", response_model=SchemeListResponse, summary="Query public healthcare schemes")
def list_schemes(
    income_bracket: Optional[str] = Query(None, description="e.g. 'bpl', 'low'"),
    state: Optional[str] = Query(None, description="State filter (e.g. 'Telangana')"),
    category: Optional[str] = Query(None, description="Scheme category")
) -> SchemeListResponse:
    schemes = SchemeService.find_healthcare_schemes(
        income_bracket=income_bracket,
        state=state,
        category=category
    )
    return SchemeListResponse(
        total=len(schemes),
        schemes=schemes,
        data_mode="mock"
    )

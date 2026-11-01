from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.scheme import (
    HealthcareScheme,
    SchemeListResponse,
    SchemeEligibilityRequest,
    SchemeEligibilityResponse
)
from app.services.scheme_service import SchemeService

router = APIRouter()

@router.get("/schemes", response_model=SchemeListResponse, summary="Query public healthcare schemes")
def list_schemes(
    income_bracket: Optional[str] = Query(None, description="e.g. 'bpl', 'low'"),
    state: Optional[str] = Query(None, description="State filter (e.g. 'Telangana')"),
    category: Optional[str] = Query(None, description="Scheme category"),
    specialty: Optional[str] = Query(None, description="Medical specialty covered")
) -> SchemeListResponse:
    schemes = SchemeService.find_healthcare_schemes(
        income_bracket=income_bracket,
        state=state,
        category=category,
        specialty=specialty
    )
    return SchemeListResponse(
        total=len(schemes),
        schemes=schemes,
        data_mode="mock"
    )

@router.get("/schemes/{scheme_id}", response_model=HealthcareScheme, summary="Retrieve single scheme details")
def get_scheme_detail(scheme_id: str) -> HealthcareScheme:
    scheme = SchemeService.get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme with ID '{scheme_id}' not found.")
    return scheme

@router.post("/schemes/check-eligibility", response_model=SchemeEligibilityResponse, summary="Guided eligibility evaluation")
def evaluate_eligibility(payload: SchemeEligibilityRequest) -> SchemeEligibilityResponse:
    return SchemeService.check_eligibility(payload)

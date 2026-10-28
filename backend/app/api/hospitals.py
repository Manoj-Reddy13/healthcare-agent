from typing import Optional
from fastapi import APIRouter, Query
from app.models.hospital import HospitalListResponse
from app.services.hospital_service import HospitalService

router = APIRouter()

@router.get("/hospitals", response_model=HospitalListResponse, summary="Filter and search hospitals")
def list_hospitals(
    city: Optional[str] = Query(None, description="City name filter (e.g., 'Hyderabad', 'Bengaluru')"),
    specialty: Optional[str] = Query(None, description="Medical specialty filter (e.g., 'Cardiology')"),
    max_budget: Optional[float] = Query(None, description="Upper ceiling for treatment cost"),
    scheme: Optional[str] = Query(None, description="Filter by accepted scheme name (e.g., 'Aarogyasri')")
) -> HospitalListResponse:
    hospitals = HospitalService.search_hospitals(
        city=city,
        specialty=specialty,
        max_budget=max_budget,
        scheme=scheme
    )
    return HospitalListResponse(
        total=len(hospitals),
        hospitals=hospitals,
        data_mode="mock"
    )

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.hospital import Hospital, HospitalListResponse
from app.services.hospital_service import HospitalService

router = APIRouter()

@router.get("/hospitals/compare", summary="Compare multiple hospitals side-by-side")
def compare_hospitals_endpoint(
    hospital_ids: list[str] = Query(..., description="List of hospital IDs to compare"),
    procedure: Optional[str] = Query("Angioplasty", description="Procedure name to benchmark")
) -> dict[str, Any]:
    return HospitalService.compare_hospitals(hospital_ids=hospital_ids, procedure=procedure)

@router.get("/hospitals/{hospital_id}", response_model=Hospital, summary="Retrieve single hospital details")
def get_hospital_detail(hospital_id: str) -> Hospital:
    hosp = HospitalService.get_hospital_by_id(hospital_id)
    if not hosp:
        raise HTTPException(status_code=404, detail=f"Hospital with ID '{hospital_id}' not found.")
    return hosp

@router.get("/hospitals", response_model=HospitalListResponse, summary="Filter and search hospitals")
def list_hospitals(
    city: Optional[str] = Query(None, description="City name filter (e.g., 'Hyderabad', 'Bengaluru')"),
    specialty: Optional[str] = Query(None, description="Medical specialty filter (e.g., 'Cardiology')"),
    max_budget: Optional[float] = Query(None, description="Upper ceiling for treatment cost"),
    scheme: Optional[str] = Query(None, description="Filter by accepted scheme name (e.g., 'Aarogyasri')"),
    pincode: Optional[str] = Query(None, description="Postal PIN code (e.g., '500033')"),
    locality: Optional[str] = Query(None, description="Neighborhood or area (e.g., 'Jubilee Hills')"),
    hospital_type: Optional[str] = Query(None, description="'Government', 'Private', 'Trust'"),
    facility: Optional[str] = Query(None, description="Key facility (e.g., 'Cath Lab', 'ICU')"),
    accreditation: Optional[str] = Query(None, description="'NABH', 'JCI', 'NABL'"),
    sort_by: Optional[str] = Query("relevance", description="'relevance', 'rating', 'distance', 'cost_low_to_high'")
) -> HospitalListResponse:
    hospitals = HospitalService.search_hospitals(
        city=city,
        specialty=specialty,
        max_budget=max_budget,
        scheme=scheme,
        pincode=pincode,
        locality=locality,
        hospital_type=hospital_type,
        facility=facility,
        accreditation=accreditation,
        sort_by=sort_by
    )
    return HospitalListResponse(
        total=len(hospitals),
        hospitals=hospitals,
        data_mode="mock"
    )

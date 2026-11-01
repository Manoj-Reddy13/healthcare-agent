from typing import Any, Optional, Union
from fastapi import APIRouter, HTTPException, Query
from app.models.hospital import (
    Hospital, HospitalListResponse, ImportedHospital,
    PaginatedHospitalResponse, HospitalFilterOptions, HospitalStatistics
)
from app.services.hospital_service import HospitalService

router = APIRouter()

@router.get("/hospitals/filters", response_model=HospitalFilterOptions, summary="Retrieve available filter options from hospital dataset")
def get_hospital_filters(
    state: Optional[str] = Query(None, description="State to filter districts for")
) -> HospitalFilterOptions:
    return HospitalService.get_filter_options(state=state)

@router.get("/hospitals/statistics", response_model=HospitalStatistics, summary="Retrieve dataset statistics and ingestion metadata")
def get_hospital_statistics() -> HospitalStatistics:
    return HospitalService.get_statistics()

@router.get("/hospitals/search", response_model=list[ImportedHospital], summary="Keyword search across hospital dataset")
def search_hospitals_keyword(
    query: str = Query(..., min_length=1, description="Search keyword (name, location, district, specialty)"),
    state: Optional[str] = Query(None, description="Optional State filter"),
    district: Optional[str] = Query(None, description="Optional District filter"),
    limit: int = Query(20, ge=1, le=100, description="Max results to return")
) -> list[ImportedHospital]:
    return HospitalService.search_keyword(query=query, state=state, district=district, limit=limit)

@router.get("/hospitals/compare", summary="Compare multiple hospitals side-by-side")
def compare_hospitals_endpoint(
    hospital_ids: list[str] = Query(..., description="List of hospital IDs to compare"),
    procedure: Optional[str] = Query("Angioplasty", description="Procedure name to benchmark")
) -> dict[str, Any]:
    return HospitalService.compare_hospitals(hospital_ids=hospital_ids, procedure=procedure)

@router.get("/hospitals/{hospital_id}", response_model=Union[ImportedHospital, Hospital], summary="Retrieve single hospital details")
def get_hospital_detail(hospital_id: str):
    # Check imported real directory first
    imported = HospitalService.get_imported_hospital_by_id(hospital_id)
    if imported:
        return imported

    # Fallback to legacy curated records
    legacy = HospitalService.get_hospital_by_id(hospital_id)
    if legacy:
        return legacy

    raise HTTPException(status_code=404, detail=f"Hospital with ID '{hospital_id}' not found.")

@router.get("/hospitals", summary="Filter and search hospitals (supporting both paginated directory and legacy contracts)")
def list_hospitals(
    page: Optional[int] = Query(None, ge=1, description="Page number for pagination"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Page size"),
    state: Optional[str] = Query(None, description="State name (e.g., 'Telangana', 'Maharashtra')"),
    district: Optional[str] = Query(None, description="District name (e.g., 'Hyderabad', 'Pune')"),
    city: Optional[str] = Query(None, description="City / Locality filter"),
    care_type: Optional[str] = Query(None, description="Hospital Care Type (e.g., 'Hospital', 'Dispensary')"),
    category: Optional[str] = Query(None, description="Category ('Private', 'Public/ Government')"),
    specialty: Optional[str] = Query(None, description="Medical specialty filter"),
    pincode: Optional[str] = Query(None, description="Postal PIN code"),
    search: Optional[str] = Query(None, description="Free text search query"),
    sort_by: Optional[str] = Query("name_asc", description="Sort order"),
    max_budget: Optional[float] = Query(None, description="Legacy budget ceiling"),
    scheme: Optional[str] = Query(None, description="Legacy scheme filter"),
    locality: Optional[str] = Query(None, description="Legacy locality filter"),
    hospital_type: Optional[str] = Query(None, description="Legacy hospital type"),
    facility: Optional[str] = Query(None, description="Legacy facility filter"),
    accreditation: Optional[str] = Query(None, description="Legacy accreditation filter")
):
    # If caller requests pagination or dataset-specific filters, use the real 30,000+ hospital database
    if (page is not None or page_size is not None or state is not None or district is not None
            or care_type is not None or category is not None or (search and len(search) > 0)):
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
            sort_by=sort_by or "name_asc"
        )

    # Legacy contract fallback for existing mock/benchmarking test client
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
        sort_by=sort_by or "relevance"
    )
    return HospitalListResponse(
        total=len(hospitals),
        hospitals=hospitals,
        data_mode="mock"
    )

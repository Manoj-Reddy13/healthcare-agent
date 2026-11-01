from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.disease import Disease, ProcedureItem, DiseaseDetailResponse
from app.services.disease_service import DiseaseService

router = APIRouter()

@router.get("/diseases", response_model=list[Disease], summary="List and search diseases")
def list_diseases(
    search: Optional[str] = Query(None, description="Search term in disease name or symptom"),
    specialty: Optional[str] = Query(None, description="Filter by clinical specialty")
) -> list[Disease]:
    return DiseaseService.list_diseases(search=search, specialty=specialty)

@router.get("/diseases/{disease_id}", response_model=DiseaseDetailResponse, summary="Get disease details with recommended hospitals")
def get_disease(disease_id: str) -> DiseaseDetailResponse:
    res = DiseaseService.get_disease_by_id(disease_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Disease '{disease_id}' not found.")
    return res

@router.get("/procedures", response_model=list[ProcedureItem], summary="List medical procedures and package benchmarks")
def list_procedures(
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    disease_id: Optional[str] = Query(None, description="Filter by disease ID")
) -> list[ProcedureItem]:
    return DiseaseService.list_procedures(specialty=specialty, disease_id=disease_id)

@router.get("/procedures/{procedure_id}", response_model=ProcedureItem, summary="Get details for a specific procedure")
def get_procedure(procedure_id: str) -> ProcedureItem:
    proc = DiseaseService.get_procedure_by_id(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")
    return proc

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.insurance import (
    Insurer, InsurancePolicy, PolicyComparisonRequest, PolicyComparisonResponse
)
from app.services.insurance_service import InsuranceService

router = APIRouter()

@router.get("/insurers", response_model=list[Insurer], summary="List all verified Indian health insurers")
def list_insurers() -> list[Insurer]:
    return InsuranceService.list_insurers()

@router.get("/insurers/{insurer_id}", response_model=Insurer, summary="Get details for a specific insurer")
def get_insurer(insurer_id: str) -> Insurer:
    insurer = InsuranceService.get_insurer_by_id(insurer_id)
    if not insurer:
        raise HTTPException(status_code=404, detail=f"Insurer '{insurer_id}' not found.")
    return insurer

@router.get("/policies", response_model=list[InsurancePolicy], summary="List and filter health insurance policies")
def list_policies(
    insurer_id: Optional[str] = Query(None, description="Filter by insurer ID"),
    policy_type: Optional[str] = Query(None, description="Filter by policy type (e.g. 'Comprehensive')"),
    min_sum_insured: Optional[float] = Query(None, description="Minimum sum insured tier")
) -> list[InsurancePolicy]:
    return InsuranceService.list_policies(
        insurer_id=insurer_id,
        policy_type=policy_type,
        min_sum_insured=min_sum_insured
    )

@router.get("/policies/{policy_id}", response_model=InsurancePolicy, summary="Get details for a specific policy")
def get_policy(policy_id: str) -> InsurancePolicy:
    policy = InsuranceService.get_policy_by_id(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")
    return policy

@router.post("/policies/compare", response_model=PolicyComparisonResponse, summary="Compare 2 to 4 policies side-by-side")
def compare_policies(payload: PolicyComparisonRequest) -> PolicyComparisonResponse:
    try:
        return InsuranceService.compare_policies(payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

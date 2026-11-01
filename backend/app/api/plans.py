from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.plan import HealthcarePlanRequest, HealthcarePlan
from app.services.plan_service import PlanService

router = APIRouter()

@router.post("/plans/generate", response_model=HealthcarePlan, summary="Generate unified personalized care plan")
def generate_healthcare_plan(payload: HealthcarePlanRequest) -> HealthcarePlan:
    return PlanService.generate_plan(payload)

@router.get("/plans/{plan_id}", response_model=HealthcarePlan, summary="Retrieve saved healthcare plan")
def get_healthcare_plan(plan_id: str) -> HealthcarePlan:
    plan = PlanService.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Healthcare plan with ID '{plan_id}' not found.")
    return plan

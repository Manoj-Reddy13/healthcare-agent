from fastapi import APIRouter
from app.models.cost import CostEstimateRequest, CostEstimate
from app.services.cost_service import CostService

router = APIRouter()

@router.post("/cost-estimate", response_model=CostEstimate, summary="Calculate procedure cost estimates")
def calculate_cost_estimate(payload: CostEstimateRequest) -> CostEstimate:
    return CostService.estimate_treatment_cost(
        procedure=payload.procedure,
        city=payload.city,
        room_type=payload.room_type
    )

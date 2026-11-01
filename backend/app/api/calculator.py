from typing import Any
from fastapi import APIRouter
from app.models.calculator import OutOfPocketRequest, OutOfPocketResponse
from app.services.calculator_service import CalculatorService

router = APIRouter()

@router.post("/calculator/out-of-pocket", response_model=OutOfPocketResponse, summary="Calculate indicative out-of-pocket medical bill")
def calculate_out_of_pocket(payload: OutOfPocketRequest) -> OutOfPocketResponse:
    return CalculatorService.calculate_out_of_pocket(payload)


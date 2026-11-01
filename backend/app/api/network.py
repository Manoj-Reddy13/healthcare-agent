from typing import Any
from fastapi import APIRouter
from app.models.network import NetworkMatchRequest, NetworkMatchResponse
from app.services.network_service import NetworkService

router = APIRouter()

@router.post("/network/match", response_model=NetworkMatchResponse, summary="Match hospital and insurance network")
def match_hospital_insurance_network(payload: NetworkMatchRequest) -> NetworkMatchResponse:
    return NetworkService.match_network(payload)

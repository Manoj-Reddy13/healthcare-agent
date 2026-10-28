from fastapi import APIRouter
from app.models.appointment import AppointmentConfirmRequest, AppointmentConfirmResponse
from app.services.appointment_service import AppointmentService

router = APIRouter()

@router.post("/appointments/confirm", response_model=AppointmentConfirmResponse, summary="Confirm simulated appointment booking")
def confirm_appointment_endpoint(payload: AppointmentConfirmRequest) -> AppointmentConfirmResponse:
    """
    Registers a simulated booking for educational/demo purposes.
    Requires user_confirmed: true.
    """
    return AppointmentService.confirm_appointment(payload)

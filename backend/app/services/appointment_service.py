import random
from fastapi import HTTPException
from app.models.appointment import AppointmentConfirmRequest, AppointmentConfirmResponse
from app.services.hospital_service import HospitalService

class AppointmentService:
    @staticmethod
    def confirm_appointment(data: AppointmentConfirmRequest) -> AppointmentConfirmResponse:
        if not data.user_confirmed:
            raise HTTPException(
                status_code=400,
                detail="Explicit user confirmation is required (user_confirmed: true) before registering an appointment request."
            )

        hospital = HospitalService.get_hospital_by_id(data.hospital_id)
        hospital_name = hospital.name if hospital else f"Hospital ID ({data.hospital_id})"

        sim_number = random.randint(1000, 9999)
        confirmation_id = f"SIM-APT-2026-{sim_number}"

        return AppointmentConfirmResponse(
            confirmation_id=confirmation_id,
            status="simulated_confirmed",
            hospital_name=hospital_name,
            patient_name=data.patient_name,
            specialty=data.specialty,
            preferred_date=data.preferred_date,
            is_simulated=True,
            instructions=(
                "ACADEMIC DEMO NOTICE: This is an educational project simulation. "
                "No live clinical slot has been booked at the hospital. "
                "For actual medical appointments, contact the hospital reception directly with official identification."
            ),
            message="Simulated appointment request registered successfully for demonstration."
        )

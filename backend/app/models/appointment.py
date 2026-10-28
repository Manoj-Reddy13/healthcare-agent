from typing import Optional
from pydantic import BaseModel, Field

class AppointmentConfirmRequest(BaseModel):
    hospital_id: str = Field(..., description="Target hospital identifier")
    patient_name: str = Field(..., min_length=2, description="Patient's full name")
    patient_phone: str = Field(..., min_length=7, description="Contact phone number")
    specialty: str = Field(..., description="Department or specialty needed")
    preferred_date: str = Field(..., description="Desired appointment date (YYYY-MM-DD)")
    notes: Optional[str] = Field(default=None, description="Optional brief notes on symptoms or doctor preference")
    user_confirmed: bool = Field(..., description="Explicit user confirmation for simulation")

class AppointmentConfirmResponse(BaseModel):
    confirmation_id: str
    status: str
    hospital_name: str
    patient_name: str
    specialty: str
    preferred_date: str
    is_simulated: bool = True
    instructions: str
    message: str

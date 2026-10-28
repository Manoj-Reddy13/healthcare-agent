from typing import Literal
from pydantic import BaseModel, Field

class Hospital(BaseModel):
    id: str = Field(..., description="Unique hospital identifier")
    name: str = Field(..., description="Name of the hospital")
    city: str = Field(..., description="City where the hospital is located")
    address: str = Field(..., description="Full address or area")
    phone: str = Field(..., description="Contact phone number")
    specialties: list[str] = Field(default_factory=list, description="Available medical specialties")
    indicative_costs: dict[str, float] = Field(
        default_factory=dict,
        description="Indicative treatment/consultation pricing map"
    )
    rating: float = Field(..., ge=1.0, le=5.0, description="Patient feedback rating")
    distance_km: float = Field(..., ge=0.0, description="Approximate distance in km from central transit")
    accepted_schemes: list[str] = Field(default_factory=list, description="Supported health schemes/insurance")
    accreditation: list[str] = Field(default_factory=list, description="Accreditations (NABH, JCI, etc.)")
    verified: bool = Field(default=False, description="Verification status")
    data_mode: Literal["mock", "verified"] = Field(default="mock", description="Record fidelity indicator")

class HospitalListResponse(BaseModel):
    total: int
    hospitals: list[Hospital]
    data_mode: Literal["mock", "verified"] = "mock"

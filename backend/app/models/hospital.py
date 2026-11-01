from typing import Literal, Optional
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
    hospital_type: Optional[str] = Field(default="Private", description="Hospital category (Private, Government, Trust)")
    pincode: Optional[str] = Field(default=None, description="Postal PIN code")
    locality: Optional[str] = Field(default=None, description="Locality or neighborhood")
    facilities: list[str] = Field(default_factory=list, description="Key hospital facilities")
    empanelled_schemes_verified: list[str] = Field(default_factory=list, description="Verified empanelled public schemes")
    latitude: Optional[float] = Field(default=None, description="Geographic latitude")
    longitude: Optional[float] = Field(default=None, description="Geographic longitude")
    directions_url: Optional[str] = Field(default=None, description="Map or directions link")
    website: Optional[str] = Field(default=None, description="Official portal link")
    data_source: Optional[str] = Field(default="National Health Authority / State Healthcare Portals", description="Data provenance")
    last_updated: Optional[str] = Field(default="2026-10-29", description="Last audit date")

class HospitalListResponse(BaseModel):
    total: int
    hospitals: list[Hospital]
    data_mode: Literal["mock", "verified"] = "mock"

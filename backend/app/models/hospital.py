from typing import Any, Literal, Optional
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
    data_mode: Literal["mock", "verified"] = Field(..., description="Record fidelity indicator")
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

class ImportedHospital(BaseModel):
    id: str = Field(..., description="Standard identifier (e.g. nhp-1234 or hosp-hyd-01)")
    sr_no: Optional[int] = None
    name: str = Field(..., description="Hospital Name")
    state: str = Field(..., description="State Name")
    district: str = Field(..., description="District Name")
    subdistrict: Optional[str] = "Not available"
    pincode: Optional[str] = "Not available"
    location: Optional[str] = "Not available"
    address: Optional[str] = "Not available"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    care_type: str = Field(default="Not available", description="Hospital / Clinic / CHC / Dispensary")
    category: str = Field(default="Not available", description="Private / Public Government")
    discipline: str = Field(default="Not available", description="Allopathic / Ayush")
    telephone: Optional[str] = "Not available"
    mobile_number: Optional[str] = "Not available"
    emergency_num: Optional[str] = "Not available"
    ambulance_phone: Optional[str] = "Not available"
    bloodbank_phone: Optional[str] = "Not available"
    tollfree: Optional[str] = "Not available"
    helpline: Optional[str] = "Not available"
    email: Optional[str] = "Not available"
    website: Optional[str] = "Not available"
    specialties: list[str] = Field(default_factory=list)
    facilities: list[str] = Field(default_factory=list)
    accreditation: str = Field(default="Not available", description="Recorded accreditation (NABH, etc. or Not available)")
    established_year: Optional[int] = None
    total_beds: Optional[int] = None
    data_source: str = "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)"
    import_date: str = "2026-11-01"
    directions_url: Optional[str] = None
    empanelled_schemes: list[str] = Field(default_factory=list, description="Empanelled schemes where verifiable")

class PaginatedHospitalResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    hospitals: list[ImportedHospital]
    data_source: str = "National Health Portal (NHP) Open Government Data CSV"
    filters_applied: dict[str, Any] = Field(default_factory=dict)

class HospitalFilterOptions(BaseModel):
    states: list[str]
    districts: list[str]
    care_types: list[str]
    categories: list[str]
    popular_specialties: list[str]
    total_hospitals: int

class HospitalStatistics(BaseModel):
    total_hospitals: int
    states_count: int
    districts_count: int
    hospitals_with_phone: int
    hospitals_with_coordinates: int
    hospitals_with_specialties: int
    top_states: list[dict[str, Any]]
    care_types: list[dict[str, Any]]
    categories: list[dict[str, Any]]
    source_info: dict[str, Any]

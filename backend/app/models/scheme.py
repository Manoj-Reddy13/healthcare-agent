from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

SchemeCategory = Literal["Government", "State", "Social Security", "Private Subsidized"]

class HealthcareScheme(BaseModel):
    id: str
    name: str
    short_code: str
    category: SchemeCategory
    coverage_limit: float
    eligibility_summary: str
    covered_specialties: list[str]
    income_ceiling_inr: Optional[float] = None
    official_portal: str
    claim_process_summary: str
    data_mode: Literal["mock", "verified"] = "mock"
    beneficiary_categories: Optional[list[str]] = None
    required_documents: Optional[list[str]] = None
    participating_hospitals_count: Optional[int] = None
    official_source: Optional[str] = None
    last_updated: Optional[str] = "2026-10-29"

class SchemeListResponse(BaseModel):
    total: int
    schemes: list[HealthcareScheme]
    data_mode: Literal["mock", "verified"] = "mock"

class SchemeEligibilityRequest(BaseModel):
    age: int = Field(..., ge=0, le=120, description="Beneficiary age")
    state: str = Field(default="Telangana", description="State of residence")
    has_ration_card: bool = Field(default=False, description="Holds Food Security / Ration card")
    ration_card_type: Optional[str] = Field(default="White / Food Security", description="Card type")
    annual_income: Optional[float] = Field(default=150000.0, ge=0, description="Annual household income in INR")
    category: Optional[str] = Field(default="General", description="Social category (General, BPL, EWS, SC, ST, OBC)")
    is_senior: Optional[bool] = Field(default=False, description="Age 70 or above")

class SchemeEligibilityMatch(BaseModel):
    scheme_id: str
    scheme_name: str
    short_code: str
    is_eligible: bool
    eligibility_status: Literal["Likely Eligible", "Conditionally Eligible", "Not Eligible"]
    coverage_limit: float
    reasons: list[str]
    required_documents: list[str]
    application_process: str
    official_portal: str

class SchemeEligibilityResponse(BaseModel):
    user_state: str
    matches: list[SchemeEligibilityMatch]
    total_eligible: int
    guidance: str
    disclaimer: str

from typing import Literal, Optional
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

class SchemeListResponse(BaseModel):
    total: int
    schemes: list[HealthcareScheme]
    data_mode: Literal["mock", "verified"] = "mock"

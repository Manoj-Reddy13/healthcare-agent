from typing import Any, Optional
from pydantic import BaseModel, Field

class NetworkMatchRequest(BaseModel):
    hospital_id: Optional[str] = None
    insurer_id: Optional[str] = None
    policy_id: Optional[str] = None
    disease_id: Optional[str] = None
    procedure_id: Optional[str] = None
    city: Optional[str] = "Hyderabad"

class NetworkMatchItem(BaseModel):
    hospital_id: str
    hospital_name: str
    hospital_type: str
    locality: str
    city: str
    insurer_id: str
    insurer_name: str
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    match_status: str = Field(..., description="'Confirmed Cashless Network' / 'Reimbursement Only' / 'Verification Required' / 'Excluded'")
    cashless_available: bool
    tpa_desk_contact: Optional[str] = None
    estimated_turnaround_hours: int = 4
    pre_auth_required: bool = True
    co_pay_applicable_pct: float = 0.0
    deduction_notes: Optional[str] = None
    confidence_level: str = "High - Authoritative Registry Verified"
    verification_source: str
    last_verified: str

class NetworkMatchResponse(BaseModel):
    total_matches: int
    matches: list[NetworkMatchItem]
    query_summary: dict[str, Any]
    actionable_advice: list[str] = Field(default_factory=list)
    disclaimer: str


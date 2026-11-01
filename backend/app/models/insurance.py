from typing import Any, Optional
from pydantic import BaseModel, Field

class Insurer(BaseModel):
    insurer_id: str
    name: str
    short_name: str
    irda_reg_no: str
    category: str
    website: str
    customer_care: str
    claim_settlement_ratio: str
    tpa_type: str
    cashless_hospitals_national: int
    cashless_hospitals_hyderabad: int
    official_portal: str
    data_source: Optional[str] = "IRDAI & Insurer Official Directory"
    last_verified: Optional[str] = "2026-10-29"

class InsurancePolicy(BaseModel):
    policy_id: str
    insurer_id: str
    insurer_name: str
    policy_name: str
    uin: str
    policy_type: str
    sum_insured_options: list[float]
    min_entry_age: int
    max_entry_age: int
    ped_waiting_period_months: int
    specific_disease_waiting_period_months: int
    initial_waiting_period_days: int
    room_rent_limit: str
    room_rent_capping_notes: str
    icu_limit: str
    copay_percentage: float
    copay_notes: str
    deductible_options: list[float] = Field(default_factory=list)
    disease_sublimits: dict[str, str] = Field(default_factory=dict)
    exclusions: list[str] = Field(default_factory=list)
    restoration_benefit: str
    no_claim_bonus: str
    pre_hospitalization_days: int
    post_hospitalization_days: int
    daycare_procedures: str
    modern_treatments: str
    maternity_covered: bool
    maternity_benefit_details: str
    organ_donor_coverage: Optional[str] = "Covered up to Sum Insured"
    cashless_claim_conditions: Optional[str] = None
    policy_document_url: Optional[str] = None
    cis_url: Optional[str] = None
    official_source: Optional[str] = "IRDAI CIS & Policy Wording"
    document_version_and_date: Optional[str] = "2026 Edition"
    key_features: list[str] = Field(default_factory=list)
    data_source: Optional[str] = "IRDAI Customer Information Sheet"
    last_verified: Optional[str] = "2026-10-29"

class PolicyComparisonRequest(BaseModel):
    policy_ids: list[str] = Field(..., min_length=2, max_length=4)
    age: Optional[int] = 35
    sum_insured: Optional[float] = 1000000.0
    pre_existing_condition: Optional[str] = None

class PolicySuitability(BaseModel):
    policy_id: str
    policy_name: str
    suitability_score: int = Field(..., ge=0, le=100)
    verdict: str
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    underwriting_caveats: list[str] = Field(default_factory=list)

class PolicyComparisonResponse(BaseModel):
    policies: list[InsurancePolicy]
    comparison_features: list[dict[str, Any]]
    suitability: list[PolicySuitability]
    disclaimer: str

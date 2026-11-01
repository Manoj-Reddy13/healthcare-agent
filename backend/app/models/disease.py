from typing import Any, Optional
from pydantic import BaseModel, Field

class ProcedureItem(BaseModel):
    procedure_id: str
    name: str
    clinical_category: str
    typical_stay_days: int
    indicative_cost_min: float
    indicative_cost_max: float
    average_cost: float
    pmjay_package_code: Optional[str] = None
    pmjay_package_rate: Optional[float] = None
    pmjay_status: str
    aarogyasri_package_code: Optional[str] = None
    aarogyasri_package_rate: Optional[float] = None
    aarogyasri_status: str
    insurance_coverage_status: str
    insurance_waiting_period_months: int
    insurance_waiting_period_type: str
    sublimits_notes: str
    non_payable_expenses_inr: float
    non_payable_items: list[str] = Field(default_factory=list)
    recommended_hospital_ids: list[str] = Field(default_factory=list)
    official_source: str

class Disease(BaseModel):
    disease_id: str
    name: str
    icd_code: str
    specialty: str
    description: str
    procedures: list[ProcedureItem] = Field(default_factory=list)

class DiseaseDetailResponse(BaseModel):
    disease: Disease
    procedures: list[ProcedureItem]
    recommended_hospitals: list[dict[str, Any]]

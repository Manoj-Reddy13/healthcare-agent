from typing import Any, Optional
from pydantic import BaseModel, Field

class HealthcarePlanRequest(BaseModel):
    treatment: str = Field(..., min_length=2, description="Target treatment or procedure (e.g. 'Angioplasty')")
    city: str = Field(default="Hyderabad", description="Target city")
    budget: Optional[float] = Field(default=200000.0, ge=0, description="User budget ceiling in INR")
    room_type: str = Field(default="Semi-Private", description="Preferred room category")
    hospital_id: Optional[str] = Field(default=None, description="Preferred hospital ID if selected")
    has_insurance: bool = Field(default=False, description="Whether user holds private health insurance")
    has_ration_card: bool = Field(default=False, description="Whether user holds Food Security / White Ration Card")
    is_senior_citizen: bool = Field(default=False, description="Whether patient is aged 70 or above")

class PlanPreparationStep(BaseModel):
    step: int
    title: str
    description: str
    documents_needed: list[str] = Field(default_factory=list)

class HealthcarePlan(BaseModel):
    plan_id: str
    created_at: str
    treatment: str
    city: str
    budget: float
    room_type: str
    estimated_cost_min: float
    estimated_cost_max: float
    average_cost: float
    itemized_breakdown: dict[str, float]
    selected_hospital: Optional[dict[str, Any]] = None
    recommended_hospitals: list[dict[str, Any]] = Field(default_factory=list)
    applicable_schemes: list[dict[str, Any]] = Field(default_factory=list)
    potential_coverage_max: float
    estimated_out_of_pocket_min: float
    estimated_out_of_pocket_max: float
    financial_guidance: str
    preparation_steps: list[PlanPreparationStep] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)
    disclaimer: str

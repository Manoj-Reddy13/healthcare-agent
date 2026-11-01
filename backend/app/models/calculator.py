from typing import Any, Optional
from pydantic import BaseModel, Field

class OutOfPocketRequest(BaseModel):
    procedure_id: str = Field(..., description="Procedure ID (e.g., 'angioplasty', 'knee-replacement')")
    hospital_id: Optional[str] = None
    room_type: str = Field("Single Private", description="'General Ward', 'Semi-Private', 'Single Private', 'Deluxe Suite'")
    length_of_stay_days: Optional[int] = None
    policy_id: Optional[str] = None
    sum_insured_inr: Optional[float] = 500000.0
    scheme_id: Optional[str] = None
    patient_age: Optional[int] = 45
    is_ped: bool = False
    policy_active_months: int = 36

class DeductionStep(BaseModel):
    step_number: int
    title: str
    amount_inr: float
    running_balance_inr: float
    category: str = Field(..., description="'charge', 'insurance_coverage', 'scheme_benefit', 'deduction', 'copay', 'consumables'")
    description: str
    clause_reference: Optional[str] = None

class OutOfPocketResponse(BaseModel):
    procedure_id: str
    procedure_name: str
    hospital_name: str
    room_type: str
    gross_hospital_bill: float
    bill_breakdown: dict[str, float]
    policy_coverage_amount: float
    scheme_benefit_amount: float
    room_rent_penalty: float
    copay_amount: float
    non_payable_consumables: float
    final_out_of_pocket: float
    deduction_steps: list[DeductionStep]
    financial_insights: list[str] = Field(default_factory=list)
    data_mode: str = "indicative_actuarial_model"
    disclaimer: str


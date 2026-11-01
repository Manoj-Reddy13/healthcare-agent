from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field

RoomType = Literal["General Ward", "Semi-Private", "Private Room", "ICU"]

class CostEstimateRequest(BaseModel):
    procedure: str = Field(..., min_length=2, description="Target medical procedure or consultation")
    city: str = Field(default="Hyderabad", description="Target city for cost estimation")
    room_type: RoomType = Field(default="Semi-Private", description="Accommodation tier")
    stay_days: Optional[int] = Field(default=3, ge=1, le=60, description="Expected duration of hospital stay in days")
    hospital_id: Optional[str] = Field(default=None, description="Specific hospital ID for tailored pricing")

class CostEstimate(BaseModel):
    procedure: str
    city: str
    room_type: str
    indicative_range_min: float
    indicative_range_max: float
    average_cost: float
    room_multiplier: float
    factors: list[str]
    covered_under_schemes: list[str]
    disclaimer: str
    data_mode: Literal["mock", "estimated"] = "estimated"
    stay_days: Optional[int] = 3
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    breakdown: Optional[Any] = None
    hospital_comparison: Optional[list[dict[str, Any]]] = None
    confidence: Optional[str] = "High (Regional Benchmark)"
    data_source: Optional[str] = "CGHS 2025/2026 Tariff Schedule & Verified Regional Hospital Schedules"
    last_updated: Optional[str] = "2026-10-29"

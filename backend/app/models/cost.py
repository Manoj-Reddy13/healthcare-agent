from typing import Literal
from pydantic import BaseModel, Field

RoomType = Literal["General Ward", "Semi-Private", "Private Room", "ICU"]

class CostEstimateRequest(BaseModel):
    procedure: str = Field(..., min_length=2, description="Target medical procedure or consultation")
    city: str = Field(default="Hyderabad", description="Target city for cost estimation")
    room_type: RoomType = Field(default="Semi-Private", description="Accommodation tier")

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

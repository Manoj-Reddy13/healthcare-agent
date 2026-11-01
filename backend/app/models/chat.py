from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
from app.models.hospital import Hospital
from app.models.cost import CostEstimate
from app.models.scheme import HealthcareScheme

class ToolCallRecord(BaseModel):
    tool: str
    arguments: dict[str, Any]
    result_count: int = 0

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Natural language prompt from user")
    session_id: str = Field(default="demo-session", description="Session identifier for stateful chats")

class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    hospitals: list[Hospital] = Field(default_factory=list)
    cost_estimate: Optional[CostEstimate] = None
    schemes: list[HealthcareScheme] = Field(default_factory=list)
    eligibility_result: Optional[dict[str, Any]] = None
    comparison_result: Optional[dict[str, Any]] = None
    healthcare_plan: Optional[dict[str, Any]] = None
    data_sources: list[str] = Field(default_factory=list)
    requires_confirmation: bool = False
    confirmation_prompt: Optional[str] = None
    emergency_detected: bool = False
    disclaimer: str = (
        "Informational assistance only. This agent does not provide medical diagnoses or prescriptions. "
        "In case of a medical emergency, call 108 or 112 immediately."
    )
    data_mode: Literal["mock", "estimated", "verified"] = "mock"

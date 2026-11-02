from typing import Any, Optional, Literal
from pydantic import BaseModel, Field
from app.services.medical_ai_service import MedicalExplanationResponse
from app.services.disease_knowledge_engine import DiseaseRecord
from app.services.insurance_document_intelligence import PolicyClauseModel, ClauseVerificationRequest
from app.services.insurance_rag_system import RetrievedClauseChunk
from app.services.insurance_eligibility_engine import (
    EligibilityEvaluationRequest, EligibilityEvaluationResponse, ELIGIBILITY_STATUS
)
from app.services.hospital_insurance_matcher import EndToEndMatchingResponse

class MedicalQueryRequest(BaseModel):
    query: str

class RAGQueryRequest(BaseModel):
    query: str
    policy_id: Optional[str] = None
    disease_name: Optional[str] = None
    procedure_name: Optional[str] = None
    top_k: int = 4

class EndToEndMatchRequest(BaseModel):
    disease_query: str
    procedure_query: Optional[str] = None
    policy_id: Optional[str] = "pol-star-comp"
    city: str = "Hyderabad"
    state: Optional[str] = "Telangana"
    room_type: str = "Single Private"
    policy_active_months: int = 24
    is_pre_existing: bool = False


from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.intelligence import (
    MedicalQueryRequest, RAGQueryRequest, EndToEndMatchRequest,
    MedicalExplanationResponse, DiseaseRecord, PolicyClauseModel,
    ClauseVerificationRequest, RetrievedClauseChunk,
    EligibilityEvaluationRequest, EligibilityEvaluationResponse,
    EndToEndMatchingResponse
)
from app.services.medical_ai_service import MedicalAIService
from app.services.disease_knowledge_engine import DiseaseKnowledgeEngine
from app.services.insurance_document_intelligence import InsuranceDocumentIntelligence
from app.services.insurance_rag_system import InsuranceRAGSystem
from app.services.insurance_eligibility_engine import InsuranceEligibilityEngine
from app.services.hospital_insurance_matcher import HospitalInsuranceMatcher

router = APIRouter(prefix="/intelligence", tags=["Healthcare & Insurance Intelligence"])

@router.post("/medical-explain", response_model=MedicalExplanationResponse, summary="MedGemma Medical Understanding & Explanations")
def medical_explain(payload: MedicalQueryRequest) -> MedicalExplanationResponse:
    return MedicalAIService.explain_condition(payload.query)

@router.get("/diseases", response_model=list[DiseaseRecord], summary="List WHO ICD-11 Diseases & Specialties")
def list_diseases(specialty: Optional[str] = None) -> list[DiseaseRecord]:
    return DiseaseKnowledgeEngine.list_all(specialty=specialty)

@router.get("/diseases/{code_or_name}", response_model=DiseaseRecord, summary="Get WHO ICD-11 Disease Detail with Citations")
def get_disease(code_or_name: str) -> DiseaseRecord:
    record = DiseaseKnowledgeEngine.find_by_query(code_or_name)
    if not record:
        raise HTTPException(status_code=404, detail=f"Disease record not found for query: {code_or_name}")
    return record

@router.get("/policy-clauses", response_model=list[PolicyClauseModel], summary="List Extracted Insurance Policy Clauses with Page Numbers")
def list_policy_clauses(
    policy_id: Optional[str] = None,
    category: Optional[str] = None,
    verified_only: bool = False
) -> list[PolicyClauseModel]:
    return InsuranceDocumentIntelligence.list_clauses(
        policy_id=policy_id,
        category=category,
        verified_only=verified_only
    )

@router.post("/policy-clauses/verify", response_model=PolicyClauseModel, summary="Admin Verification of Extracted Clauses")
def verify_policy_clause(payload: ClauseVerificationRequest) -> PolicyClauseModel:
    res = InsuranceDocumentIntelligence.verify_clause(payload)
    if not res:
        raise HTTPException(status_code=404, detail=f"Clause with ID '{payload.clause_id}' not found.")
    return res

@router.post("/rag-retrieve", response_model=list[RetrievedClauseChunk], summary="Retrieve Policy Clauses with Citations & Page Numbers")
def rag_retrieve(payload: RAGQueryRequest) -> list[RetrievedClauseChunk]:
    return InsuranceRAGSystem.retrieve_clauses(
        query=payload.query,
        policy_id=payload.policy_id,
        disease_name=payload.disease_name,
        procedure_name=payload.procedure_name,
        top_k=payload.top_k
    )

@router.post("/evaluate-eligibility", response_model=EligibilityEvaluationResponse, summary="Python Insurance Eligibility Rules Engine")
def evaluate_eligibility(payload: EligibilityEvaluationRequest) -> EligibilityEvaluationResponse:
    return InsuranceEligibilityEngine.evaluate(payload)

@router.post("/end-to-end-match", response_model=EndToEndMatchingResponse, summary="Match Disease → Procedure → Policy → Network Hospital → Cost")
def end_to_end_match(payload: EndToEndMatchRequest) -> EndToEndMatchingResponse:
    return HospitalInsuranceMatcher.match_ecosystem(
        disease_query=payload.disease_query,
        procedure_query=payload.procedure_query,
        policy_id=payload.policy_id,
        city=payload.city,
        state=payload.state,
        room_type=payload.room_type,
        policy_active_months=payload.policy_active_months,
        is_pre_existing=payload.is_pre_existing
    )


import pytest
from app.services.medical_ai_service import MedicalAIService
from app.services.disease_knowledge_engine import DiseaseKnowledgeEngine
from app.services.insurance_document_intelligence import (
    InsuranceDocumentIntelligence, ClauseVerificationRequest
)
from app.services.insurance_rag_system import InsuranceRAGSystem
from app.services.insurance_eligibility_engine import (
    InsuranceEligibilityEngine, EligibilityEvaluationRequest
)
from app.services.hospital_insurance_matcher import HospitalInsuranceMatcher
from app.agent.orchestrator import AgentOrchestrator

# 1. MEDICAL AI TESTS (MedGemma)
def test_medgemma_disease_explanations():
    res = MedicalAIService.explain_condition("What are common causes of diabetes?")
    assert res.condition_name == "Type 2 Diabetes Mellitus"
    assert res.icd11_code == "5A11"
    assert len(res.pathophysiology_and_causes) >= 3
    assert any("insulin resistance" in c.lower() for c in res.pathophysiology_and_causes)
    assert len(res.common_symptoms) >= 3
    assert len(res.evidence_based_treatments) >= 2
    # Check non-diagnosis safety disclaimer
    assert "DOES NOT provide a clinical diagnosis" in res.disclaimer

def test_medgemma_coronary_treatments():
    res = MedicalAIService.explain_condition("What treatments are associated with coronary artery disease?")
    assert "Coronary" in res.condition_name
    assert res.icd11_code == "BA41"
    assert any("angioplasty" in t.lower() or "ptca" in t.lower() for t in res.evidence_based_treatments)
    assert len(res.red_flag_warnings) >= 1

def test_medgemma_emergency_triage():
    res = MedicalAIService.explain_condition("Patient is having sudden severe crushing chest pain")
    assert res.is_emergency is True
    assert "108" in res.red_flag_warnings[0] or "Emergency" in res.condition_name

# 2. DISEASE KNOWLEDGE ENGINE (WHO ICD-11 & Trusted Sources)
def test_who_icd11_disease_records():
    diseases = DiseaseKnowledgeEngine.list_all()
    assert len(diseases) >= 5
    codes = [d.icd11_code for d in diseases]
    assert "BA41" in codes  # CAD
    assert "5A11" in codes  # T2DM
    assert "FA00" in codes  # Knee OA
    assert "9B10" in codes  # Cataract

def test_disease_citations_and_procedures():
    cad = DiseaseKnowledgeEngine.get_by_code("BA41")
    assert cad is not None
    assert len(cad.related_procedures) >= 1
    assert any("angioplasty" in p["name"].lower() for p in cad.related_procedures)
    # Check MedlinePlus and PubMed citations
    sources = cad.trusted_sources
    assert len(sources) >= 2
    assert any("medlineplus" in s.get("authority", "").lower() for s in sources)
    assert any(s.get("pmid") is not None for s in sources)

# 3. INSURANCE DOCUMENT INTELLIGENCE & ADMIN VERIFICATION
def test_insurance_document_intelligence_clauses():
    clauses = InsuranceDocumentIntelligence.list_clauses()
    assert len(clauses) >= 8
    # Verify page numbers and UINs are recorded
    for c in clauses:
        assert c.page_number > 0
        assert len(c.uin) > 3
        assert len(c.source_document) > 0
        assert len(c.clause_text) > 20

def test_admin_clause_verification_workflow():
    req = ClauseVerificationRequest(
        clause_id="cls-star-ped",
        verified_by="Senior Compliance Auditor",
        is_verified=True
    )
    verified = InsuranceDocumentIntelligence.verify_clause(req)
    assert verified is not None
    assert verified.is_verified is True
    assert verified.verified_by == "Senior Compliance Auditor"
    assert verified.verification_timestamp is not None

# 4. INSURANCE RAG SYSTEM
def test_insurance_rag_retrieval():
    results = InsuranceRAGSystem.retrieve_clauses(
        query="waiting period for pre-existing diabetes",
        policy_id="pol-star-comp",
        top_k=2
    )
    assert len(results) >= 1
    top = results[0]
    assert top.page_number > 0
    assert "SHAHLIP" in top.uin
    assert len(top.verbatim_excerpt) > 10
    assert "Page" in top.citation

def test_insurance_rag_room_rent_retrieval():
    results = InsuranceRAGSystem.retrieve_clauses(
        query="what is the room rent limit and proportionate deduction?",
        top_k=2
    )
    assert len(results) >= 1
    assert any(r.page_number > 0 for r in results)
    assert any("room" in r.clause_title.lower() for r in results)

# 5. INSURANCE ELIGIBILITY RULES ENGINE
def test_eligibility_status_waiting_period_ped():
    req = EligibilityEvaluationRequest(
        policy_id="pol-star-comp",
        disease_name="Type 2 Diabetes Mellitus",
        procedure_name="Hospitalization for Diabetic Foot",
        policy_active_months=12,  # < 36 months PED
        is_pre_existing=True
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    assert res.status == "Waiting period may apply"
    assert "pre-existing" in res.summary_verdict.lower()
    assert res.projected_out_of_pocket > 0
    assert len(res.applied_clauses_citations) >= 1
    assert "guarantee" in res.disclaimer.lower()

def test_eligibility_status_specific_24m_waiting():
    req = EligibilityEvaluationRequest(
        policy_id="pol-star-comp",
        procedure_name="Cataract Surgery",
        policy_active_months=10,  # < 24 months
        is_pre_existing=False
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    assert res.status == "Waiting period may apply"
    assert "24-month" in res.summary_verdict or "waiting period" in res.summary_verdict.lower()

def test_eligibility_status_covered_subject_to_conditions():
    req = EligibilityEvaluationRequest(
        policy_id="pol-star-comp",
        procedure_name="Angioplasty",
        policy_active_months=38,  # > 36 months
        is_pre_existing=True,
        room_type="Deluxe Suite"  # triggers proportionate deduction
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    assert res.status == "Covered subject to conditions"
    assert "proportionate" in res.summary_verdict.lower() or "room" in res.summary_verdict.lower()

def test_eligibility_status_potentially_covered():
    req = EligibilityEvaluationRequest(
        policy_id="pol-hdfc-optima",
        procedure_name="Angioplasty",
        policy_active_months=40,
        is_pre_existing=False,
        room_type="Single Private"
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    assert res.status == "Potentially covered"
    assert res.projected_coverage_amount > 0

# 6. HOSPITAL MATCHING
def test_end_to_end_hospital_matching():
    res = HospitalInsuranceMatcher.match_ecosystem(
        disease_query="Coronary Artery Disease",
        procedure_query="Angioplasty",
        policy_id="pol-star-comp",
        city="Hyderabad"
    )
    assert res.disease_name == "Coronary Artery Disease (CAD) / Myocardial Infarction"
    assert res.icd11_code == "BA41"
    assert len(res.matched_hospitals) >= 2
    statuses = [h.network_status for h in res.matched_hospitals]
    assert "Confirmed Cashless Network" in statuses
    # Check that out of pocket is calculated
    for h in res.matched_hospitals:
        assert h.estimated_total_cost > 0
        assert h.indicative_cost_range != ""

# 7. AI RESPONSE & CHATBOT ORCHESTRATION (The 6 User Questions)
def test_ai_response_causes_of_diabetes():
    resp = AgentOrchestrator.process_message("What are common causes of diabetes?")
    assert resp.medical_explanation is not None
    assert "insulin resistance" in resp.answer.lower()
    assert "5A11" in resp.answer or resp.medical_explanation.get("icd11_code") == "5A11"
    assert "DOES NOT provide a clinical diagnosis" in resp.disclaimer or "Informational" in resp.disclaimer

def test_ai_response_coronary_treatments():
    resp = AgentOrchestrator.process_message("What treatments are associated with coronary artery disease?")
    assert resp.medical_explanation is not None
    assert "angioplasty" in resp.answer.lower() or "ptca" in resp.answer.lower()

def test_ai_response_policy_cover_angioplasty():
    resp = AgentOrchestrator.process_message("Does my policy cover angioplasty?")
    assert resp.retrieved_clauses is not None
    assert len(resp.retrieved_clauses) >= 1
    assert "Page" in resp.answer or any("page_number" in c for c in resp.retrieved_clauses)

def test_ai_response_waiting_period_diabetes():
    resp = AgentOrchestrator.process_message("Does my policy have a waiting period for pre-existing diabetes?")
    assert resp.retrieved_clauses is not None
    assert resp.eligibility_evaluation is not None
    assert "waiting period" in resp.answer.lower()
    assert "Page" in resp.answer

def test_ai_response_network_hospitals_hyderabad():
    resp = AgentOrchestrator.process_message("Which hospitals in Hyderabad are listed in my insurer's network?")
    assert "Confirmed Cashless Network" in resp.answer
    assert "Apollo" in resp.answer or "Care" in resp.answer or "Hyderabad" in resp.answer

def test_ai_response_policy_conditions_claim():
    resp = AgentOrchestrator.process_message("Which policy conditions might affect my claim?")
    assert resp.retrieved_clauses is not None
    assert "room rent" in resp.answer.lower() or "pre-existing" in resp.answer.lower() or "consumables" in resp.answer.lower()
    assert "Page" in resp.answer


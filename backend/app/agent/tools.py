import math
import re
from typing import Any, Optional
from app.services.hospital_service import HospitalService
from app.services.cost_service import CostService
from app.services.scheme_service import SchemeService
from app.services.plan_service import PlanService
from app.services.insurance_service import InsuranceService
from app.services.disease_service import DiseaseService
from app.services.network_service import NetworkService
from app.services.calculator_service import CalculatorService
from app.services.rag_service import DualKnowledgeRAGService
from app.services.insurance_eligibility_engine import (
    InsuranceEligibilityEngine, EligibilityEvaluationRequest
)
from app.services.hospital_insurance_matcher import HospitalInsuranceMatcher
from app.models.scheme import SchemeEligibilityRequest
from app.models.plan import HealthcarePlanRequest
from app.models.insurance import PolicyComparisonRequest
from app.models.network import NetworkMatchRequest
from app.models.calculator import OutOfPocketRequest

# =============================================================================
# 1. TOOL IMPLEMENTATIONS
# =============================================================================

def execute_search_hospitals(arguments: dict[str, Any]) -> dict[str, Any]:
    """Search and filter hospitals by city, specialty, budget, pincode, or keyword."""
    city = arguments.get("city")
    state = arguments.get("state")
    district = arguments.get("district")
    specialty = arguments.get("specialty")
    max_budget = arguments.get("max_budget")
    scheme = arguments.get("scheme")
    pincode = arguments.get("pincode")
    hospital_type = arguments.get("hospital_type")
    query = arguments.get("query")

    if state or district or query:
        real_matches = HospitalService.search_keyword(
            query=query or specialty or city or district or "Hospital",
            state=state,
            district=district,
            limit=10
        )
        if real_matches:
            return {
                "count": len(real_matches),
                "hospitals": [h.model_dump() for h in real_matches],
                "data_source": "National Health Portal (NHP) Open Government Data CSV"
            }

    hospitals = HospitalService.search_hospitals(
        city=city,
        specialty=specialty,
        max_budget=max_budget,
        scheme=scheme,
        pincode=pincode,
        hospital_type=hospital_type
    )

    if not hospitals and (city or specialty):
        real_matches = HospitalService.search_keyword(
            query=specialty or city or "Hospital",
            district=city,
            limit=10
        )
        if real_matches:
            return {
                "count": len(real_matches),
                "hospitals": [h.model_dump() for h in real_matches],
                "data_source": "National Health Portal (NHP) Open Government Data CSV"
            }

    return {
        "count": len(hospitals),
        "hospitals": [h.model_dump() for h in hospitals]
    }

def execute_get_hospital_details(arguments: dict[str, Any]) -> dict[str, Any]:
    """Retrieve full contact, accreditation, and facility details for a hospital."""
    hospital_id = arguments.get("hospital_id", "")
    hosp = HospitalService.get_imported_hospital_by_id(hospital_id)
    if not hosp:
        legacy = HospitalService.get_hospital_by_id(hospital_id)
        if legacy:
            return {"hospital": legacy.model_dump()}
        return {"error": f"Hospital '{hospital_id}' not found"}
    return {"hospital": hosp.model_dump()}

def execute_get_disease_info(arguments: dict[str, Any]) -> dict[str, Any]:
    """Retrieve WHO ICD-11 classification, etiology, symptoms, red flags, and PubMed citations."""
    query = arguments.get("query") or arguments.get("disease_name") or "Coronary Artery Disease"
    chunks = DualKnowledgeRAGService.search_medical_knowledge(query=query, top_k=2)
    if not chunks:
        return {"query": query, "found": False, "message": f"No disease record found for '{query}'"}
    
    top = chunks[0]
    return {
        "found": True,
        "disease_name": top.disease_name,
        "icd11_code": top.icd11_code,
        "icd11_chapter": top.icd11_chapter,
        "specialty": top.specialty,
        "etiology": top.etiology,
        "cardinal_symptoms": top.symptoms_summary,
        "emergency_red_flags": top.red_flags,
        "diagnostic_workup": top.diagnostic_workup,
        "related_procedures": top.related_procedures,
        "trusted_sources": top.trusted_sources,
        "relevance_score": top.score
    }

def execute_estimate_treatment_cost(arguments: dict[str, Any]) -> dict[str, Any]:
    """Calculate indicative cost ranges, room options, and itemized component breakdown."""
    procedure = arguments.get("procedure", "Doctor Consultation")
    city = arguments.get("city", "Hyderabad")
    room_type = arguments.get("room_type", "Semi-Private")
    stay_days = arguments.get("stay_days", 3)
    hospital_id = arguments.get("hospital_id")
    estimate = CostService.estimate_treatment_cost(
        procedure=procedure,
        city=city,
        room_type=room_type,
        stay_days=stay_days,
        hospital_id=hospital_id
    )
    return {"cost_estimate": estimate.model_dump()}

def execute_search_insurance_policies(arguments: dict[str, Any]) -> dict[str, Any]:
    """Search registered retail Indian health insurance policies and underwriting guidelines."""
    insurer_id = arguments.get("insurer_id")
    if insurer_id:
        ins_lower = insurer_id.lower()
        if "star" in ins_lower: insurer_id = "ins-star"
        elif "hdfc" in ins_lower: insurer_id = "ins-hdfc"
        elif "care" in ins_lower: insurer_id = "ins-care"
        elif "niva" in ins_lower or "bupa" in ins_lower: insurer_id = "ins-niva"
        elif "icici" in ins_lower: insurer_id = "ins-icici"

    policy_type = arguments.get("policy_type")
    policies = InsuranceService.list_policies(insurer_id=insurer_id, policy_type=policy_type)
    return {"count": len(policies), "policies": [p.model_dump() for p in policies]}

def execute_retrieve_policy_clauses(arguments: dict[str, Any]) -> dict[str, Any]:
    """Retrieve verbatim IRDAI policy clauses from filed policy wordings with exact page numbers."""
    query = arguments.get("query", "waiting period")
    policy_id = arguments.get("policy_id")
    top_k = arguments.get("top_k", 3)
    chunks = DualKnowledgeRAGService.search_insurance_knowledge(
        query=query,
        policy_id=policy_id,
        top_k=top_k
    )
    return {
        "query": query,
        "count": len(chunks),
        "clauses": [
            {
                "clause_id": c.chunk_id,
                "policy_name": c.policy_name,
                "uin": c.uin,
                "clause_title": c.clause_title,
                "section_reference": c.section_reference,
                "page_number": c.page_number,
                "source_document": c.source_document,
                "verbatim_text": c.verbatim_text,
                "impact_summary": c.impact_summary,
                "is_verified": c.is_verified,
                "relevance_score": c.score
            }
            for c in chunks
        ]
    }

def execute_check_waiting_periods(arguments: dict[str, Any]) -> dict[str, Any]:
    """Check initial 30-day, 24-month specific illness, and pre-existing disease (PED) moratorium."""
    policy_id = arguments.get("policy_id", "pol-star-comp")
    disease_or_surgery = arguments.get("disease_or_surgery", "Cataract Surgery")
    tenure_months = arguments.get("policy_tenure_months", 12)
    is_ped = arguments.get("is_pre_existing", False)

    req = EligibilityEvaluationRequest(
        policy_id=policy_id,
        procedure_name=disease_or_surgery,
        disease_name=disease_or_surgery,
        is_pre_existing=is_ped,
        policy_active_months=tenure_months,
        room_type="Single Private",
        is_network_hospital=True
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    waiting_steps = [s for s in res.evaluation_steps if "waiting" in s.rule_name.lower() or "moratorium" in s.rule_name.lower()]
    has_active_waiting = any(s.status in ("CONDITIONAL", "FAIL", "WARNING") for s in waiting_steps)

    return {
        "policy_name": res.policy_name,
        "status": res.status,
        "waiting_period_active": has_active_waiting,
        "rule_explanation": res.summary_verdict,
        "evaluation_steps": [s.model_dump() for s in res.evaluation_steps],
        "non_guarantee_notice": res.disclaimer
    }

def execute_evaluate_insurance_eligibility(arguments: dict[str, Any]) -> dict[str, Any]:
    """Deterministic underwriting rules engine checking coverability, room rent, and co-payment."""
    req = EligibilityEvaluationRequest(
        policy_id=arguments.get("policy_id", "pol-star-comp"),
        procedure_name=arguments.get("procedure_name", "Angioplasty"),
        disease_name=arguments.get("disease_name", "Coronary Artery Disease"),
        is_pre_existing=arguments.get("is_pre_existing", False),
        policy_active_months=arguments.get("policy_active_months", 24),
        room_type=arguments.get("room_type", "Single Private"),
        is_network_hospital=arguments.get("is_network_hospital", True)
    )
    res = InsuranceEligibilityEngine.evaluate(req)
    return res.model_dump()

def execute_match_cashless_network(arguments: dict[str, Any]) -> dict[str, Any]:
    """Search hospitals empanelled for cashless vs reimbursement settlement under a specific insurer."""
    city = arguments.get("city", "Hyderabad")
    policy_id = arguments.get("policy_id", "pol-star-comp")
    disease_query = arguments.get("specialty") or arguments.get("disease_query") or "Cardiology"
    res = HospitalInsuranceMatcher.match_ecosystem(
        disease_query=disease_query,
        policy_id=policy_id,
        city=city
    )
    return res.model_dump()

def execute_get_government_schemes(arguments: dict[str, Any]) -> dict[str, Any]:
    """Discover government healthcare schemes (PM-JAY, Aarogyasri, CGHS) by state and specialty."""
    state = arguments.get("state")
    specialty = arguments.get("specialty")
    income = arguments.get("income_bracket")
    schemes = SchemeService.find_healthcare_schemes(income_bracket=income, state=state, specialty=specialty)
    return {
        "count": len(schemes),
        "schemes": [s.model_dump() for s in schemes]
    }

def execute_check_scheme_eligibility(arguments: dict[str, Any]) -> dict[str, Any]:
    """Evaluate eligibility for PM-JAY and State welfare schemes based on age, income, and ration card."""
    age = arguments.get("age", 45)
    state = arguments.get("state", "Telangana")
    has_ration = arguments.get("has_ration_card", False)
    income = arguments.get("annual_income", 180000.0)
    is_senior = arguments.get("is_senior", age >= 70)
    req = SchemeEligibilityRequest(
        age=age,
        state=state,
        has_ration_card=has_ration,
        annual_income=income,
        is_senior=is_senior
    )
    res = SchemeService.check_eligibility(req)
    return res.model_dump()

def execute_compare_hospitals(arguments: dict[str, Any]) -> dict[str, Any]:
    """Compare 2 or more hospitals side-by-side for a specific procedure."""
    hospital_ids = arguments.get("hospital_ids", [])
    procedure = arguments.get("procedure", "Angioplasty")
    return HospitalService.compare_hospitals(hospital_ids=hospital_ids, procedure=procedure)

def execute_generate_healthcare_plan(arguments: dict[str, Any]) -> dict[str, Any]:
    """Synthesize a personalized healthcare plan combining hospitals, costs, and preparation steps."""
    req = HealthcarePlanRequest(
        treatment=arguments.get("treatment", "Angioplasty"),
        city=arguments.get("city", "Hyderabad"),
        budget=arguments.get("budget", 200000.0),
        room_type=arguments.get("room_type", "Semi-Private"),
        hospital_id=arguments.get("hospital_id")
    )
    plan = PlanService.generate_plan(req)
    return {"healthcare_plan": plan.model_dump()}

# =============================================================================
# 2. DISPATCHER REGISTRY
# =============================================================================

TOOL_DISPATCHER = {
    "search_hospitals": execute_search_hospitals,
    "get_hospital_details": execute_get_hospital_details,
    "get_disease_info": execute_get_disease_info,
    "estimate_treatment_cost": execute_estimate_treatment_cost,
    "search_insurance_policies": execute_search_insurance_policies,
    "retrieve_policy_clauses": execute_retrieve_policy_clauses,
    "check_waiting_periods": execute_check_waiting_periods,
    "evaluate_insurance_eligibility": execute_evaluate_insurance_eligibility,
    "match_cashless_network": execute_match_cashless_network,
    "get_government_schemes": execute_get_government_schemes,
    "find_healthcare_schemes": execute_get_government_schemes,
    "check_eligibility": execute_check_scheme_eligibility,
    "compare_hospitals": execute_compare_hospitals,
    "generate_healthcare_plan": execute_generate_healthcare_plan
}

# =============================================================================
# 3. SCHEMA DECLARATIONS FOR LLM FUNCTION CALLING
# =============================================================================

AVAILABLE_TOOLS_SCHEMA = [
    {
        "name": "search_hospitals",
        "description": "Search and filter accredited hospitals by city, specialty, budget ceiling, or pincode.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. 'Hyderabad', 'Bengaluru'"},
                "specialty": {"type": "string", "description": "Medical specialty such as 'Cardiology', 'Orthopedics'"},
                "max_budget": {"type": "number", "description": "Maximum budget ceiling in INR"},
                "hospital_type": {"type": "string", "description": "'Government', 'Private', or 'Trust'"}
            }
        }
    },
    {
        "name": "get_hospital_details",
        "description": "Retrieve comprehensive contact numbers, address, and accreditation for a specific hospital ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "hospital_id": {"type": "string", "description": "Hospital ID, e.g. 'hosp-hyd-01'"}
            },
            "required": ["hospital_id"]
        }
    },
    {
        "name": "get_disease_info",
        "description": "Retrieve official WHO ICD-11 taxonomy code, clinical definition, causes, cardinal symptoms, red flags, and PubMed citations for a medical condition.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Disease name or clinical term, e.g. 'Coronary Artery Disease', 'Diabetes'"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "estimate_treatment_cost",
        "description": "Calculate indicative package cost ranges, room options, and itemized component breakdown for a medical procedure.",
        "parameters": {
            "type": "object",
            "properties": {
                "procedure": {"type": "string", "description": "Procedure name e.g. 'Angioplasty', 'Knee Replacement'"},
                "city": {"type": "string", "description": "City where treatment is planned"},
                "room_type": {
                    "type": "string",
                    "enum": ["General Ward", "Semi-Private", "Private Room", "ICU"],
                    "description": "Hospital room tier"
                }
            },
            "required": ["procedure"]
        }
    },
    {
        "name": "search_insurance_policies",
        "description": "Search registered retail health insurance policies and compare underwriting limits.",
        "parameters": {
            "type": "object",
            "properties": {
                "insurer_id": {"type": "string", "description": "Insurer ID e.g. 'star-health', 'hdfc-ergo'"},
                "policy_type": {"type": "string", "description": "'Comprehensive', 'Super Top-up', etc."}
            }
        }
    },
    {
        "name": "retrieve_policy_clauses",
        "description": "Retrieve verbatim clauses from filed IRDAI policy documents with exact PDF page citations and UINs.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Clause inquiry e.g. 'pre-existing disease waiting period', 'room rent capping'"},
                "policy_id": {"type": "string", "description": "Policy ID e.g. 'pol-star-comp', 'pol-hdfc-optima'"},
                "top_k": {"type": "integer", "description": "Number of clauses to retrieve (default: 3)"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "check_waiting_periods",
        "description": "Check waiting period rules (30-day initial, 24-month specific illness, PED moratorium) for a policy and condition.",
        "parameters": {
            "type": "object",
            "properties": {
                "policy_id": {"type": "string", "description": "Policy ID e.g. 'pol-star-comp'"},
                "disease_or_surgery": {"type": "string", "description": "Disease or procedure name e.g. 'Cataract', 'Knee Replacement'"},
                "policy_tenure_months": {"type": "integer", "description": "Months policy has been continuously active"},
                "is_pre_existing": {"type": "boolean", "description": "Whether condition was pre-existing before policy start"}
            },
            "required": ["policy_id", "disease_or_surgery"]
        }
    },
    {
        "name": "evaluate_insurance_eligibility",
        "description": "Deterministic underwriting rules engine checking coverability, room rent restrictions, and co-payment penalties.",
        "parameters": {
            "type": "object",
            "properties": {
                "policy_id": {"type": "string", "description": "Policy ID e.g. 'pol-star-comp'"},
                "procedure_name": {"type": "string", "description": "Procedure name e.g. 'Angioplasty'"},
                "disease_name": {"type": "string", "description": "Disease name e.g. 'Coronary Artery Disease'"},
                "is_pre_existing": {"type": "boolean", "description": "Whether condition is pre-existing"},
                "policy_active_months": {"type": "integer", "description": "Months policy has been active"},
                "room_type": {"type": "string", "description": "'Single Private', 'Twin Sharing', etc."}
            },
            "required": ["policy_id", "procedure_name"]
        }
    },
    {
        "name": "match_cashless_network",
        "description": "Search hospitals empanelled for cashless vs reimbursement settlement under an insurer's network.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. 'Hyderabad'"},
                "policy_id": {"type": "string", "description": "Policy ID e.g. 'pol-star-comp'"},
                "specialty": {"type": "string", "description": "Medical specialty"}
            },
            "required": ["city", "policy_id"]
        }
    },
    {
        "name": "get_government_schemes",
        "description": "Discover eligible government healthcare schemes and subsidies (e.g. Ayushman Bharat PM-JAY, Aarogyasri).",
        "parameters": {
            "type": "object",
            "properties": {
                "state": {"type": "string", "description": "State name e.g. 'Telangana', 'All India'"},
                "specialty": {"type": "string", "description": "Medical specialty"},
                "income_bracket": {"type": "string", "description": "'bpl', 'low', 'middle'"}
            }
        }
    }
]

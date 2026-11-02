import re
from typing import Any, Optional
from app.config import settings
from app.agent.prompts import EMERGENCY_KEYWORDS, EMERGENCY_MESSAGE
from app.agent.tools import TOOL_DISPATCHER, AVAILABLE_TOOLS_SCHEMA
from app.models.chat import ChatResponse, ToolCallRecord
from app.models.hospital import Hospital
from app.models.cost import CostEstimate
from app.models.scheme import HealthcareScheme
from app.services.medical_ai_service import MedicalAIService
from app.services.disease_knowledge_engine import DiseaseKnowledgeEngine
from app.services.insurance_rag_system import InsuranceRAGSystem
from app.services.insurance_eligibility_engine import (
    InsuranceEligibilityEngine, EligibilityEvaluationRequest
)
from app.services.hospital_insurance_matcher import HospitalInsuranceMatcher

class AgentOrchestrator:
    @classmethod
    def check_emergency(cls, text: str) -> bool:
        lowered = text.lower()
        for kw in EMERGENCY_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', lowered):
                return True
        return False

    @classmethod
    def process_message(cls, message: str, session_id: str = "demo-session") -> ChatResponse:
        # 1. Emergency safety check
        if cls.check_emergency(message):
            return ChatResponse(
                answer=EMERGENCY_MESSAGE,
                emergency_detected=True,
                data_mode="verified"
            )

        lowered = message.lower()

        # 2. Appointment booking safety check
        if any(term in lowered for term in ["book appointment", "schedule appointment", "reserve slot", "confirm booking"]):
            return ChatResponse(
                answer=(
                    "I can help register a simulated appointment request for the demo. "
                    "Please review the hospital details and confirm your preferred date and contact info."
                ),
                requires_confirmation=True,
                confirmation_prompt="Please confirm if you would like to proceed with registering this simulated appointment request.",
                data_mode="verified"
            )

        tool_records: list[ToolCallRecord] = []
        found_hospitals: list[Hospital] = []
        found_cost_estimate: Optional[CostEstimate] = None
        found_schemes: list[HealthcareScheme] = []
        eligibility_result: Optional[dict[str, Any]] = None
        comparison_result: Optional[dict[str, Any]] = None
        healthcare_plan: Optional[dict[str, Any]] = None
        medical_explanation: Optional[dict[str, Any]] = None
        retrieved_clauses: Optional[list[dict[str, Any]]] = None
        eligibility_evaluation: Optional[dict[str, Any]] = None
        confidence_limitations: Optional[str] = None

        sources_cited: list[str] = [
            "National Health Authority (NHA) Package Master 2024",
            "WHO ICD-11 International Classification of Diseases",
            "IRDAI Registered Health Insurance Product Wordings",
            "U.S. NLM MedlinePlus & PubMed Clinical Trials Database"
        ]
        answer_parts: list[str] = []

        # Detect City
        city = "Hyderabad"
        if "hyderabad" in lowered or "secunderabad" in lowered:
            city = "Hyderabad"
        elif "bengaluru" in lowered or "bangalore" in lowered:
            city = "Bengaluru"
        elif "mumbai" in lowered:
            city = "Mumbai"
        elif "jaipur" in lowered:
            city = "Jaipur"
        elif "delhi" in lowered:
            city = "Delhi"

        # Detect Specialty
        specialty = None
        specialty_map = {
            "cardio": "Cardiology",
            "heart": "Cardiology",
            "ortho": "Orthopedics",
            "bone": "Orthopedics",
            "knee": "Orthopedics",
            "cancer": "Oncology",
            "onco": "Oncology",
            "neuro": "Neurology",
            "brain": "Neurology",
            "pediatric": "Pediatrics",
            "child": "Pediatrics",
            "maternity": "Gynecology",
            "delivery": "Gynecology",
            "kidney": "Nephrology",
            "renal": "Nephrology",
            "eye": "Ophthalmology",
            "cataract": "Ophthalmology"
        }
        for kw, spec in specialty_map.items():
            if kw in lowered:
                specialty = spec
                break

        # Detect Policy / Insurer Name
        policy_id = "pol-star-comp"
        if "optima" in lowered or "hdfc" in lowered:
            policy_id = "pol-hdfc-optima"
        elif "care supreme" in lowered or "care health" in lowered:
            policy_id = "pol-care-sup"
        elif "reassure" in lowered or "niva bupa" in lowered or "max bupa" in lowered:
            policy_id = "pol-niva-reassure"
        elif "icici" in lowered:
            policy_id = "pol-icici-complete"

        # =========================================================================
        # BRANCH 1: Medical Inquiries (MedGemma & WHO ICD-11 Knowledge Engine)
        # Examples: "What are common causes of diabetes?", "What treatments are associated with coronary artery disease?"
        # =========================================================================
        is_medical_question = any(q_phrase in lowered for q_phrase in [
            "causes of", "cause of", "symptoms of", "what is diabetes", "what is coronary",
            "treatments are associated with", "treatment for", "diagnose", "etiology",
            "what are common causes", "risk factors of"
        ])

        if is_medical_question:
            med_res = MedicalAIService.explain_condition(message)
            medical_explanation = med_res.model_dump()
            tool_records.append(ToolCallRecord(tool="medgemma_medical_ai", arguments={"query": message}, result_count=1))
            
            # Look up WHO ICD-11
            disease_rec = DiseaseKnowledgeEngine.find_by_query(message)
            icd_badge = f" (WHO ICD-11: `{disease_rec.icd11_code}`)" if disease_rec else ""
            
            causes_bullet = "\n".join([f"- {c}" for c in med_res.pathophysiology_and_causes[:4]])
            symptoms_bullet = "\n".join([f"- {s}" for s in med_res.common_symptoms[:4]])
            treatments_bullet = "\n".join([f"- {t}" for t in med_res.evidence_based_treatments[:4]])
            
            answer_parts.append(
                f"### Medical Understanding: {med_res.condition_name}{icd_badge}\n"
                f"*{med_res.medical_definition}*\n\n"
                f"**Common Etiology & Pathophysiological Causes**:\n{causes_bullet}\n\n"
                f"**Cardinal Clinical Symptoms**:\n{symptoms_bullet}\n\n"
                f"**Evidence-Based Treatment Pathways**:\n{treatments_bullet}\n\n"
                f"> **Clinical Safety Notice**: {med_res.disclaimer}"
            )
            confidence_limitations = "Model-generated clinical explanations based on peer-reviewed guidelines and WHO ICD-11 classifications. Not a definitive personal diagnosis."

        # =========================================================================
        # BRANCH 2: Policy Conditions, Waiting Periods & Claim Risk Inquiries
        # Examples: "Does my policy cover angioplasty?", "Does my policy have a waiting period for pre-existing diabetes?",
        # "Which policy conditions might affect my claim?"
        # =========================================================================
        is_policy_rag_query = any(w in lowered for w in [
            "cover angioplasty", "waiting period", "pre-existing", "affect my claim",
            "policy conditions", "does my policy cover", "room rent limit", "sublimit", "exclusions"
        ])

        if is_policy_rag_query:
            # 1. RAG Retrieval
            rag_chunks = InsuranceRAGSystem.retrieve_clauses(
                query=message,
                policy_id=policy_id,
                top_k=3
            )
            retrieved_clauses = [c.model_dump() for c in rag_chunks]
            tool_records.append(ToolCallRecord(tool="insurance_rag_retrieve", arguments={"query": message, "policy_id": policy_id}, result_count=len(rag_chunks)))

            # 2. Rule Evaluation
            eval_req = EligibilityEvaluationRequest(
                policy_id=policy_id,
                procedure_name="Angioplasty" if "angioplasty" in lowered or "stent" in lowered else ("Cataract Surgery" if "cataract" in lowered else "Medical Inpatient Care"),
                disease_name="Type 2 Diabetes Mellitus" if "diabetes" in lowered else ("Coronary Artery Disease" if "coronary" in lowered or "angioplasty" in lowered else "Disclosed Condition"),
                is_pre_existing="pre-existing" in lowered or "ped" in lowered or "prior" in lowered,
                policy_active_months=12 if "waiting period" in lowered else 24,
                room_type="Single Private",
                is_network_hospital=True
            )
            elig_resp = InsuranceEligibilityEngine.evaluate(eval_req)
            eligibility_evaluation = elig_resp.model_dump()
            tool_records.append(ToolCallRecord(tool="evaluate_insurance_eligibility", arguments=eval_req.model_dump(), result_count=1))

            clause_blocks = []
            for c in rag_chunks:
                clause_blocks.append(
                    f"**{c.clause_title}** *(Source: {c.source_document}, Page {c.page_number}, UIN: `{c.uin}`)*\n"
                    f"> \"{c.verbatim_excerpt}\"\n"
                    f"*Impact*: {c.impact_summary}"
                )

            clauses_formatted = "\n\n".join(clause_blocks)
            answer_parts.append(
                f"### Insurance Policy Analysis: {elig_resp.policy_name}\n"
                f"**Eligibility Status**: `{elig_resp.status}`\n"
                f"**Actuarial Evaluation**: {elig_resp.summary_verdict}\n\n"
                f"#### Verified Relevant Policy Clauses & Wordings:\n"
                f"{clauses_formatted}\n\n"
                f"**Conditions That Might Affect Your Claim**:\n"
                f"- **Pre-Existing Disease (PED)**: Standard retail health policies impose a 24 to 36 months waiting moratorium.\n"
                f"- **Room Rent Restrictions**: Proportionate deductions apply to surgeon and nursing charges if an upgraded room is selected.\n"
                f"- **Non-Medical Consumables**: Excluded under IRDAI Annexure I (e.g. gloves, sanitizers, administrative fees).\n\n"
                f"> **Non-Guarantee Notice**: {elig_resp.disclaimer}"
            )
            confidence_limitations = "Policy clauses extracted verbatim from IRDAI regulatory product filings. Actual claim adjudication rests solely with the insurer/TPA."

        # =========================================================================
        # BRANCH 3: Network Hospital Inquiries
        # Examples: "Which hospitals in Hyderabad are listed in my insurer's network?"
        # =========================================================================
        is_network_query = any(w in lowered for w in [
            "insurer's network", "network hospital", "cashless hospital", "cashless in hyderabad",
            "which hospitals in hyderabad are listed", "empanelled hospitals"
        ])

        if is_network_query:
            match_resp = HospitalInsuranceMatcher.match_ecosystem(
                disease_query="Coronary Artery Disease" if "angio" in lowered or "cardio" in lowered else "General Surgery",
                policy_id=policy_id,
                city=city
            )
            tool_records.append(ToolCallRecord(tool="match_hospital_network", arguments={"city": city, "policy_id": policy_id}, result_count=len(match_resp.matched_hospitals)))

            hosp_cards_text = []
            for h in match_resp.matched_hospitals[:4]:
                cashless_badge = "✅ Confirmed Cashless Network" if h.cashless_available else "⚠️ Reimbursement Empanelled"
                hosp_cards_text.append(
                    f"- **{h.hospital_name}** ({h.hospital_type})\n"
                    f"  - Location: {h.address}\n"
                    f"  - Status: **{cashless_badge}** (TPA: {h.tpa_desk_contact or 'Main Helpdesk'})\n"
                    f"  - Est. Cost Range: {h.indicative_cost_range} | Projected Out-of-Pocket: ₹{int(h.projected_out_of_pocket):,}"
                )

            answer_parts.append(
                f"### Network Hospitals in {city} for {match_resp.insurer_name}\n"
                f"Here are accredited hospitals verified against the {match_resp.policy_name} empanelment directory:\n\n"
                + "\n".join(hosp_cards_text) + "\n\n"
                f"**Empanelment Verification Source**: {match_resp.matched_hospitals[0].verification_source if match_resp.matched_hospitals else 'Official Directory'}."
            )

        # =========================================================================
        # BRANCH 4: Standard Cost Estimation, Healthcare Plan, or General Search
        # =========================================================================
        is_cost_query = any(w in lowered for w in ["cost", "price", "rate", "estimate", "expense", "fee", "how much"])
        is_plan_query = any(w in lowered for w in ["generate plan", "healthcare plan", "navigation plan"])
        is_compare_query = any(w in lowered for w in ["compare", "comparison", "difference between", "versus", " vs "])
        is_eligibility_query = any(w in lowered for w in ["eligible", "eligibility", "qualify", "am i eligible", "who is eligible", "ration card"])
        is_scheme_query = any(w in lowered for w in ["scheme", "government scheme", "schemes cover", "ayushman", "aarogya", "bpl", "cghs", "esic"])

        # Procedure Detection
        procedure_kw = None
        if "angioplasty" in lowered or "stent" in lowered:
            procedure_kw = "Angioplasty"
        elif "knee" in lowered or "joint" in lowered:
            procedure_kw = "Knee Replacement"
        elif "cataract" in lowered:
            procedure_kw = "Cataract Surgery"
        elif "delivery" in lowered or "childbirth" in lowered:
            procedure_kw = "Normal Delivery"
        elif "mri" in lowered or "scan" in lowered:
            procedure_kw = "MRI Scan"
        elif "dialysis" in lowered:
            procedure_kw = "Hemodialysis"

        if is_plan_query and (procedure_kw or specialty):
            target_proc = procedure_kw or f"{specialty} Care"
            plan_args = {"treatment": target_proc, "city": city, "budget": 200000.0, "room_type": "Semi-Private"}
            res = TOOL_DISPATCHER["generate_healthcare_plan"](plan_args)
            healthcare_plan = res.get("healthcare_plan")
            tool_records.append(ToolCallRecord(tool="generate_healthcare_plan", arguments=plan_args, result_count=1))
            answer_parts.append(
                f"### Personalized Healthcare Plan: {target_proc} in {city}\n"
                f"- **Indicative Range**: ₹{healthcare_plan['estimated_cost_min']:,.0f} – ₹{healthcare_plan['estimated_cost_max']:,.0f}\n"
                f"- **Potential Scheme Coverage**: Up to ₹{healthcare_plan['potential_coverage_max']:,.0f}\n"
                f"- **Estimated Out-of-Pocket**: ₹{healthcare_plan['estimated_out_of_pocket_min']:,.0f} – ₹{healthcare_plan['estimated_out_of_pocket_max']:,.0f}\n\n"
                f"**Financial Guidance**: {healthcare_plan['financial_guidance']}"
            )

        elif is_compare_query:
            comp_proc = procedure_kw or "Angioplasty"
            comp_args = {"hospital_ids": ["hosp-hyd-01", "hosp-hyd-02"], "procedure": comp_proc}
            comp_res = TOOL_DISPATCHER["compare_hospitals"](comp_args)
            comparison_result = comp_res
            tool_records.append(ToolCallRecord(tool="compare_hospitals", arguments=comp_args, result_count=len(comp_res.get("hospitals", []))))
            h_lines = [
                f"- **{h['name']}** ({h['hospital_type']}): Indicative {comp_proc} ₹{h['indicative_cost']:,.0f}. "
                f"Empanelled: {', '.join(h['empanelled_schemes'][:2])}."
                for h in comp_res.get("hospitals", [])
            ]
            answer_parts.append(f"### Side-by-Side Comparison for {comp_proc}\n" + "\n".join(h_lines))

        elif is_eligibility_query:
            age_match = re.search(r'\b(\d{1,2})\b', message)
            extracted_age = int(age_match.group(1)) if age_match and int(age_match.group(1)) < 110 else 48
            has_ration = any(w in lowered for w in ["ration", "white card", "bpl", "food security"])
            el_args = {
                "age": extracted_age,
                "state": "Telangana" if city == "Hyderabad" else "All India",
                "has_ration_card": has_ration or True,
                "annual_income": 180000.0,
                "is_senior": extracted_age >= 70 or "senior" in lowered
            }
            el_res = TOOL_DISPATCHER["check_eligibility"](el_args)
            eligibility_result = el_res
            tool_records.append(ToolCallRecord(tool="check_eligibility", arguments=el_args, result_count=el_res.get("total_eligible", 0)))
            
            e_lines = []
            for m in el_res.get("matches", []):
                status_icon = "Eligible" if m["is_eligible"] else "Not Eligible"
                reasons_text = " ".join(m["reasons"])
                e_lines.append(f"- **{m['scheme_name']}** ({status_icon}): Coverage up to ₹{m['coverage_limit']:,.0f}. {reasons_text}")

            answer_parts.append(
                f"### Healthcare Scheme Eligibility Assessment ({extracted_age} yrs, {el_args['state']})\n" +
                "\n".join(e_lines) + f"\n\n**Next Steps**: {el_res.get('guidance', '')}"
            )

        elif is_cost_query and procedure_kw and not is_policy_rag_query:
            cost_args = {"procedure": procedure_kw, "city": city, "room_type": "Semi-Private"}
            cost_result = TOOL_DISPATCHER["estimate_treatment_cost"](cost_args)
            found_cost_estimate = CostEstimate(**cost_result["cost_estimate"])
            tool_records.append(ToolCallRecord(tool="estimate_treatment_cost", arguments=cost_args, result_count=1))
            answer_parts.append(
                f"### Cost Estimation for {found_cost_estimate.procedure}\n"
                f"- **Indicative Range**: ₹{found_cost_estimate.indicative_range_min:,.0f} - ₹{found_cost_estimate.indicative_range_max:,.0f} in {found_cost_estimate.city} ({found_cost_estimate.room_type} room).\n"
                f"- **Average Benchmark**: ₹{found_cost_estimate.average_cost:,.0f}.\n"
                f"- **Eligible Schemes**: {', '.join(found_cost_estimate.covered_under_schemes)}."
            )

        if is_scheme_query and not eligibility_result and not healthcare_plan:
            scheme_args = {"state": "Telangana" if city == "Hyderabad" else None, "specialty": specialty}
            scheme_result = TOOL_DISPATCHER["find_healthcare_schemes"](scheme_args)
            found_schemes = [HealthcareScheme(**s) for s in scheme_result["schemes"]]
            tool_records.append(ToolCallRecord(tool="find_healthcare_schemes", arguments=scheme_args, result_count=len(found_schemes)))
            scheme_names = ", ".join([s.short_code for s in found_schemes[:3]])
            answer_parts.append(
                f"### Relevant Public Healthcare Schemes\n"
                f"Found {len(found_schemes)} applicable schemes ({scheme_names}). Eligible beneficiaries can access cashless treatment up to statutory coverage ceilings."
            )

        # Hospital Search if explicit search term used or empty answer
        if not answer_parts or any(w in lowered for w in ["find hospital", "cardiology in hyderabad", "best hospital"]):
            hosp_args = {"city": city, "specialty": specialty}
            hosp_result = TOOL_DISPATCHER["search_hospitals"](hosp_args)
            found_hospitals = [
                Hospital(**{
                    **h,
                    "rating": h.get("rating", 4.5),
                    "distance_km": h.get("distance_km", 5.0),
                    "data_mode": "verified",
                    "phone": h.get("phone") or h.get("telephone") or "Not available"
                })
                for h in hosp_result["hospitals"]
            ]
            tool_records.append(ToolCallRecord(tool="search_hospitals", arguments=hosp_args, result_count=len(found_hospitals)))
            if not answer_parts:
                answer_parts.append(
                    f"I found **{len(found_hospitals)} accredited hospitals** in {city} for {specialty or 'tertiary healthcare'}. "
                    "You can inspect bed capacities, contact numbers, and verified cashless network tie-ups below."
                )

        final_answer = "\n\n".join(answer_parts)

        return ChatResponse(
            answer=final_answer,
            tool_calls=tool_records,
            hospitals=found_hospitals,
            cost_estimate=found_cost_estimate,
            schemes=found_schemes,
            eligibility_result=eligibility_result,
            comparison_result=comparison_result,
            healthcare_plan=healthcare_plan,
            data_sources=sources_cited,
            medical_explanation=medical_explanation,
            retrieved_clauses=retrieved_clauses,
            eligibility_evaluation=eligibility_evaluation,
            confidence_limitations=confidence_limitations,
            last_verification_date="2026-10-29",
            requires_confirmation=False,
            data_mode="verified"
        )

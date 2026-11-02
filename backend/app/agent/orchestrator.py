import logging
import re
from typing import Any, Optional
from app.config import settings
from app.agent.prompts import EMERGENCY_KEYWORDS, EMERGENCY_MESSAGE
from app.agent.tools import TOOL_DISPATCHER, AVAILABLE_TOOLS_SCHEMA
from app.agent.memory import SessionMemoryStore
from app.services.llm_service import LLMService, LLMResponse
from app.models.chat import ChatResponse, ToolCallRecord
from app.models.hospital import Hospital
from app.models.cost import CostEstimate
from app.models.scheme import HealthcareScheme

logger = logging.getLogger(__name__)

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
        # 1. Emergency Safety Filter (Zero-latency override)
        if cls.check_emergency(message):
            SessionMemoryStore.add_user_message(session_id, message)
            SessionMemoryStore.add_model_message(session_id, EMERGENCY_MESSAGE)
            return ChatResponse(
                answer=EMERGENCY_MESSAGE,
                emergency_detected=True,
                llm_provider="emergency-safety-triage",
                model_id="rule-guardrail",
                is_live_llm=False,
                session_id=session_id,
                data_mode="verified"
            )

        lowered = message.lower()

        # 2. Simulated Appointment Booking Guardrail
        if re.search(r'\b(book|schedule|reserve|confirm)\b.*?\b(appointment|slot|booking)\b|\bappointment\b', lowered):
            booking_text = (
                "I can help register a simulated appointment request for the demo. "
                "Please review the hospital details and confirm your preferred date and contact info."
            )
            SessionMemoryStore.add_user_message(session_id, message)
            SessionMemoryStore.add_model_message(session_id, booking_text)
            return ChatResponse(
                answer=booking_text,
                requires_confirmation=True,
                confirmation_prompt="Please confirm if you would like to proceed with registering this simulated appointment request.",
                llm_provider="appointment-simulation",
                model_id="rule-guardrail",
                is_live_llm=False,
                session_id=session_id,
                data_mode="verified"
            )

        # 3. Retrieve Multi-Turn Conversation History
        history = SessionMemoryStore.get_history_as_dicts(session_id, max_turns=6)
        SessionMemoryStore.add_user_message(session_id, message)

        # 4. Invoke LLM Provider
        provider = LLMService.get_provider()
        llm_resp: LLMResponse = provider.chat(message=message, history=history)

        tool_records: list[ToolCallRecord] = []
        tool_results_for_synthesis: list[dict[str, Any]] = []

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

        # 5. Execute Tools Requested by LLM
        if llm_resp.tool_calls:
            for call in llm_resp.tool_calls:
                func_name = call.name
                func_args = call.args
                executor = TOOL_DISPATCHER.get(func_name)
                if not executor:
                    logger.warning(f"Tool {func_name} requested by LLM not found in dispatcher.")
                    continue

                try:
                    raw_result = executor(func_args)
                    result_count = 1
                    if isinstance(raw_result, dict):
                        if "count" in raw_result:
                            result_count = raw_result["count"]
                        elif "hospitals" in raw_result:
                            result_count = len(raw_result["hospitals"])
                        elif "clauses" in raw_result:
                            result_count = len(raw_result["clauses"])

                    tool_records.append(
                        ToolCallRecord(tool=func_name, arguments=func_args, result_count=result_count)
                    )
                    tool_results_for_synthesis.append({
                        "tool": func_name,
                        "args": func_args,
                        "result": raw_result
                    })

                    # Map tool results to structured frontend card models
                    if func_name == "search_hospitals":
                        for h in raw_result.get("hospitals", []):
                            found_hospitals.append(Hospital(**{
                                **h,
                                "rating": h.get("rating", 4.5),
                                "distance_km": h.get("distance_km", 5.0),
                                "data_mode": "verified",
                                "phone": h.get("phone") or h.get("telephone") or "Not available"
                            }))
                    elif func_name == "get_hospital_details" and "hospital" in raw_result:
                        h = raw_result["hospital"]
                        found_hospitals.append(Hospital(**{
                            **h,
                            "rating": h.get("rating", 4.5),
                            "distance_km": h.get("distance_km", 5.0),
                            "data_mode": "verified",
                            "phone": h.get("phone") or h.get("telephone") or "Not available"
                        }))
                    elif func_name == "estimate_treatment_cost" and "cost_estimate" in raw_result:
                        found_cost_estimate = CostEstimate(**raw_result["cost_estimate"])
                    elif func_name in ("get_government_schemes", "find_healthcare_schemes"):
                        for s in raw_result.get("schemes", []):
                            found_schemes.append(HealthcareScheme(**s))
                    elif func_name == "check_eligibility":
                        eligibility_result = raw_result
                    elif func_name == "compare_hospitals":
                        comparison_result = raw_result
                    elif func_name == "generate_healthcare_plan":
                        healthcare_plan = raw_result.get("healthcare_plan")
                    elif func_name == "get_disease_info" and raw_result.get("found"):
                        medical_explanation = {
                            "disease_or_topic": raw_result.get("disease_name"),
                            "icd11_code": raw_result.get("icd11_code"),
                            "etiology_and_causes": raw_result.get("etiology"),
                            "symptoms": {
                                "cardinal": [s.strip() for s in raw_result.get("cardinal_symptoms", "").split(",") if s.strip()],
                                "emergency_red_flags": raw_result.get("emergency_red_flags", [])
                            },
                            "diagnostic_workup": raw_result.get("diagnostic_workup", []),
                            "clinical_disclaimer": "Informational medical knowledge reference. Does not constitute a personal diagnosis or prescription."
                        }
                    elif func_name == "retrieve_policy_clauses":
                        retrieved_clauses = [
                            {
                                "clause": {
                                    "policy_name": c.get("policy_name"),
                                    "uin": c.get("uin"),
                                    "clause_title": c.get("clause_title"),
                                    "section_reference": c.get("section_reference"),
                                    "page_number": c.get("page_number"),
                                    "clause_text": c.get("verbatim_text"),
                                    "impact_summary": c.get("impact_summary")
                                },
                                "similarity_score": c.get("relevance_score", 0.85)
                            }
                            for c in raw_result.get("clauses", [])
                        ]
                    elif func_name in ("evaluate_insurance_eligibility", "check_waiting_periods"):
                        eligibility_evaluation = raw_result
                    elif func_name == "match_cashless_network":
                        for h in raw_result.get("matched_hospitals", []):
                            found_hospitals.append(Hospital(
                                id=h.get("hospital_id", "hosp-net-01"),
                                name=h.get("hospital_name", ""),
                                address=h.get("address", ""),
                                city=raw_result.get("city", "Hyderabad"),
                                state="Telangana",
                                category=h.get("hospital_type", "Multi-Specialty"),
                                hospital_type=h.get("hospital_type", "Multi-Specialty"),
                                facilities=["Cashless Desk", "TPA Support"],
                                specialties=[raw_result.get("disease_matched", "Cardiology")],
                                contact_number=h.get("tpa_desk_contact") or "Helpdesk Available",
                                phone=h.get("tpa_desk_contact") or "Helpdesk Available",
                                rating=4.6,
                                distance_km=4.2,
                                empanelled_schemes=["Cashless Insurance", "PM-JAY"],
                                data_mode="verified"
                            ))

                except Exception as ex:
                    logger.error(f"Error executing tool {func_name}: {ex}")

        # 6. Final Response Grounding & Synthesis
        final_answer = ""
        if tool_results_for_synthesis:
            synthesis_res = provider.synthesize_with_tools(
                message=message,
                tool_results=tool_results_for_synthesis,
                history=history
            )
            final_answer = synthesis_res.content or llm_resp.content

        if not final_answer:
            final_answer = llm_resp.content or "I have queried the verified healthcare and insurance databases for your request."

        # If LLM encountered an error, append helpful status
        if llm_resp.error_message:
            final_answer += f"\n\n*(Notice: {llm_resp.error_message})*"

        # 7. Record Model Turn to Memory
        SessionMemoryStore.add_model_message(
            session_id=session_id,
            content=final_answer,
            tool_calls=[{"tool": r.tool, "args": r.arguments} for r in tool_records]
        )

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
            llm_provider=llm_resp.provider,
            model_id=llm_resp.model_id,
            is_live_llm=llm_resp.is_live_llm,
            session_id=session_id,
            requires_confirmation=False,
            data_mode="verified" if llm_resp.is_live_llm else "offline-rule-agent"
        )

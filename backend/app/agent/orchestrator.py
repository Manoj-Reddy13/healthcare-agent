import re
from typing import Optional
from app.config import settings
from app.agent.prompts import EMERGENCY_KEYWORDS, EMERGENCY_MESSAGE
from app.agent.tools import TOOL_DISPATCHER, AVAILABLE_TOOLS_SCHEMA
from app.models.chat import ChatResponse, ToolCallRecord
from app.models.hospital import Hospital
from app.models.cost import CostEstimate
from app.models.scheme import HealthcareScheme

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
                data_mode="mock"
            )

        lowered = message.lower()

        # 2. Appointment booking safety check
        if any(term in lowered for term in ["book appointment", "schedule appointment", "reserve slot", "confirm booking"]):
            return ChatResponse(
                answer=(
                    "I can help register a **simulated appointment request** for the demo. "
                    "Please review the hospital details and confirm your preferred date and contact info."
                ),
                requires_confirmation=True,
                confirmation_prompt="Please confirm if you would like to proceed with registering this simulated appointment request.",
                data_mode="mock"
            )

        # 3. Intent detection & Tool execution loop
        tool_records: list[ToolCallRecord] = []
        found_hospitals: list[Hospital] = []
        found_cost_estimate: Optional[CostEstimate] = None
        found_schemes: list[HealthcareScheme] = []
        answer_parts: list[str] = []

        # Detect City
        city = None
        if "hyderabad" in lowered:
            city = "Hyderabad"
        elif "bengaluru" in lowered or "bangalore" in lowered:
            city = "Bengaluru"

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
            "eye": "Ophthalmology",
            "cataract": "Ophthalmology"
        }
        for kw, spec in specialty_map.items():
            if kw in lowered:
                specialty = spec
                break

        # Detect Scheme interest
        scheme_filter = None
        if "ayushman" in lowered or "pm-jay" in lowered or "pmjay" in lowered:
            scheme_filter = "Ayushman Bharat"
        elif "aarogya" in lowered or "arogya" in lowered:
            scheme_filter = "Aarogyasri"
        elif "cghs" in lowered:
            scheme_filter = "CGHS"
        elif "esi" in lowered:
            scheme_filter = "ESIC"

        # Detect Cost estimation intent
        is_cost_query = any(w in lowered for w in ["cost", "price", "rate", "estimate", "expense", "fee", "how much"])
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
        elif "consult" in lowered or "doctor fee" in lowered:
            procedure_kw = "Doctor Consultation"
        elif is_cost_query and specialty:
            procedure_kw = f"{specialty} Procedure"

        # Detect Scheme lookup intent
        is_scheme_query = any(w in lowered for w in ["scheme", "insurance", "policy", "ayushman", "aarogya", "bpl", "ration card", "claim", "government"])

        # Decide which tools to run
        ran_hospital_tool = False
        ran_cost_tool = False
        ran_scheme_tool = False

        # If user explicitly asked for procedure cost
        if is_cost_query and procedure_kw:
            cost_args = {"procedure": procedure_kw, "city": city or "Hyderabad", "room_type": "Semi-Private"}
            cost_result = TOOL_DISPATCHER["estimate_treatment_cost"](cost_args)
            found_cost_estimate = CostEstimate(**cost_result["cost_estimate"])
            tool_records.append(ToolCallRecord(tool="estimate_treatment_cost", arguments=cost_args, result_count=1))
            ran_cost_tool = True
            answer_parts.append(
                f"### Cost Estimation for {found_cost_estimate.procedure}\n"
                f"- **Indicative Range**: ₹{found_cost_estimate.indicative_range_min:,.0f} - ₹{found_cost_estimate.indicative_range_max:,.0f} in {found_cost_estimate.city} ({found_cost_estimate.room_type} room).\n"
                f"- **Average Benchmark**: ₹{found_cost_estimate.average_cost:,.0f}.\n"
                f"- **Eligible Schemes**: {', '.join(found_cost_estimate.covered_under_schemes)}."
            )

        # If user asked for schemes or general government aid
        if is_scheme_query or (scheme_filter and not ran_cost_tool):
            scheme_args = {"state": "Telangana" if city == "Hyderabad" else None, "specialty": specialty}
            scheme_result = TOOL_DISPATCHER["find_healthcare_schemes"](scheme_args)
            schemes_data = [HealthcareScheme(**s) for s in scheme_result["schemes"]]
            if scheme_filter:
                schemes_data = [s for s in schemes_data if scheme_filter.lower() in s.name.lower() or scheme_filter.lower() in s.short_code.lower()] or schemes_data
            found_schemes = schemes_data
            tool_records.append(ToolCallRecord(tool="find_healthcare_schemes", arguments=scheme_args, result_count=len(found_schemes)))
            ran_scheme_tool = True
            scheme_names = ", ".join([s.short_code for s in found_schemes[:3]])
            answer_parts.append(
                f"### Relevant Public Healthcare Schemes\n"
                f"Found {len(found_schemes)} applicable schemes ({scheme_names}). Eligible beneficiaries can access cashless treatment up to government coverage ceilings."
            )

        # By default or if hospital search context exists
        if not ran_scheme_tool and not ran_cost_tool or any(w in lowered for w in ["hospital", "clinic", "doctor", "find", "best", "affordable", "near"]):
            hosp_args = {
                "city": city or "Hyderabad",
                "specialty": specialty,
                "scheme": scheme_filter
            }
            hosp_result = TOOL_DISPATCHER["search_hospitals"](hosp_args)
            found_hospitals = [Hospital(**h) for h in hosp_result["hospitals"]]
            tool_records.append(ToolCallRecord(tool="search_hospitals", arguments=hosp_args, result_count=len(found_hospitals)))
            ran_hospital_tool = True

            city_label = city or "Hyderabad"
            spec_label = f" specializing in {specialty}" if specialty else ""
            scheme_label = f" accepting {scheme_filter}" if scheme_filter else ""
            answer_parts.insert(0,
                f"I found **{len(found_hospitals)} hospitals** in {city_label}{spec_label}{scheme_label}. "
                "Below are indicative cost benchmarks and accepted government schemes for your consideration."
            )

        # Fallback if no specific intent recognized
        if not answer_parts:
            # Run general hospital lookup for Hyderabad
            hosp_args = {"city": "Hyderabad"}
            hosp_result = TOOL_DISPATCHER["search_hospitals"](hosp_args)
            found_hospitals = [Hospital(**h) for h in hosp_result["hospitals"]]
            tool_records.append(ToolCallRecord(tool="search_hospitals", arguments=hosp_args, result_count=len(found_hospitals)))
            answer_parts.append(
                "Welcome to the **Healthcare Cost & Care Navigation Agent**. "
                "I can assist you in finding nearby hospitals, calculating indicative procedure costs, "
                "and verifying public health schemes like Ayushman Bharat (PM-JAY) and Aarogyasri. "
                "Here are healthcare centers in Hyderabad to get started:"
            )

        final_answer = "\n\n".join(answer_parts)

        return ChatResponse(
            answer=final_answer,
            tool_calls=tool_records,
            hospitals=found_hospitals,
            cost_estimate=found_cost_estimate,
            schemes=found_schemes,
            requires_confirmation=False,
            data_mode="mock"
        )

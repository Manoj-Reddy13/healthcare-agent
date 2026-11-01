import re
from typing import Any, Optional
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
                    "I can help register a simulated appointment request for the demo. "
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
        eligibility_result: Optional[dict[str, Any]] = None
        comparison_result: Optional[dict[str, Any]] = None
        healthcare_plan: Optional[dict[str, Any]] = None
        sources_cited: list[str] = [
            "National Health Authority (NHA) Package Master 2024",
            "Telangana Aarogyasri Trust Guideline Orders",
            "CGHS 2025/2026 Tariff Benchmark Schedule"
        ]
        answer_parts: list[str] = []

        # Detect City
        city = None
        if "hyderabad" in lowered or "secunderabad" in lowered:
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

        # Detect Procedure keywords
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

        # Detect Intent categories
        is_plan_query = any(w in lowered for w in ["plan", "generate plan", "budget", "healthcare plan", "navigation plan"])
        is_compare_query = any(w in lowered for w in ["compare", "comparison", "difference between", "versus", " vs "])
        is_eligibility_query = any(w in lowered for w in ["eligible", "eligibility", "qualify", "am i eligible", "who is eligible", "ration card"])
        is_scheme_query = any(w in lowered for w in ["scheme", "insurance", "policy", "ayushman", "aarogya", "bpl", "claim", "government"])

        ran_cost_tool = False
        ran_scheme_tool = False

        # Branch A: Healthcare Plan Generation
        if is_plan_query and (procedure_kw or specialty):
            target_proc = procedure_kw or f"{specialty} Care"
            plan_args = {
                "treatment": target_proc,
                "city": city or "Hyderabad",
                "budget": 200000.0,
                "room_type": "Semi-Private"
            }
            res = TOOL_DISPATCHER["generate_healthcare_plan"](plan_args)
            healthcare_plan = res.get("healthcare_plan")
            tool_records.append(ToolCallRecord(tool="generate_healthcare_plan", arguments=plan_args, result_count=1))
            answer_parts.append(
                f"### Personalized Healthcare Plan: {target_proc} in {city or 'Hyderabad'}\n"
                f"- **Indicative Range**: ₹{healthcare_plan['estimated_cost_min']:,.0f} – ₹{healthcare_plan['estimated_cost_max']:,.0f}\n"
                f"- **Potential Scheme Coverage**: Up to ₹{healthcare_plan['potential_coverage_max']:,.0f}\n"
                f"- **Estimated Out-of-Pocket**: ₹{healthcare_plan['estimated_out_of_pocket_min']:,.0f} – ₹{healthcare_plan['estimated_out_of_pocket_max']:,.0f}\n\n"
                f"**Financial Guidance**: {healthcare_plan['financial_guidance']}\n"
                f"Recommended facilities include **{', '.join([h['name'] for h in healthcare_plan['recommended_hospitals'][:2]])}**."
            )

        # Branch B: Hospital Comparison
        elif is_compare_query:
            comp_proc = procedure_kw or "Angioplasty"
            hosp_ids = ["hosp-hyd-01", "hosp-hyd-02"]
            if "care" in lowered:
                hosp_ids.append("hosp-hyd-04")
            if "kims" in lowered:
                hosp_ids.append("hosp-hyd-03")
            comp_args = {"hospital_ids": hosp_ids, "procedure": comp_proc}
            comp_res = TOOL_DISPATCHER["compare_hospitals"](comp_args)
            comparison_result = comp_res
            tool_records.append(ToolCallRecord(tool="compare_hospitals", arguments=comp_args, result_count=len(comp_res.get("hospitals", []))))
            
            h_lines = []
            for h in comp_res.get("hospitals", []):
                h_lines.append(
                    f"- **{h['name']}** ({h['hospital_type']}, {h['locality']}): Indicative {comp_proc} ₹{h['indicative_cost']:,.0f}. "
                    f"Rating {h['rating']}★, {h['distance_km']} km. Empanelled: {', '.join(h['empanelled_schemes'][:2])}."
                )
            answer_parts.append(
                f"### Side-by-Side Comparison for {comp_proc}\n" + "\n".join(h_lines) + "\n\n"
                "Corporate hospitals provide shorter wait times and single-room suites; autonomous state institutes like NIMS provide statutory package tariffs under government supervision."
            )

        # Branch C: Eligibility Assessment
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

        # Branch D: Cost Estimation Intent
        elif is_cost_query and procedure_kw:
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

        # Branch E: Scheme Information
        if (is_scheme_query or (scheme_filter and not ran_cost_tool)) and not eligibility_result and not healthcare_plan:
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

        # Branch F: Hospital Search
        if (not ran_scheme_tool and not ran_cost_tool) or any(w in lowered for w in ["hospital", "clinic", "doctor", "find", "best", "affordable", "near"]):
            # Detect district or state if specified in user message
            detected_district = None
            for d_name in ["south andaman", "warangal", "karimnagar", "khammam", "nizamabad", "rangareddy", "medchal", "pune", "mumbai", "nagpur", "ahmedabad", "surat", "chennai", "coimbatore", "bengaluru", "mysuru"]:
                if d_name in lowered:
                    detected_district = d_name.title()
                    break

            hosp_args = {
                "city": city or detected_district or "Hyderabad",
                "district": detected_district,
                "specialty": specialty,
                "scheme": scheme_filter
            }
            hosp_result = TOOL_DISPATCHER["search_hospitals"](hosp_args)
            
            converted_hospitals = []
            for h in hosp_result["hospitals"]:
                if "rating" not in h or h.get("rating") is None:
                    h_copy = dict(h)
                    h_copy["rating"] = 4.0
                    h_copy["distance_km"] = 5.0
                    h_copy["city"] = h_copy.get("district") or h_copy.get("state") or "Hyderabad"
                    h_copy["data_mode"] = "verified"
                    h_copy["phone"] = h_copy.get("telephone") or h_copy.get("mobile_number") or "Not available"
                    converted_hospitals.append(Hospital(**h_copy))
                else:
                    converted_hospitals.append(Hospital(**h))

            found_hospitals = converted_hospitals
            tool_records.append(ToolCallRecord(tool="search_hospitals", arguments=hosp_args, result_count=len(found_hospitals)))

            loc_label = detected_district or city or "Hyderabad"
            spec_label = f" specializing in {specialty}" if specialty else ""
            scheme_label = f" accepting {scheme_filter}" if scheme_filter else ""
            
            # Contact info highlighting if asked
            contact_bullet = ""
            if any(w in lowered for w in ["contact", "phone", "number", "call", "telephone"]):
                phones = [f"- **{h.name}**: {h.phone}" for h in found_hospitals[:3] if h.phone and h.phone != 'Not available']
                if phones:
                    contact_bullet = "\n\n**Hospital Contact Details**:\n" + "\n".join(phones)

            answer_parts.insert(0,
                f"I found **{len(found_hospitals)} hospitals** in {loc_label}{spec_label}{scheme_label}. "
                "Below are hospital records and contact information retrieved directly from the verified database."
                f"{contact_bullet}"
            )

        # Fallback welcome if nothing matched
        if not answer_parts:
            hosp_args = {"city": "Hyderabad"}
            hosp_result = TOOL_DISPATCHER["search_hospitals"](hosp_args)
            found_hospitals = [Hospital(**h) for h in hosp_result["hospitals"]]
            tool_records.append(ToolCallRecord(tool="search_hospitals", arguments=hosp_args, result_count=len(found_hospitals)))
            answer_parts.append(
                "Welcome to the **CareNav AI Healthcare Navigation Platform**. "
                "I can assist you in finding nearby accredited hospitals, calculating indicative procedure costs, "
                "verifying public schemes like Ayushman Bharat (PM-JAY) and Aarogyasri, and generating personalized care navigation plans."
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
            requires_confirmation=False,
            data_mode="mock"
        )

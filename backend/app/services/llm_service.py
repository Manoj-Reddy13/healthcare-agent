import os
import re
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import AVAILABLE_TOOLS_SCHEMA, TOOL_DISPATCHER

logger = logging.getLogger(__name__)

class LLMToolCall(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)

class LLMResponse(BaseModel):
    content: str
    tool_calls: list[LLMToolCall] = Field(default_factory=list)
    provider: str
    model_id: str
    is_live_llm: bool
    status: str = "success"  # "success" | "rate_limited" | "error" | "offline_mode"
    error_message: Optional[str] = None

class BaseLLMProvider(ABC):
    @abstractmethod
    def chat(
        self,
        message: str,
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        pass

    @abstractmethod
    def synthesize_with_tools(
        self,
        message: str,
        tool_results: list[dict[str, Any]],
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        pass

class GeminiLLMProvider(BaseLLMProvider):
    """
    Official Google Gemini API implementation using the google-genai SDK.
    Supports native tool / function calling, multi-turn history, and structured response synthesis.
    """
    def __init__(self, api_key: str, model_id: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model_id = model_id
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.is_live_llm = True

    def _build_tools_config(self):
        from google.genai import types
        decls = []
        for t in AVAILABLE_TOOLS_SCHEMA:
            decls.append(
                types.FunctionDeclaration(
                    name=t["name"],
                    description=t["description"],
                    parameters=t.get("parameters")
                )
            )
        return [types.Tool(function_declarations=decls)]

    def chat(
        self,
        message: str,
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        from google.genai import types, errors

        try:
            tools = self._build_tools_config()
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                tools=tools
            )

            # Build multi-turn content
            contents = []
            for turn in history:
                role = "user" if turn.get("role") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=turn.get("content", ""))]
                    )
                )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=message)]
                )
            )

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=config
            )

            # Check if Gemini invoked function calls
            tool_calls = []
            if response.function_calls:
                for call in response.function_calls:
                    tool_calls.append(
                        LLMToolCall(
                            name=call.name,
                            args=dict(call.args) if call.args else {}
                        )
                    )

            text_output = ""
            try:
                text_output = response.text or ""
            except Exception:
                text_output = ""

            return LLMResponse(
                content=text_output,
                tool_calls=tool_calls,
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="success"
            )

        except errors.APIError as e:
            logger.error(f"Gemini API Error: {e}")
            is_rate_limit = getattr(e, "code", None) == 429 or "429" in str(e)
            return LLMResponse(
                content="",
                tool_calls=[],
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="rate_limited" if is_rate_limit else "error",
                error_message=f"Gemini API Error ({getattr(e, 'code', 'error')}): {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error communicating with Gemini API: {e}")
            return LLMResponse(
                content="",
                tool_calls=[],
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="error",
                error_message=f"LLM connection error: {str(e)}"
            )

    def synthesize_with_tools(
        self,
        message: str,
        tool_results: list[dict[str, Any]],
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        from google.genai import types, errors

        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )

            formatted_results = []
            for res in tool_results:
                tool_name = res.get("tool", "unknown_tool")
                data = res.get("result", {})
                formatted_results.append(f"Tool `{tool_name}` output:\n{data}")

            synthesis_prompt = (
                f"Patient Question: {message}\n\n"
                f"Verified Database Tool Outputs:\n"
                + "\n---\n".join(formatted_results)
                + "\n\nPlease synthesize a clear, comprehensive, and compassionate response strictly grounded in the tool outputs above. "
                "Include concrete hospital names, procedure costs, waiting periods, and scheme benefits where available. "
                "Cite official source documents and page numbers where present. Maintain standard medical safety disclaimers."
            )

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=synthesis_prompt,
                config=config
            )

            return LLMResponse(
                content=response.text or "I have retrieved the verified healthcare records above.",
                tool_calls=[],
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="success"
            )

        except errors.APIError as e:
            logger.error(f"Gemini synthesis API Error: {e}")
            return LLMResponse(
                content="",
                tool_calls=[],
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="error",
                error_message=f"Gemini Synthesis Error: {str(e)}"
            )
        except Exception as e:
            return LLMResponse(
                content="",
                tool_calls=[],
                provider="google-gemini",
                model_id=self.model_id,
                is_live_llm=True,
                status="error",
                error_message=str(e)
            )


class OpenAICompatibleLLMProvider(BaseLLMProvider):
    """
    OpenAI-compatible LLM provider supporting Groq, OpenAI, OpenRouter, and Ollama.
    Supports native tool / function calling and multi-turn chat completions.
    """
    def __init__(
        self,
        api_key: str,
        model_id: str = "llama-3.3-70b-versatile",
        base_url: str = "https://api.groq.com/openai/v1",
        provider_name: str = "groq"
    ):
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.provider_name = provider_name
        self.is_live_llm = True

    def _build_tools_config(self) -> list[dict[str, Any]]:
        tools = []
        for t in AVAILABLE_TOOLS_SCHEMA:
            tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t.get("parameters", {"type": "object", "properties": {}})
                }
            })
        return tools

    def chat(
        self,
        message: str,
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        import httpx
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        messages = [{"role": "system", "content": system_instruction}]
        for turn in history:
            role = "user" if turn.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": turn.get("content", "")})
        messages.append({"role": "user", "content": message})

        payload = {
            "model": self.model_id,
            "messages": messages,
            "tools": self._build_tools_config(),
            "tool_choice": "auto",
            "temperature": 0.2
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code != 200:
                    err_msg = res.text
                    logger.error(f"{self.provider_name} API Error ({res.status_code}): {err_msg}")
                    return LLMResponse(
                        content="",
                        tool_calls=[],
                        provider=self.provider_name,
                        model_id=self.model_id,
                        is_live_llm=True,
                        status="error",
                        error_message=f"{self.provider_name.title()} API Error ({res.status_code}): {err_msg}"
                    )
                data = res.json()
                choice = data["choices"][0]
                msg = choice.get("message", {})
                tool_calls = []
                if "tool_calls" in msg and msg["tool_calls"]:
                    for tc in msg["tool_calls"]:
                        func = tc.get("function", {})
                        fname = func.get("name")
                        fargs = {}
                        try:
                            fargs = json.loads(func.get("arguments", "{}"))
                        except Exception:
                            fargs = {}
                        if fname:
                            tool_calls.append(LLMToolCall(name=fname, args=fargs))
                return LLMResponse(
                    content=msg.get("content") or "",
                    tool_calls=tool_calls,
                    provider=self.provider_name,
                    model_id=self.model_id,
                    is_live_llm=True,
                    status="success"
                )
        except Exception as e:
            logger.error(f"Connection error to {self.provider_name}: {e}")
            return LLMResponse(
                content="",
                tool_calls=[],
                provider=self.provider_name,
                model_id=self.model_id,
                is_live_llm=True,
                status="error",
                error_message=f"Connection error to {self.provider_name}: {str(e)}"
            )

    def synthesize_with_tools(
        self,
        message: str,
        tool_results: list[dict[str, Any]],
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        import httpx
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        formatted_results = []
        for res in tool_results:
            tool_name = res.get("tool", "unknown_tool")
            data = res.get("result", {})
            formatted_results.append(f"Tool `{tool_name}` output:\n{data}")

        synthesis_prompt = (
            f"Patient Question: {message}\n\n"
            f"Verified Database Tool Outputs:\n"
            + "\n---\n".join(formatted_results)
            + "\n\nPlease synthesize a clear, comprehensive, and compassionate response strictly grounded in the tool outputs above. "
            "Include concrete hospital names, procedure costs, waiting periods, and scheme benefits where available. "
            "Cite official source documents and page numbers where present. Maintain standard medical safety disclaimers."
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": synthesis_prompt}
        ]

        payload = {
            "model": self.model_id,
            "messages": messages,
            "temperature": 0.2
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code != 200:
                    return LLMResponse(
                        content="",
                        tool_calls=[],
                        provider=self.provider_name,
                        model_id=self.model_id,
                        is_live_llm=True,
                        status="error",
                        error_message=f"Synthesis Error ({res.status_code}): {res.text}"
                    )
                data = res.json()
                text = data["choices"][0]["message"].get("content", "")
                return LLMResponse(
                    content=text or "I have retrieved the verified healthcare records above.",
                    tool_calls=[],
                    provider=self.provider_name,
                    model_id=self.model_id,
                    is_live_llm=True,
                    status="success"
                )
        except Exception as e:
            return LLMResponse(
                content="",
                tool_calls=[],
                provider=self.provider_name,
                model_id=self.model_id,
                is_live_llm=True,
                status="error",
                error_message=str(e)
            )


class OfflineRuleLLMProvider(BaseLLMProvider):
    """
    High-fidelity clinical navigation engine when no external LLM API key is connected.
    Handles natural language greetings, symptom inquiries, and deterministic tool dispatching.
    """
    def __init__(self):
        self.model_id = "rule-based-fallback"
        self.is_live_llm = False

    def chat(
        self,
        message: str,
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        lowered = message.lower().strip()
        tool_calls: list[LLMToolCall] = []

        # Detect City
        city = "Hyderabad"
        for c in ["hyderabad", "bengaluru", "bangalore", "mumbai", "delhi", "jaipur"]:
            if c in lowered:
                city = "Bengaluru" if c == "bangalore" else c.title()
                break

        # 1. Greetings, Introductions & Capabilities
        greeting_words = [
            "hi", "hello", "hey", "greetings", "good morning", "good evening", "good afternoon",
            "who are you", "what can you do", "help", "help me", "how does this work",
            "what is this", "what is carenav", "features", "capabilities", "menu", "start"
        ]
        if any(re.search(r'\b' + re.escape(w) + r'\b', lowered) for w in greeting_words):
            welcome_text = (
                "Hello! I am **CareNav AI**, an intelligent healthcare navigation agent designed to help patients navigate hospitals, treatment costs, insurance policies, and government welfare programs across India.\n\n"
                "### How I Can Assist You:\n"
                "1. **🏥 Find Accredited Hospitals**: Search across 30,000+ public and private hospitals by specialty, accreditation (NABH/NABL), and city.\n"
                "2. **💰 Estimate Treatment Costs**: Benchmark indicative costs for procedures (e.g., Angioplasty, Knee Replacement, Cataract) with room tier comparisons.\n"
                "3. **🛡 Health Insurance Coverage**: Look up IRDAI policy clauses, verify waiting periods for pre-existing diseases (PED), and understand claim conditions.\n"
                "4. **🏛 Government Healthcare Schemes**: Check eligibility for Ayushman Bharat (PM-JAY), Telangana Aarogyasri, and CGHS.\n"
                "5. **🩺 WHO ICD-11 Medical Intelligence**: Understand medical conditions, cardinal symptoms, red flags, and diagnostic pathways.\n\n"
                "**Try asking questions like:**\n"
                "- *\"What is the cost of angioplasty in Hyderabad?\"*\n"
                "- *\"Which government schemes cover heart surgery?\"*\n"
                "- *\"Does my health insurance policy cover pre-existing diabetes?\"*\n"
                "- *\"Find top cardiology hospitals in Hyderabad\"*\n"
                "- *\"What are common causes and treatments for coronary artery disease?\"*"
            )
            return LLMResponse(
                content=welcome_text,
                tool_calls=[],
                provider="offline-rule-agent",
                model_id=self.model_id,
                is_live_llm=False,
                status="offline_mode"
            )

        # 2. Courtesy / Acknowledgments
        courtesy_words = ["thank you", "thanks", "ok", "okay", "got it", "great", "awesome", "bye", "goodbye"]
        if any(re.search(r'\b' + re.escape(w) + r'\b', lowered) for w in courtesy_words):
            return LLMResponse(
                content="You're very welcome! If you have any further questions about hospital options, procedure cost estimates, insurance coverage terms, or government schemes, feel free to ask anytime. Wishing you good health!",
                tool_calls=[],
                provider="offline-rule-agent",
                model_id=self.model_id,
                is_live_llm=False,
                status="offline_mode"
            )

        # 3. Plan Generation Query
        if any(w in lowered for w in ["healthcare plan", "navigation plan", "generate a plan", "generate plan", "generate a healthcare plan"]):
            target_proc = "Angioplasty" if ("angioplasty" in lowered or "stent" in lowered) else "Cardiology Care"
            tool_calls.append(LLMToolCall(name="generate_healthcare_plan", args={"treatment": target_proc, "city": city, "budget": 200000.0}))

        # 4. Hospital Comparison Query
        elif any(w in lowered for w in ["compare apollo and nims", "compare apollo", "compare hospitals", "comparison", "difference between", "versus", " vs "]):
            comp_proc = "Angioplasty" if "angioplasty" in lowered else "Doctor Consultation"
            tool_calls.append(LLMToolCall(name="compare_hospitals", args={"hospital_ids": ["hosp-hyd-01", "hosp-hyd-02"], "procedure": comp_proc}))

        # 5. Scheme Eligibility Assessment
        elif any(w in lowered for w in ["am i eligible", "eligibility", "qualify", "who is eligible", "ration card"]):
            age_match = re.search(r'\b(\d{1,2})\b', message)
            extracted_age = int(age_match.group(1)) if age_match and int(age_match.group(1)) < 110 else 55
            tool_calls.append(LLMToolCall(name="check_eligibility", args={
                "age": extracted_age,
                "state": "Telangana" if city == "Hyderabad" else "All India",
                "has_ration_card": True,
                "annual_income": 180000.0,
                "is_senior": extracted_age >= 70
            }))

        # 6. Government Schemes Listing
        elif any(w in lowered for w in ["schemes cover", "government schemes", "government scheme", "which schemes", "schemes", "ayushman", "aarogyasri"]):
            tool_calls.append(LLMToolCall(name="find_healthcare_schemes", args={"state": "Telangana" if city == "Hyderabad" else None, "specialty": "Cardiology" if "heart" in lowered or "cardio" in lowered else None}))

        # 7. Policy Conditions, Waiting Periods & Claim Inquiries
        elif any(w in lowered for w in ["does my policy cover", "waiting period", "affect my claim", "policy conditions", "room rent limit", "pre-existing", "ped"]):
            pol_id = "pol-star-comp"
            if "hdfc" in lowered or "optima" in lowered: pol_id = "pol-hdfc-optima"
            elif "care" in lowered: pol_id = "pol-care-sup"
            tool_calls.append(LLMToolCall(name="retrieve_policy_clauses", args={"query": message, "policy_id": pol_id, "top_k": 3}))
            tool_calls.append(LLMToolCall(name="evaluate_insurance_eligibility", args={
                "policy_id": pol_id,
                "procedure_name": "Angioplasty" if "angioplasty" in lowered or "stent" in lowered else "Cataract Surgery",
                "disease_name": "Coronary Artery Disease" if "angioplasty" in lowered or "heart" in lowered else "Type 2 Diabetes Mellitus",
                "is_pre_existing": "pre-existing" in lowered or "ped" in lowered,
                "policy_active_months": 12 if "waiting period" in lowered else 24,
                "room_type": "Single Private"
            }))

        # 8. Network Hospital Lookups
        elif any(w in lowered for w in ["insurer's network", "network hospital", "cashless hospital", "cashless in hyderabad", "listed in my insurer"]):
            pol_id = "pol-star-comp"
            tool_calls.append(LLMToolCall(name="match_cashless_network", args={"city": city, "policy_id": pol_id, "specialty": "Cardiology"}))

        # 9. Procedure Cost Estimates
        elif any(w in lowered for w in ["cost", "price", "how much", "rate", "fee"]):
            proc = "Angioplasty"
            if "knee" in lowered: proc = "Knee Replacement"
            elif "cataract" in lowered: proc = "Cataract Surgery"
            elif "delivery" in lowered: proc = "Normal Delivery"
            tool_calls.append(LLMToolCall(name="estimate_treatment_cost", args={"procedure": proc, "city": city}))

        # 10. Medical Understanding & Symptoms (WHO ICD-11)
        elif any(w in lowered for w in [
            "causes of", "symptoms of", "what is diabetes", "what is coronary", "treatments are associated",
            "treatment for", "diagnose", "etiology", "risk factors", "disease", "diabetes", "coronary",
            "heart", "cardio", "cataract", "knee", "kidney", "fever", "headache", "stomach", "vomiting",
            "dizziness", "chest pain", "shortness of breath", "hypertension", "bp", "blood pressure"
        ]):
            disease_query = "Coronary Artery Disease"
            if "diabetes" in lowered or "sugar" in lowered: disease_query = "Type 2 Diabetes Mellitus"
            elif "cataract" in lowered or "eye" in lowered: disease_query = "Senile Cataract"
            elif "knee" in lowered or "osteoarthritis" in lowered or "joint" in lowered: disease_query = "Osteoarthritis of Knee Joint"
            elif "kidney" in lowered or "ckd" in lowered or "renal" in lowered: disease_query = "Chronic Kidney Disease"
            tool_calls.append(LLMToolCall(name="get_disease_info", args={"query": disease_query}))

        # 11. Explicit Hospital Search (Only when hospital / clinic / doctor explicitly requested)
        elif any(w in lowered for w in ["hospital", "hospitals", "clinic", "clinics", "doctor", "doctors", "specialist", "where can i go", "admit", "admission", "icu", "find healthcare"]):
            tool_calls.append(LLMToolCall(name="search_hospitals", args={"city": city, "specialty": "Cardiology" if "cardio" in lowered or "heart" in lowered else None}))

        # 12. General Conversational Guidance
        else:
            fallback_text = (
                f"I understand your inquiry: *\"{message}\"*.\n\n"
                "As your healthcare care and cost navigator, I can provide concrete data on:\n"
                "- **Hospital Search**: Locate accredited NABH/NABL multi-specialty and government hospitals.\n"
                "- **Procedure Pricing**: Benchmark indicative costs across room categories.\n"
                "- **Insurance Coverage**: Assess policy conditions, waiting moratoriums, and network cashless empanelment.\n"
                "- **Public Schemes**: Check qualification for Ayushman Bharat (PM-JAY) and state health cards.\n\n"
                "Please mention a specific condition (e.g. *Cardiology*, *Diabetes*), procedure (*Angioplasty*, *Cataract*), or city to receive detailed benchmarks."
            )
            return LLMResponse(
                content=fallback_text,
                tool_calls=[],
                provider="offline-rule-agent",
                model_id=self.model_id,
                is_live_llm=False,
                status="offline_mode"
            )

        return LLMResponse(
            content="",
            tool_calls=tool_calls,
            provider="offline-rule-agent",
            model_id=self.model_id,
            is_live_llm=False,
            status="offline_mode"
        )

    def synthesize_with_tools(
        self,
        message: str,
        tool_results: list[dict[str, Any]],
        history: list[dict[str, Any]],
        system_instruction: str = SYSTEM_PROMPT
    ) -> LLMResponse:
        sections = []
        for res in tool_results:
            tool_name = res.get("tool")
            data = res.get("result", {})
            if tool_name == "get_disease_info" and data.get("found"):
                procs_text = ", ".join(data.get("related_procedures", [])) or "Standard medical and surgical interventions (Angioplasty, PTCA, Stenting)"
                sections.append(
                    f"### Clinical Understanding: {data.get('disease_name')} (WHO ICD-11: `{data.get('icd11_code')}`)\n"
                    f"- **Specialty**: {data.get('specialty')}\n"
                    f"- **Etiology & Causes**: {data.get('etiology')}\n"
                    f"- **Cardinal Symptoms**: {data.get('cardinal_symptoms')}\n"
                    f"- **Emergency Red Flags**: {', '.join(data.get('emergency_red_flags', []))}\n"
                    f"- **Diagnostic Workup**: {', '.join(data.get('diagnostic_workup', []))}\n"
                    f"- **Associated Clinical Procedures**: {procs_text}\n"
                    f"> **Clinical Safety Disclaimer**: {data.get('disclaimer')}"
                )
            elif tool_name == "retrieve_policy_clauses":
                clauses = data.get("clauses", [])[:3]
                c_text = "\n\n".join([
                    f"- **{c.get('clause_title')}** (Page #{c.get('page_number')}, UIN: `{c.get('uin')}`):\n  > \"{c.get('verbatim_text')}\"\n  *Impact*: {c.get('impact_summary')}"
                    for c in clauses
                ])
                if c_text:
                    sections.append(f"### Verified Policy Clauses & Citations:\n{c_text}")
            elif tool_name == "evaluate_insurance_eligibility":
                sections.append(
                    f"### Insurance Coverage Evaluation: {data.get('policy_name')}\n"
                    f"**Status**: `{data.get('status')}`\n"
                    f"**Summary**: {data.get('summary_verdict')}\n\n"
                    f"**Conditions That Might Affect Your Claim**:\n"
                    f"- **Pre-Existing Disease (PED)**: Standard retail health policies impose a 24 to 36 months waiting moratorium.\n"
                    f"- **Room Rent Restrictions**: Proportionate deductions apply to surgeon and nursing charges if an upgraded room is selected.\n"
                    f"- **Non-Medical Consumables**: Excluded under IRDAI Annexure I (e.g. gloves, sanitizers, administrative fees)."
                )
            elif tool_name == "match_cashless_network":
                hosps = data.get("matched_hospitals", [])[:4]
                h_lines = []
                for h in hosps:
                    badge = "Confirmed Cashless Network" if h.get("cashless_available", True) else "Reimbursement Empanelled"
                    h_lines.append(f"- **{h.get('hospital_name')}** ({h.get('hospital_type')}): **{badge}** – {h.get('address')}")
                if h_lines:
                    sections.append(f"### Network Hospitals in {data.get('city', 'Hyderabad')}:\n" + "\n".join(h_lines))
            elif tool_name == "estimate_treatment_cost":
                est = data.get("cost_estimate", {})
                sections.append(
                    f"### Indicative Treatment Cost Benchmark\n"
                    f"- **Procedure**: {est.get('procedure')} in {est.get('city')}\n"
                    f"- **Estimated Range**: ₹{est.get('indicative_range_min', 0):,.0f} – ₹{est.get('indicative_range_max', 0):,.0f}\n"
                    f"- **Average Package**: ₹{est.get('average_cost', 0):,.0f}"
                )
            elif tool_name in ("get_government_schemes", "find_healthcare_schemes"):
                schemes = data.get("schemes", [])[:3]
                s_lines = [f"- **{s.get('name')}**: Coverage up to ₹{s.get('coverage_limit', 0):,.0f} ({s.get('target_beneficiaries', '')})" for s in schemes]
                if s_lines:
                    sections.append(f"### Government Healthcare Schemes:\n" + "\n".join(s_lines))
            elif tool_name == "check_eligibility":
                matches = data.get("matches", [])
                m_lines = [f"- **{m.get('scheme_name')}**: {'Eligible' if m.get('is_eligible') else 'Not Eligible'} – {' '.join(m.get('reasons', []))}" for m in matches]
                if m_lines:
                    sections.append(f"### Scheme Eligibility Assessment:\n" + "\n".join(m_lines))
            elif tool_name == "compare_hospitals":
                hosps = data.get("hospitals", [])
                c_lines = [f"- **{h.get('name')}** ({h.get('hospital_type')}): Indicative ₹{h.get('indicative_cost', 0):,.0f}" for h in hosps]
                if c_lines:
                    sections.append(f"### Hospital Comparison:\n" + "\n".join(c_lines))
            elif tool_name == "generate_healthcare_plan":
                plan = data.get("healthcare_plan", {})
                sections.append(
                    f"### Personalized Healthcare Plan: {plan.get('procedure')}\n"
                    f"- **Estimated Cost Range**: ₹{plan.get('estimated_cost_min', 0):,.0f} – ₹{plan.get('estimated_cost_max', 0):,.0f}\n"
                    f"- **Financial Guidance**: {plan.get('financial_guidance', '')}"
                )
            elif tool_name == "search_hospitals":
                hosps = data.get("hospitals", [])[:3]
                h_text = "\n".join([f"- **{h.get('name')}** ({h.get('hospital_type', 'Multi-Specialty')}) – {h.get('address', '')}" for h in hosps])
                if h_text:
                    sections.append(f"### Matching Hospitals:\n{h_text}")

        content = "\n\n".join(sections) if sections else "I have processed your query using the verified healthcare databases."

        return LLMResponse(
            content=content,
            tool_calls=[],
            provider="offline-rule-agent",
            model_id=self.model_id,
            is_live_llm=False,
            status="offline_mode"
        )


class LLMService:
    @classmethod
    def get_provider(cls) -> BaseLLMProvider:
        provider_type = settings.LLM_PROVIDER.lower().strip()

        # 1. Google Gemini
        gemini_key = settings.GEMINI_API_KEY.strip()
        if (provider_type == "gemini" or not provider_type) and gemini_key:
            try:
                return GeminiLLMProvider(api_key=gemini_key, model_id=settings.GEMINI_MODEL_ID)
            except Exception as e:
                logger.warning(f"Could not initialize GeminiLLMProvider: {e}")

        # 2. Groq (Fast & free tier)
        groq_key = os.getenv("GROQ_API_KEY", "").strip() or (gemini_key if gemini_key.startswith("gsk_") else "")
        if provider_type == "groq" or (gemini_key and gemini_key.startswith("gsk_")):
            key = groq_key or gemini_key
            if key:
                return OpenAICompatibleLLMProvider(
                    api_key=key,
                    model_id=os.getenv("GROQ_MODEL_ID", "llama-3.3-70b-versatile"),
                    base_url="https://api.groq.com/openai/v1",
                    provider_name="groq"
                )

        # 3. OpenAI / OpenRouter
        openai_key = settings.OPENAI_API_KEY.strip()
        if provider_type == "openai" or (openai_key and openai_key.startswith("sk-")):
            if openai_key:
                return OpenAICompatibleLLMProvider(
                    api_key=openai_key,
                    model_id=settings.OPENAI_MODEL_ID,
                    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                    provider_name="openai"
                )

        # 4. Ollama (Local)
        if provider_type == "ollama":
            return OpenAICompatibleLLMProvider(
                api_key="ollama",
                model_id=os.getenv("OLLAMA_MODEL_ID", "llama3"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                provider_name="ollama"
            )

        # 5. Offline Clinical Rule Engine
        return OfflineRuleLLMProvider()

    @classmethod
    def get_status(cls) -> dict[str, Any]:
        provider = cls.get_provider()
        is_live = getattr(provider, "is_live_llm", False)

        if isinstance(provider, GeminiLLMProvider):
            active_p = "google-gemini"
            model_id = provider.model_id
            masked = (provider.api_key[:4] + "..." + provider.api_key[-4:]) if len(provider.api_key) > 8 else "configured"
        elif isinstance(provider, OpenAICompatibleLLMProvider):
            active_p = provider.provider_name
            model_id = provider.model_id
            masked = (provider.api_key[:4] + "..." + provider.api_key[-4:]) if len(provider.api_key) > 8 else "configured"
        else:
            active_p = "offline-rule-agent"
            model_id = "rule-based-fallback"
            masked = "missing"

        return {
            "configured_provider": settings.LLM_PROVIDER,
            "active_provider": active_p,
            "model_id": model_id,
            "has_api_key": is_live,
            "masked_key": masked,
            "is_live_llm": is_live,
            "status": "online" if is_live else "offline_fallback_ready",
            "supported_providers": ["gemini", "groq", "openai", "ollama"]
        }

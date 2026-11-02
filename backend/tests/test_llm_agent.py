import pytest
from unittest.mock import MagicMock, patch
from app.config import settings
from app.services.llm_service import (
    LLMService, GeminiLLMProvider, OfflineRuleLLMProvider, LLMResponse, LLMToolCall
)
from app.services.rag_service import DualKnowledgeRAGService
from app.agent.memory import SessionMemoryStore
from app.agent.tools import TOOL_DISPATCHER, AVAILABLE_TOOLS_SCHEMA
from app.agent.orchestrator import AgentOrchestrator

# =============================================================================
# 1. LLM SERVICE CONFIGURATION & PROVIDER SELECTION TESTS
# =============================================================================

def test_llm_service_offline_fallback():
    """Verify that when no API key is set, LLMService falls back to OfflineRuleLLMProvider without false claims."""
    with patch.object(settings, "GEMINI_API_KEY", ""):
        provider = LLMService.get_provider()
        assert isinstance(provider, OfflineRuleLLMProvider)
        assert provider.model_id == "rule-based-fallback"
        
        status = LLMService.get_status()
        assert status["active_provider"] == "offline-rule-agent"
        assert status["is_live_llm"] is False
        assert status["has_api_key"] is False

def test_gemini_provider_initialization():
    """Verify that when GEMINI_API_KEY is configured, GeminiLLMProvider is selected."""
    with patch.object(settings, "GEMINI_API_KEY", "test-dummy-gemini-key"):
        provider = LLMService.get_provider()
        assert isinstance(provider, GeminiLLMProvider)
        assert provider.api_key == "test-dummy-gemini-key"
        assert provider.model_id == settings.GEMINI_MODEL_ID

        status = LLMService.get_status()
        assert status["active_provider"] == "google-gemini"
        assert status["is_live_llm"] is True
        assert status["has_api_key"] is True

def test_gemini_provider_tool_schemas():
    """Verify Gemini function declaration tools are properly constructed from schemas."""
    provider = GeminiLLMProvider(api_key="test-key", model_id="gemini-2.5-flash")
    tools = provider._build_tools_config()
    assert len(tools) == 1
    decls = tools[0].function_declarations
    assert len(decls) == len(AVAILABLE_TOOLS_SCHEMA)
    tool_names = [d.name for d in decls]
    assert "search_hospitals" in tool_names
    assert "get_disease_info" in tool_names
    assert "estimate_treatment_cost" in tool_names
    assert "retrieve_policy_clauses" in tool_names
    assert "evaluate_insurance_eligibility" in tool_names
    assert "match_cashless_network" in tool_names

# =============================================================================
# 2. DUAL-KNOWLEDGE-BASE RAG RETRIEVAL TESTS
# =============================================================================

def test_medical_knowledge_rag():
    """Verify medical RAG retrieves WHO ICD-11 codes and PubMed citations."""
    results = DualKnowledgeRAGService.search_medical_knowledge("Coronary Artery Disease", top_k=2)
    assert len(results) > 0
    top = results[0]
    assert top.icd11_code == "BA41"
    assert "Atherosclerosis" in top.etiology
    assert len(top.red_flags) > 0
    assert len(top.trusted_sources) > 0
    # Confirm PubMed PMID citation present
    pubmed_sources = [s for s in top.trusted_sources if "pmid" in s or "PubMed" in s.get("authority", "")]
    assert len(pubmed_sources) > 0

def test_insurance_knowledge_rag_with_page_citations():
    """Verify insurance RAG retrieves verbatim clauses with exact page numbers and UINs."""
    results = DualKnowledgeRAGService.search_insurance_knowledge("pre-existing disease waiting period", top_k=3)
    assert len(results) > 0
    for r in results:
        assert r.page_number > 0  # Verified exact page number
        assert len(r.uin) > 0     # Verified IRDAI UIN
        assert len(r.verbatim_text) > 0
        assert len(r.source_document) > 0

def test_insurance_knowledge_rag_room_rent_filtering():
    """Verify insurance RAG retrieves room rent capping clauses."""
    results = DualKnowledgeRAGService.search_insurance_knowledge("room rent capping", category="room_rent", top_k=2)
    assert len(results) > 0
    assert results[0].clause_category == "room_rent"

# =============================================================================
# 3. BACKEND AI TOOLS EXECUTION TESTS (ALL 10 TOOLS)
# =============================================================================

def test_tool_search_hospitals():
    res = TOOL_DISPATCHER["search_hospitals"]({"city": "Hyderabad", "specialty": "Cardiology"})
    assert res["count"] > 0
    assert len(res["hospitals"]) > 0

def test_tool_get_hospital_details():
    res = TOOL_DISPATCHER["get_hospital_details"]({"hospital_id": "hosp-hyd-01"})
    assert "hospital" in res
    assert res["hospital"]["name"] is not None

def test_tool_get_disease_info():
    res = TOOL_DISPATCHER["get_disease_info"]({"query": "Type 2 Diabetes Mellitus"})
    assert res["found"] is True
    assert res["icd11_code"] == "5A11"
    assert len(res["diagnostic_workup"]) > 0

def test_tool_estimate_treatment_cost():
    res = TOOL_DISPATCHER["estimate_treatment_cost"]({"procedure": "Angioplasty", "city": "Hyderabad"})
    assert "cost_estimate" in res
    assert res["cost_estimate"]["indicative_range_min"] > 0

def test_tool_search_insurance_policies():
    res = TOOL_DISPATCHER["search_insurance_policies"]({"insurer_id": "star-health"})
    assert res["count"] > 0
    assert len(res["policies"]) > 0

def test_tool_retrieve_policy_clauses():
    res = TOOL_DISPATCHER["retrieve_policy_clauses"]({"query": "waiting period", "policy_id": "pol-star-comp"})
    assert res["count"] > 0
    assert res["clauses"][0]["page_number"] > 0
    assert "SHAHLIP" in res["clauses"][0]["uin"]

def test_tool_check_waiting_periods():
    res = TOOL_DISPATCHER["check_waiting_periods"]({
        "policy_id": "pol-star-comp",
        "disease_or_surgery": "Knee Replacement",
        "policy_tenure_months": 12
    })
    assert res["status"] in ["Waiting period may apply", "Covered subject to conditions"]
    assert "rule_explanation" in res

def test_tool_evaluate_insurance_eligibility():
    res = TOOL_DISPATCHER["evaluate_insurance_eligibility"]({
        "policy_id": "pol-hdfc-optima",
        "procedure_name": "Angioplasty",
        "disease_name": "Coronary Artery Disease",
        "is_pre_existing": False,
        "policy_active_months": 24,
        "room_type": "Single Private"
    })
    assert res["status"] in ["Potentially covered", "Covered subject to conditions"]

def test_tool_match_cashless_network():
    res = TOOL_DISPATCHER["match_cashless_network"]({
        "city": "Hyderabad",
        "policy_id": "pol-star-comp",
        "specialty": "Cardiology"
    })
    assert len(res["matched_hospitals"]) > 0
    assert res["insurer_name"] is not None

def test_tool_get_government_schemes():
    res = TOOL_DISPATCHER["get_government_schemes"]({"state": "Telangana"})
    assert res["count"] > 0
    assert any("Aarogyasri" in s["name"] or "PM-JAY" in s["name"] for s in res["schemes"])

# =============================================================================
# 4. CONVERSATION MEMORY & MULTI-TURN HISTORY TESTS
# =============================================================================

def test_session_memory_retention():
    """Verify session conversation history persists turns in order."""
    session_id = "test-mem-session"
    SessionMemoryStore.clear_session(session_id)

    SessionMemoryStore.add_user_message(session_id, "Find cardiology hospitals in Hyderabad.")
    SessionMemoryStore.add_model_message(session_id, "Found 3 cardiology hospitals: Apollo, NIMS, and Care.")
    SessionMemoryStore.add_user_message(session_id, "Which of these support PM-JAY?")
    SessionMemoryStore.add_model_message(session_id, "Apollo and NIMS are empanelled under PM-JAY.")
    SessionMemoryStore.add_user_message(session_id, "Compare their angioplasty costs.")

    history = SessionMemoryStore.get_history_as_dicts(session_id)
    assert len(history) == 5
    assert history[0]["role"] == "user"
    assert "Hyderabad" in history[0]["content"]
    assert history[2]["role"] == "user"
    assert "PM-JAY" in history[2]["content"]
    assert history[4]["role"] == "user"
    assert "angioplasty" in history[4]["content"]

    SessionMemoryStore.clear_session(session_id)

# =============================================================================
# 5. ORCHESTRATOR & ERROR RESILIENCE TESTS
# =============================================================================

def test_orchestrator_emergency_guardrail():
    """Verify life-threatening emergencies bypass LLM inference with immediate 108/112 alert."""
    resp = AgentOrchestrator.process_message("Patient is having severe crushing chest pain and cannot breathe!")
    assert resp.emergency_detected is True
    assert "108" in resp.answer
    assert resp.llm_provider == "emergency-safety-triage"

def test_orchestrator_simulated_booking_guardrail():
    """Verify appointment requests prompt for confirmation without fabricating live bookings."""
    resp = AgentOrchestrator.process_message("I want to book an appointment with a cardiologist tomorrow.")
    assert resp.requires_confirmation is True
    assert "simulated appointment request" in resp.answer

def test_orchestrator_end_to_end_offline_execution():
    """Verify end-to-end processing with tools when running without an external API key."""
    with patch.object(settings, "GEMINI_API_KEY", ""):
        resp = AgentOrchestrator.process_message("What is the cost of angioplasty in Hyderabad?")
        assert resp.cost_estimate is not None
        assert resp.cost_estimate.indicative_range_min > 0
        assert resp.llm_provider == "offline-rule-agent"
        assert resp.is_live_llm is False

def test_orchestrator_mocked_gemini_tool_call():
    """Verify that when Gemini returns a function call, the tool is executed and results synthesized."""
    mock_client = MagicMock()
    mock_call = MagicMock()
    mock_call.name = "get_disease_info"
    mock_call.args = {"query": "Coronary Artery Disease"}

    mock_resp1 = MagicMock()
    mock_resp1.function_calls = [mock_call]
    mock_resp1.text = ""

    mock_resp2 = MagicMock()
    mock_resp2.function_calls = []
    mock_resp2.text = "Coronary Artery Disease (ICD-11: BA41) is caused by atherosclerotic plaque buildup."

    mock_client.models.generate_content.side_effect = [mock_resp1, mock_resp2]

    provider = GeminiLLMProvider(api_key="mock-key", model_id="gemini-2.5-flash")
    provider.client = mock_client

    with patch.object(LLMService, "get_provider", return_value=provider):
        resp = AgentOrchestrator.process_message("Tell me about coronary artery disease", session_id="test-gemini-turn")
        assert resp.medical_explanation is not None
        assert resp.medical_explanation["icd11_code"] == "BA41"
        assert resp.llm_provider == "google-gemini"
        assert resp.is_live_llm is True
        assert "BA41" in resp.answer

def test_conversational_greeting_does_not_dump_hospitals():
    """Verify that casual greetings return natural introductory dialogue without dumping hospital cards."""
    resp = AgentOrchestrator.process_message("Hello there, how are you?")
    assert len(resp.hospitals) == 0
    assert "CareNav AI" in resp.answer
    assert "Find Accredited Hospitals" in resp.answer or "Estimate Treatment Costs" in resp.answer

def test_openai_compatible_provider_function_call():
    """Verify OpenAICompatibleLLMProvider tool call parsing."""
    from app.services.llm_service import OpenAICompatibleLLMProvider
    provider = OpenAICompatibleLLMProvider(api_key="mock-groq-key", provider_name="groq")
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {
        "choices": [{
            "message": {
                "content": None,
                "tool_calls": [{
                    "function": {
                        "name": "estimate_treatment_cost",
                        "arguments": '{"procedure": "Angioplasty", "city": "Hyderabad"}'
                    }
                }]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=mock_post_resp):
        res = provider.chat(message="Estimate cost of angioplasty in Hyderabad", history=[])
        assert len(res.tool_calls) == 1
        assert res.tool_calls[0].name == "estimate_treatment_cost"
        assert res.tool_calls[0].args["procedure"] == "Angioplasty"
        assert res.provider == "groq"
        assert res.is_live_llm is True



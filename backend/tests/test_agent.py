from app.agent.orchestrator import AgentOrchestrator

def test_emergency_keywords():
    assert AgentOrchestrator.check_emergency("I have sudden chest pain") is True
    assert AgentOrchestrator.check_emergency("Patient is having a stroke") is True
    assert AgentOrchestrator.check_emergency("Looking for a general checkup") is False

def test_cost_query_orchestration():
    response = AgentOrchestrator.process_message("What is the cost of angioplasty in Hyderabad?")
    assert response.cost_estimate is not None
    assert response.cost_estimate.procedure == "Angioplasty (PTCA with Stenting)"
    assert response.cost_estimate.indicative_range_min > 0
    assert any(tc.tool == "estimate_treatment_cost" for tc in response.tool_calls)

def test_scheme_query_orchestration():
    response = AgentOrchestrator.process_message("Which government schemes cover heart surgery?")
    assert len(response.schemes) > 0
    assert any(tc.tool == "find_healthcare_schemes" for tc in response.tool_calls)

def test_appointment_booking_confirmation_intent():
    response = AgentOrchestrator.process_message("I want to book appointment at Care hospital")
    assert response.requires_confirmation is True
    assert response.confirmation_prompt is not None


def test_plan_query_orchestration():
    response = AgentOrchestrator.process_message("Generate a healthcare plan for angioplasty in Hyderabad with 200000 budget")
    assert response.healthcare_plan is not None
    assert any(tc.tool == "generate_healthcare_plan" for tc in response.tool_calls)
    assert "Angioplasty" in response.healthcare_plan["treatment"]

def test_comparison_query_orchestration():
    response = AgentOrchestrator.process_message("Compare Apollo and NIMS for angioplasty")
    assert response.comparison_result is not None
    assert any(tc.tool == "compare_hospitals" for tc in response.tool_calls)
    assert response.comparison_result["comparison_count"] >= 2

def test_eligibility_query_orchestration():
    response = AgentOrchestrator.process_message("Am I eligible for Aarogyasri with white ration card at age 55?")
    assert response.eligibility_result is not None
    assert any(tc.tool == "check_eligibility" for tc in response.tool_calls)
    assert response.eligibility_result["total_eligible"] >= 1

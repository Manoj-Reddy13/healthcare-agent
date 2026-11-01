import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "healthcare-agent-backend"

def test_get_hospitals():
    response = client.get("/api/hospitals?city=Hyderabad")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert any("Apollo" in h["name"] for h in data["hospitals"])

def test_get_hospitals_filter_specialty():
    response = client.get("/api/hospitals?city=Hyderabad&specialty=Cardiology")
    assert response.status_code == 200
    data = response.json()
    for hosp in data["hospitals"]:
        assert any("cardiology" in s.lower() for s in hosp["specialties"])

def test_post_cost_estimate():
    payload = {
        "procedure": "Angioplasty",
        "city": "Hyderabad",
        "room_type": "Semi-Private"
    }
    response = client.post("/api/cost-estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["procedure"] == "Angioplasty (PTCA with Stenting)"
    assert data["indicative_range_min"] > 0
    assert data["indicative_range_max"] >= data["indicative_range_min"]
    assert len(data["covered_under_schemes"]) > 0

def test_get_schemes():
    response = client.get("/api/schemes")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 4
    codes = [s["short_code"] for s in data["schemes"]]
    assert "PM-JAY" in codes
    assert "AAROGYASRI" in codes

def test_appointment_confirm_requires_consent():
    payload = {
        "hospital_id": "hosp-hyd-01",
        "patient_name": "Test Patient",
        "patient_phone": "+91 9876543210",
        "specialty": "Cardiology",
        "preferred_date": "2026-11-10",
        "user_confirmed": False
    }
    response = client.post("/api/appointments/confirm", json=payload)
    assert response.status_code == 400
    assert "explicit user confirmation" in response.json()["detail"].lower()

def test_appointment_confirm_success():
    payload = {
        "hospital_id": "hosp-hyd-01",
        "patient_name": "Test Patient",
        "patient_phone": "+91 9876543210",
        "specialty": "Cardiology",
        "preferred_date": "2026-11-10",
        "user_confirmed": True
    }
    response = client.post("/api/appointments/confirm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "simulated_confirmed"
    assert data["is_simulated"] is True
    assert "SIM-APT-" in data["confirmation_id"]

def test_chat_endpoint_hospital_discovery():
    payload = {
        "message": "Find affordable cardiology hospitals in Hyderabad",
        "session_id": "test-session"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["hospitals"]) > 0
    assert any("cardiology" in s.lower() for s in data["hospitals"][0]["specialties"])
    assert data["data_mode"] == "mock"

def test_chat_endpoint_emergency_intercept():
    payload = {
        "message": "Patient having severe chest pain and cannot breathe",
        "session_id": "test-session"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["emergency_detected"] is True
    assert "108" in data["answer"]
    assert len(data["hospitals"]) == 0


def test_get_hospital_by_id():
    response = client.get("/api/hospitals/hosp-hyd-01")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "hosp-hyd-01"
    assert "Apollo" in data["name"]
    assert data["pincode"] == "500033"

def test_compare_hospitals_endpoint():
    response = client.get("/api/hospitals/compare?hospital_ids=hosp-hyd-01&hospital_ids=hosp-hyd-02&procedure=Angioplasty")
    assert response.status_code == 200
    data = response.json()
    assert data["comparison_count"] == 2
    assert len(data["hospitals"]) == 2
    assert any("Apollo" in h["name"] for h in data["hospitals"])
    assert any("NIMS" in h["name"] for h in data["hospitals"])

def test_get_sources_registry():
    response = client.get("/api/sources")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 4
    publishers = [s["publisher"] for s in data["sources"]]
    assert any("CGHS" in p or "Health and Family Welfare" in p for p in publishers)

def test_check_scheme_eligibility():
    payload = {
        "age": 72,
        "state": "Telangana",
        "has_ration_card": True,
        "annual_income": 150000.0,
        "is_senior": True
    }
    response = client.post("/api/schemes/check-eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_eligible"] >= 2
    codes = [m["short_code"] for m in data["matches"] if m["is_eligible"]]
    assert "PM-JAY" in codes
    assert "AAROGYASRI" in codes

def test_generate_healthcare_plan():
    payload = {
        "treatment": "Angioplasty",
        "city": "Hyderabad",
        "budget": 200000.0,
        "room_type": "Semi-Private",
        "has_ration_card": True
    }
    response = client.post("/api/plans/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "plan-" in data["plan_id"]
    assert data["estimated_cost_min"] > 0
    assert len(data["recommended_hospitals"]) > 0
    assert len(data["preparation_steps"]) == 4
    assert len(data["data_sources"]) > 0

def test_insurers_and_policies_endpoints():
    res = client.get("/api/insurers")
    assert res.status_code == 200
    insurers = res.json()
    assert len(insurers) >= 8
    assert any(i["short_name"] == "Star Health" for i in insurers)

    p_res = client.get("/api/policies")
    assert p_res.status_code == 200
    policies = p_res.json()
    assert len(policies) >= 6
    assert any(p["policy_id"] == "pol-star-comp" for p in policies)

    comp_res = client.post("/api/policies/compare", json={"policy_ids": ["pol-star-comp", "pol-hdfc-optima"]})
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["policies"]) == 2
    assert len(comp_data["comparison_features"]) >= 10

def test_diseases_and_network_and_calculator_endpoints():
    d_res = client.get("/api/diseases")
    assert d_res.status_code == 200
    diseases = d_res.json()
    assert len(diseases) >= 8

    net_res = client.post("/api/network/match", json={"hospital_id": "hosp-hyd-01", "insurer_id": "ins-star"})
    assert net_res.status_code == 200
    net_data = net_res.json()
    assert net_data["total_matches"] >= 1
    assert net_data["matches"][0]["cashless_available"] is True

    calc_res = client.post("/api/calculator/out-of-pocket", json={
        "procedure_id": "proc-angio",
        "room_type": "Single Private",
        "policy_id": "pol-star-comp"
    })
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert calc_data["gross_hospital_bill"] > 0
    assert calc_data["final_out_of_pocket"] > 0
    assert len(calc_data["deduction_steps"]) >= 3

def test_imported_hospital_apis():
    # 1. Statistics
    stat_res = client.get("/api/hospitals/statistics")
    assert stat_res.status_code == 200
    stat_data = stat_res.json()
    assert stat_data["total_hospitals"] >= 30000
    assert stat_data["states_count"] >= 30

    # 2. Filters
    filt_res = client.get("/api/hospitals/filters?state=Telangana")
    assert filt_res.status_code == 200
    filt_data = filt_res.json()
    assert len(filt_data["districts"]) > 0
    assert len(filt_data["states"]) > 0

    # 3. Search
    search_res = client.get("/api/hospitals/search?query=Apollo&district=Hyderabad")
    assert search_res.status_code == 200
    assert len(search_res.json()) > 0

    # 4. Paginated listing
    page_res = client.get("/api/hospitals?page=1&page_size=10&state=Telangana")
    assert page_res.status_code == 200
    page_data = page_res.json()
    assert page_data["total"] >= 1000
    assert len(page_data["hospitals"]) == 10

    # 5. Single imported hospital detail
    detail_res = client.get("/api/hospitals/nhp-564")
    assert detail_res.status_code == 200
    h_detail = detail_res.json()
    assert "Apollo" in h_detail["name"]
    assert h_detail["pincode"] == "500033"



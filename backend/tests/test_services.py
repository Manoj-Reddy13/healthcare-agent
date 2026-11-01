from app.services.hospital_service import HospitalService
from app.services.cost_service import CostService
from app.services.scheme_service import SchemeService

def test_hospital_service_filtering():
    hyderabad_hospitals = HospitalService.search_hospitals(city="Hyderabad")
    assert len(hyderabad_hospitals) >= 4

    cardio = HospitalService.search_hospitals(specialty="Cardiology")
    assert len(cardio) > 0

    pmjay = HospitalService.search_hospitals(scheme="PM-JAY")
    assert len(pmjay) > 0

def test_cost_service_multipliers():
    gen_ward = CostService.estimate_treatment_cost(procedure="Angioplasty", room_type="General Ward")
    icu = CostService.estimate_treatment_cost(procedure="Angioplasty", room_type="ICU")

    assert gen_ward.room_multiplier < 1.0
    assert icu.room_multiplier > 1.2
    assert icu.average_cost > gen_ward.average_cost

def test_scheme_service_lookup():
    schemes = SchemeService.find_healthcare_schemes(state="Telangana")
    assert len(schemes) >= 2
    titles = [s.short_code for s in schemes]
    assert "AAROGYASRI" in titles or "PM-JAY" in titles

from app.services.source_service import SourceService
from app.services.plan_service import PlanService
from app.models.scheme import SchemeEligibilityRequest
from app.models.plan import HealthcarePlanRequest

def test_hospital_service_pincode_and_compare():
    hospitals = HospitalService.search_hospitals(pincode="500033")
    assert len(hospitals) >= 1
    assert any("Apollo" in h.name for h in hospitals)

    comp = HospitalService.compare_hospitals(hospital_ids=["hosp-hyd-01", "hosp-hyd-02"], procedure="Angioplasty")
    assert comp["comparison_count"] == 2
    assert len(comp["hospitals"]) == 2

def test_cost_service_breakdown():
    est = CostService.estimate_treatment_cost(procedure="Angioplasty", room_type="Semi-Private", stay_days=4)
    assert est.breakdown is not None
    assert "procedure_and_ot_charges" in est.breakdown
    assert "room_charges" in est.breakdown
    assert len(est.hospital_comparison) > 0

def test_scheme_service_check_eligibility():
    req = SchemeEligibilityRequest(
        age=71,
        state="Telangana",
        has_ration_card=True,
        annual_income=120000.0,
        is_senior=True
    )
    res = SchemeService.check_eligibility(req)
    assert res.total_eligible >= 2
    pmjay = next((m for m in res.matches if m.short_code == "PM-JAY"), None)
    assert pmjay is not None
    assert pmjay.is_eligible is True

def test_plan_service_generate_and_fetch():
    req = HealthcarePlanRequest(
        treatment="Angioplasty",
        city="Hyderabad",
        budget=250000.0,
        room_type="Semi-Private",
        has_ration_card=True
    )
    plan = PlanService.generate_plan(req)
    assert plan.plan_id.startswith("plan-")
    assert len(plan.preparation_steps) == 4

    fetched = PlanService.get_plan(plan.plan_id)
    assert fetched is not None
    assert fetched.plan_id == plan.plan_id

def test_source_service_registry():
    sources = SourceService.get_registered_sources()
    assert len(sources) >= 4
    assert any(s["source_id"] == "source-cghs-2025" for s in sources)

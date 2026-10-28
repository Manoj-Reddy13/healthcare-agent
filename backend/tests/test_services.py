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

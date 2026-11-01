from typing import Any, Optional
from app.services.hospital_service import HospitalService
from app.services.cost_service import CostService
from app.services.scheme_service import SchemeService
from app.services.plan_service import PlanService
from app.models.scheme import SchemeEligibilityRequest
from app.models.plan import HealthcarePlanRequest

AVAILABLE_TOOLS_SCHEMA = [
    {
        "name": "search_hospitals",
        "description": "Search and filter hospitals by city, medical specialty, indicative budget, pincode, locality, or accepted scheme.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g., 'Hyderabad', 'Bengaluru'"},
                "specialty": {"type": "string", "description": "Specialty such as 'Cardiology', 'Orthopedics', 'Oncology'"},
                "max_budget": {"type": "number", "description": "Maximum budget ceiling in INR"},
                "scheme": {"type": "string", "description": "Scheme name such as 'Ayushman Bharat', 'Aarogyasri', 'CGHS'"},
                "pincode": {"type": "string", "description": "PIN code e.g. '500033'"},
                "hospital_type": {"type": "string", "description": "'Government', 'Private', 'Trust'"}
            }
        }
    },
    {
        "name": "get_hospital_details",
        "description": "Retrieve comprehensive contact, accreditation, and facility information for a specific hospital.",
        "parameters": {
            "type": "object",
            "properties": {
                "hospital_id": {"type": "string", "description": "Hospital ID, e.g., 'hosp-hyd-01'"}
            },
            "required": ["hospital_id"]
        }
    },
    {
        "name": "estimate_treatment_cost",
        "description": "Calculate indicative cost ranges, room options, and itemized component breakdown for a medical procedure.",
        "parameters": {
            "type": "object",
            "properties": {
                "procedure": {"type": "string", "description": "Procedure name e.g. 'Angioplasty', 'Knee Replacement'"},
                "city": {"type": "string", "description": "City where treatment is planned"},
                "room_type": {
                    "type": "string",
                    "enum": ["General Ward", "Semi-Private", "Private Room", "ICU"],
                    "description": "Hospital room tier"
                },
                "stay_days": {"type": "integer", "description": "Expected stay duration in days"},
                "hospital_id": {"type": "string", "description": "Specific hospital ID if targeted"}
            },
            "required": ["procedure"]
        }
    },
    {
        "name": "find_healthcare_schemes",
        "description": "Discover eligible government healthcare schemes and subsidies based on state, specialty, or income level.",
        "parameters": {
            "type": "object",
            "properties": {
                "income_bracket": {"type": "string", "description": "'bpl', 'low', 'middle'"},
                "state": {"type": "string", "description": "State name e.g. 'Telangana', 'All India'"},
                "specialty": {"type": "string", "description": "Medical specialty"}
            }
        }
    },
    {
        "name": "check_eligibility",
        "description": "Evaluate user eligibility for PM-JAY and State Aarogyasri based on age, state, ration card, and income.",
        "parameters": {
            "type": "object",
            "properties": {
                "age": {"type": "integer", "description": "Beneficiary age"},
                "state": {"type": "string", "description": "State of residence"},
                "has_ration_card": {"type": "boolean", "description": "Whether user holds Food Security / White Ration Card"},
                "annual_income": {"type": "number", "description": "Annual household income in INR"},
                "is_senior": {"type": "boolean", "description": "Whether patient is aged 70 or above"}
            },
            "required": ["age"]
        }
    },
    {
        "name": "compare_hospitals",
        "description": "Compare 2 or more hospitals side-by-side for a specific procedure on costs, accreditation, and schemes.",
        "parameters": {
            "type": "object",
            "properties": {
                "hospital_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of hospital IDs to compare"
                },
                "procedure": {"type": "string", "description": "Target procedure name"}
            },
            "required": ["hospital_ids"]
        }
    },
    {
        "name": "generate_healthcare_plan",
        "description": "Synthesize a personalized end-to-end healthcare plan combining hospitals, costs, schemes, and 4-step preparation roadmap.",
        "parameters": {
            "type": "object",
            "properties": {
                "treatment": {"type": "string", "description": "Procedure or medical specialty"},
                "city": {"type": "string", "description": "City of treatment"},
                "budget": {"type": "number", "description": "Budget ceiling in INR"},
                "room_type": {"type": "string", "description": "Accommodation tier"},
                "hospital_id": {"type": "string", "description": "Specific hospital ID if selected"}
            },
            "required": ["treatment"]
        }
    },
    {
        "name": "retrieve_healthcare_information",
        "description": "Retrieve general navigational guidance on healthcare admission, patient rights, and insurance claims.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Healthcare navigation topic"}
            },
            "required": ["query"]
        }
    }
]

def execute_search_hospitals(arguments: dict[str, Any]) -> dict[str, Any]:
    city = arguments.get("city")
    specialty = arguments.get("specialty")
    max_budget = arguments.get("max_budget")
    scheme = arguments.get("scheme")
    pincode = arguments.get("pincode")
    hospital_type = arguments.get("hospital_type")
    hospitals = HospitalService.search_hospitals(
        city=city,
        specialty=specialty,
        max_budget=max_budget,
        scheme=scheme,
        pincode=pincode,
        hospital_type=hospital_type
    )
    return {
        "count": len(hospitals),
        "hospitals": [h.model_dump() for h in hospitals]
    }

def execute_get_hospital_details(arguments: dict[str, Any]) -> dict[str, Any]:
    hospital_id = arguments.get("hospital_id", "")
    hosp = HospitalService.get_hospital_by_id(hospital_id)
    if not hosp:
        return {"error": f"Hospital '{hospital_id}' not found"}
    return {"hospital": hosp.model_dump()}

def execute_estimate_cost(arguments: dict[str, Any]) -> dict[str, Any]:
    procedure = arguments.get("procedure", "Doctor Consultation")
    city = arguments.get("city", "Hyderabad")
    room_type = arguments.get("room_type", "Semi-Private")
    stay_days = arguments.get("stay_days", 3)
    hospital_id = arguments.get("hospital_id")
    estimate = CostService.estimate_treatment_cost(
        procedure=procedure,
        city=city,
        room_type=room_type,
        stay_days=stay_days,
        hospital_id=hospital_id
    )
    return {
        "cost_estimate": estimate.model_dump()
    }

def execute_find_schemes(arguments: dict[str, Any]) -> dict[str, Any]:
    income = arguments.get("income_bracket")
    state = arguments.get("state")
    specialty = arguments.get("specialty")
    schemes = SchemeService.find_healthcare_schemes(income_bracket=income, state=state, specialty=specialty)
    return {
        "count": len(schemes),
        "schemes": [s.model_dump() for s in schemes]
    }

def execute_check_eligibility(arguments: dict[str, Any]) -> dict[str, Any]:
    age = arguments.get("age", 45)
    state = arguments.get("state", "Telangana")
    has_ration = arguments.get("has_ration_card", False)
    income = arguments.get("annual_income", 180000.0)
    is_senior = arguments.get("is_senior", age >= 70)
    req = SchemeEligibilityRequest(
        age=age,
        state=state,
        has_ration_card=has_ration,
        annual_income=income,
        is_senior=is_senior
    )
    res = SchemeService.check_eligibility(req)
    return res.model_dump()

def execute_compare_hospitals(arguments: dict[str, Any]) -> dict[str, Any]:
    hospital_ids = arguments.get("hospital_ids", [])
    procedure = arguments.get("procedure", "Angioplasty")
    return HospitalService.compare_hospitals(hospital_ids=hospital_ids, procedure=procedure)

def execute_generate_healthcare_plan(arguments: dict[str, Any]) -> dict[str, Any]:
    treatment = arguments.get("treatment", "Angioplasty")
    city = arguments.get("city", "Hyderabad")
    budget = arguments.get("budget", 200000.0)
    room_type = arguments.get("room_type", "Semi-Private")
    hospital_id = arguments.get("hospital_id")
    req = HealthcarePlanRequest(
        treatment=treatment,
        city=city,
        budget=budget,
        room_type=room_type,
        hospital_id=hospital_id
    )
    plan = PlanService.generate_plan(req)
    return {"healthcare_plan": plan.model_dump()}

def execute_retrieve_information(arguments: dict[str, Any]) -> dict[str, Any]:
    query = arguments.get("query", "").lower()
    info = (
        "Under the Clinical Establishments Act and patient charter, all emergency medical conditions "
        "must be stabilized by hospitals prior to paperwork or financial deposits. "
        "For cashless scheme admissions (PM-JAY / Aarogyasri), ensure your Aadhaar card and Ration card are presented "
        "at the hospital helpdesk within 24 hours of hospital admission."
    )
    return {"guidance": info, "query": query}

TOOL_DISPATCHER = {
    "search_hospitals": execute_search_hospitals,
    "get_hospital_details": execute_get_hospital_details,
    "estimate_treatment_cost": execute_estimate_cost,
    "find_healthcare_schemes": execute_find_schemes,
    "check_eligibility": execute_check_eligibility,
    "compare_hospitals": execute_compare_hospitals,
    "generate_healthcare_plan": execute_generate_healthcare_plan,
    "retrieve_healthcare_information": execute_retrieve_information
}

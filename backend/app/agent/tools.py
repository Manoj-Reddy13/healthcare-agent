from typing import Any, Optional
from app.services.hospital_service import HospitalService
from app.services.cost_service import CostService
from app.services.scheme_service import SchemeService

AVAILABLE_TOOLS_SCHEMA = [
    {
        "name": "search_hospitals",
        "description": "Search and filter hospitals by city, medical specialty, indicative budget, or accepted scheme.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g., 'Hyderabad', 'Bengaluru'"},
                "specialty": {"type": "string", "description": "Specialty such as 'Cardiology', 'Orthopedics', 'Oncology'"},
                "max_budget": {"type": "number", "description": "Maximum budget ceiling in INR"},
                "scheme": {"type": "string", "description": "Scheme name such as 'Ayushman Bharat', 'Aarogyasri', 'CGHS'"}
            }
        }
    },
    {
        "name": "estimate_treatment_cost",
        "description": "Calculate indicative cost ranges for a medical procedure or hospital stay.",
        "parameters": {
            "type": "object",
            "properties": {
                "procedure": {"type": "string", "description": "Procedure name e.g. 'Angioplasty', 'Knee Replacement'"},
                "city": {"type": "string", "description": "City where treatment is planned"},
                "room_type": {
                    "type": "string",
                    "enum": ["General Ward", "Semi-Private", "Private Room", "ICU"],
                    "description": "Hospital room tier"
                }
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
    hospitals = HospitalService.search_hospitals(city=city, specialty=specialty, max_budget=max_budget, scheme=scheme)
    return {
        "count": len(hospitals),
        "hospitals": [h.model_dump() for h in hospitals]
    }

def execute_estimate_cost(arguments: dict[str, Any]) -> dict[str, Any]:
    procedure = arguments.get("procedure", "Doctor Consultation")
    city = arguments.get("city", "Hyderabad")
    room_type = arguments.get("room_type", "Semi-Private")
    estimate = CostService.estimate_treatment_cost(procedure=procedure, city=city, room_type=room_type)
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
    "estimate_treatment_cost": execute_estimate_cost,
    "find_healthcare_schemes": execute_find_schemes,
    "retrieve_healthcare_information": execute_retrieve_information
}

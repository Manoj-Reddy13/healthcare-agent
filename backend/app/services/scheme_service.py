from typing import Any, Optional
from app.data.mock_schemes import MOCK_SCHEMES
from app.models.scheme import (
    HealthcareScheme,
    SchemeEligibilityRequest,
    SchemeEligibilityResponse,
    SchemeEligibilityMatch
)

class SchemeService:
    @staticmethod
    def find_healthcare_schemes(
        income_bracket: Optional[str] = None,
        state: Optional[str] = None,
        specialty: Optional[str] = None,
        category: Optional[str] = None
    ) -> list[HealthcareScheme]:
        results = MOCK_SCHEMES.copy()

        if category:
            cat = category.strip().lower()
            results = [s for s in results if cat in s.category.lower()]

        if specialty:
            spec = specialty.strip().lower()
            results = [
                s for s in results
                if any(spec in sp.lower() for sp in s.covered_specialties)
            ]

        if state:
            st = state.strip().lower()
            filtered = []
            for s in results:
                s_name = (s.name + " " + s.eligibility_summary).lower()
                if "all india" in st or "national" in st:
                    if s.category == "Government" or "pm-jay" in s.short_code.lower():
                        filtered.append(s)
                elif st in s_name or s.category == "Government" or "telangana" in st and "aarogyasri" in s.short_code.lower():
                    filtered.append(s)
                elif "cghs" in s.short_code.lower() or "esic" in s.short_code.lower():
                    filtered.append(s)
            results = filtered

        if income_bracket:
            inc = income_bracket.strip().lower()
            if inc in ["bpl", "low", "economically_weaker"]:
                results = sorted(
                    results,
                    key=lambda s: 0 if s.income_ceiling_inr is not None or "pm-jay" in s.short_code.lower() else 1
                )

        return results

    @staticmethod
    def get_scheme_by_id(scheme_id: str) -> Optional[HealthcareScheme]:
        for s in MOCK_SCHEMES:
            if s.id == scheme_id or s.short_code.lower() == scheme_id.lower():
                return s
        return None

    @staticmethod
    def check_eligibility(req: SchemeEligibilityRequest) -> SchemeEligibilityResponse:
        matches: list[SchemeEligibilityMatch] = []
        is_senior = req.age >= 70 or req.is_senior
        is_telangana = "telangana" in req.state.lower() or "ts" in req.state.lower() or "hyderabad" in req.state.lower()
        is_low_income = (req.annual_income or 999999) <= 250000

        # 1. PM-JAY Rule Evaluation
        pmjay_eligible = False
        pmjay_status = "Not Eligible"
        pmjay_reasons = []

        if is_senior:
            pmjay_eligible = True
            pmjay_status = "Likely Eligible"
            pmjay_reasons.append("Universal senior citizen coverage: All individuals aged 70+ qualify under expanded NHA rules regardless of income.")
        elif req.has_ration_card:
            pmjay_eligible = True
            pmjay_status = "Likely Eligible"
            pmjay_reasons.append("Active Ration card / NFSA registration maps to SECC beneficiary database.")
        elif is_low_income:
            pmjay_eligible = True
            pmjay_status = "Conditionally Eligible"
            pmjay_reasons.append("Reported household income is within BPL / economically vulnerable threshold.")
        else:
            pmjay_reasons.append("Income exceeds BPL ceiling and patient is below age 70 without registered SECC/ration card record.")

        matches.append(SchemeEligibilityMatch(
            scheme_id="scheme-pmjay",
            scheme_name="Ayushman Bharat - PM-JAY",
            short_code="PM-JAY",
            is_eligible=pmjay_eligible,
            eligibility_status=pmjay_status,
            coverage_limit=500000.0,
            reasons=pmjay_reasons,
            required_documents=[
                "Aadhaar Card (with active biometric/OTP link)",
                "Ration Card or State Food Security ID",
                "PM-JAY Letter / Ayushman PVC Card"
            ],
            application_process="Visit nearest CSC centre or hospital Ayushman Mitra helpdesk to verify biometric Aadhaar e-KYC.",
            official_portal="https://beneficiary.nha.gov.in"
        ))

        # 2. Aarogyasri Rule Evaluation
        aarogya_eligible = False
        aarogya_status = "Not Eligible"
        aarogya_reasons = []

        if is_telangana and req.has_ration_card:
            aarogya_eligible = True
            aarogya_status = "Likely Eligible"
            aarogya_reasons.append("Resident of Telangana holding a White Ration Card / Food Security Card.")
            aarogya_reasons.append("Eligible for enhanced tertiary coverage ceiling of up to ₹10 Lakh per family per year.")
        elif is_telangana and is_low_income:
            aarogya_eligible = True
            aarogya_status = "Conditionally Eligible"
            aarogya_reasons.append("Telangana resident with household income under ₹5 Lakh ceiling; requires White Card endorsement from Meeseva.")
        elif not is_telangana:
            aarogya_reasons.append("State healthcare scheme is restricted to residents of Telangana and Andhra Pradesh holding valid state Food Security Cards.")
        else:
            aarogya_reasons.append("Food Security / White Ration Card not indicated; state scheme requires verified card status.")

        matches.append(SchemeEligibilityMatch(
            scheme_id="scheme-aarogyasri",
            scheme_name="Telangana Aarogyasri Community Healthcare",
            short_code="AAROGYASRI",
            is_eligible=aarogya_eligible,
            eligibility_status=aarogya_status,
            coverage_limit=1000000.0,
            reasons=aarogya_reasons,
            required_documents=[
                "Telangana Food Security (White) Ration Card",
                "Aadhaar Card of all family members",
                "OP Slip / Referral from Government Medical Officer"
            ],
            application_process="Walk into the 24x7 Aarogya Mithra desk at any network hospital with your White Ration Card and Aadhaar card.",
            official_portal="https://aarogyasri.telangana.gov.in"
        ))

        total_eligible = sum(1 for m in matches if m.is_eligible)
        guidance = (
            f"Based on your profile ({req.age} yrs, {req.state}), you are potentially eligible for "
            f"{total_eligible} public healthcare programme(s). Ensure you carry your Aadhaar card and Ration card "
            f"during hospital admission for instant verification by the helpdesk."
        )

        return SchemeEligibilityResponse(
            user_state=req.state,
            matches=matches,
            total_eligible=total_eligible,
            guidance=guidance,
            disclaimer=(
                "Preliminary eligibility assessment based on user-supplied criteria and published government guidelines. "
                "Final eligibility is subject to verification on official government databases (NHA BIS / Meeseva portal) "
                "by authorized hospital helpdesk officers."
            )
        )

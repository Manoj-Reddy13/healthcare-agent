from typing import Optional
from app.data.mock_schemes import MOCK_SCHEMES
from app.models.scheme import HealthcareScheme

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
            # If state is specified, match state-specific or national schemes
            filtered = []
            for s in results:
                s_name = (s.name + " " + s.eligibility_summary).lower()
                if "all india" in st or "national" in st:
                    if s.category == "Government" or "pm-jay" in s.short_code.lower():
                        filtered.append(s)
                elif st in s_name or s.category == "Government":
                    filtered.append(s)
            results = filtered

        if income_bracket:
            inc = income_bracket.strip().lower()
            if inc in ["bpl", "low", "economically_weaker"]:
                # Prioritize schemes that explicitly support BPL / low income
                results = sorted(
                    results,
                    key=lambda s: 0 if s.income_ceiling_inr is not None or "pm-jay" in s.short_code.lower() else 1
                )

        return results

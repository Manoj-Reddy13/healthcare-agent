from typing import Optional
from app.data.mock_hospitals import MOCK_HOSPITALS
from app.models.hospital import Hospital

class HospitalService:
    @staticmethod
    def search_hospitals(
        city: Optional[str] = None,
        specialty: Optional[str] = None,
        max_budget: Optional[float] = None,
        scheme: Optional[str] = None
    ) -> list[Hospital]:
        results = MOCK_HOSPITALS.copy()

        if city:
            c = city.strip().lower()
            results = [h for h in results if c in h.city.lower()]

        if specialty:
            s = specialty.strip().lower()
            results = [
                h for h in results
                if any(s in spec.lower() for spec in h.specialties)
            ]

        if scheme:
            sch = scheme.strip().lower()
            results = [
                h for h in results
                if any(sch in s.lower() for s in h.accepted_schemes)
            ]

        if max_budget is not None and max_budget > 0:
            # Check if any procedure or consultation fits within the budget
            filtered = []
            for h in results:
                costs = list(h.indicative_costs.values())
                if any(c <= max_budget for c in costs):
                    filtered.append(h)
            results = filtered

        return results

    @staticmethod
    def get_hospital_by_id(hospital_id: str) -> Optional[Hospital]:
        for h in MOCK_HOSPITALS:
            if h.id == hospital_id:
                return h
        return None

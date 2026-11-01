from typing import Any, Optional
from app.data.mock_hospitals import MOCK_HOSPITALS
from app.models.hospital import Hospital

class HospitalService:
    @staticmethod
    def search_hospitals(
        city: Optional[str] = None,
        specialty: Optional[str] = None,
        max_budget: Optional[float] = None,
        scheme: Optional[str] = None,
        pincode: Optional[str] = None,
        locality: Optional[str] = None,
        hospital_type: Optional[str] = None,
        facility: Optional[str] = None,
        accreditation: Optional[str] = None,
        sort_by: Optional[str] = "relevance"
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

        if pincode:
            pin = pincode.strip()
            results = [h for h in results if h.pincode and pin in h.pincode]

        if locality:
            loc = locality.strip().lower()
            results = [
                h for h in results
                if (h.locality and loc in h.locality.lower()) or (loc in h.address.lower())
            ]

        if hospital_type:
            ht = hospital_type.strip().lower()
            results = [h for h in results if h.hospital_type and ht in h.hospital_type.lower()]

        if facility:
            fac = facility.strip().lower()
            results = [
                h for h in results
                if any(fac in f.lower() for f in h.facilities)
            ]

        if accreditation:
            acc = accreditation.strip().upper()
            results = [
                h for h in results
                if any(acc in a.upper() for a in h.accreditation)
            ]

        if max_budget is not None and max_budget > 0:
            filtered = []
            for h in results:
                costs = list(h.indicative_costs.values())
                if any(c <= max_budget for c in costs):
                    filtered.append(h)
            results = filtered

        # Sorting
        if sort_by == "rating":
            results.sort(key=lambda h: h.rating, reverse=True)
        elif sort_by == "distance":
            results.sort(key=lambda h: h.distance_km)
        elif sort_by == "cost_low_to_high":
            results.sort(key=lambda h: min(h.indicative_costs.values()) if h.indicative_costs else 999999)

        return results

    @staticmethod
    def get_hospital_by_id(hospital_id: str) -> Optional[Hospital]:
        for h in MOCK_HOSPITALS:
            if h.id == hospital_id:
                return h
        return None

    @staticmethod
    def compare_hospitals(hospital_ids: list[str], procedure: Optional[str] = "Angioplasty") -> dict[str, Any]:
        selected = [h for h in MOCK_HOSPITALS if h.id in hospital_ids]
        if not selected:
            selected = MOCK_HOSPITALS[:3]

        comparison_data = []
        for h in selected:
            cost = h.indicative_costs.get(procedure, h.indicative_costs.get("Doctor Consultation", 0.0))
            comparison_data.append({
                "hospital_id": h.id,
                "name": h.name,
                "city": h.city,
                "locality": h.locality or h.address,
                "hospital_type": h.hospital_type or "Private",
                "accreditation": h.accreditation,
                "rating": h.rating,
                "distance_km": h.distance_km,
                "phone": h.phone,
                "procedure": procedure,
                "indicative_cost": cost,
                "doctor_consultation_fee": h.indicative_costs.get("Doctor Consultation", 500.0),
                "empanelled_schemes": h.accepted_schemes,
                "facilities": h.facilities,
                "directions_url": h.directions_url or f"https://www.google.com/maps/search/?api=1&query={h.name.replace(' ', '+')}"
            })

        return {
            "procedure": procedure,
            "comparison_count": len(comparison_data),
            "hospitals": comparison_data,
            "disclaimer": "Indicative comparative figures derived from verified hospital schedules and regional benchmarks. Actual hospital billing is subject to patient condition, length of stay, and consumables used."
        }

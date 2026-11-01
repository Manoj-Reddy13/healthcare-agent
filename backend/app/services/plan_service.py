import uuid
from datetime import datetime, timezone
from typing import Optional
from app.models.plan import HealthcarePlanRequest, HealthcarePlan, PlanPreparationStep
from app.services.cost_service import CostService
from app.services.hospital_service import HospitalService
from app.services.scheme_service import SchemeService

# In-memory session plan registry for fast retrieval
_SAVED_PLANS: dict[str, HealthcarePlan] = {}

class PlanService:
    @staticmethod
    def generate_plan(req: HealthcarePlanRequest) -> HealthcarePlan:
        plan_id = f"plan-{uuid.uuid4().hex[:8]}"
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Cost estimation
        cost_est = CostService.estimate_treatment_cost(
            procedure=req.treatment,
            city=req.city,
            room_type=req.room_type,
            stay_days=3,
            hospital_id=req.hospital_id
        )

        # 2. Hospitals matching city and treatment
        hospitals = HospitalService.search_hospitals(
            city=req.city,
            max_budget=req.budget
        )
        if not hospitals:
            hospitals = HospitalService.search_hospitals(city=req.city)

        recommended = []
        for h in hospitals[:3]:
            c = h.indicative_costs.get(cost_est.procedure, h.indicative_costs.get(req.treatment, cost_est.average_cost))
            recommended.append({
                "hospital_id": h.id,
                "name": h.name,
                "locality": h.locality or h.address,
                "hospital_type": h.hospital_type or "Private",
                "accreditation": h.accreditation,
                "rating": h.rating,
                "distance_km": h.distance_km,
                "estimated_cost": c,
                "accepted_schemes": h.accepted_schemes,
                "directions_url": h.directions_url or f"https://www.google.com/maps/search/?api=1&query={h.name.replace(' ', '+')}"
            })

        selected_hospital = None
        if req.hospital_id:
            hosp_obj = HospitalService.get_hospital_by_id(req.hospital_id)
            if hosp_obj:
                selected_hospital = {
                    "hospital_id": hosp_obj.id,
                    "name": hosp_obj.name,
                    "address": hosp_obj.address,
                    "phone": hosp_obj.phone,
                    "accreditation": hosp_obj.accreditation,
                    "rating": hosp_obj.rating
                }

        # 3. Scheme and Insurance coverage evaluation
        schemes = SchemeService.find_healthcare_schemes(state=req.city)
        applicable_schemes = []
        potential_coverage_max = 0.0

        if req.is_senior_citizen:
            potential_coverage_max = max(potential_coverage_max, 500000.0)
            applicable_schemes.append({
                "scheme_name": "Ayushman Bharat (PM-JAY)",
                "coverage_amount": 500000.0,
                "reason": "Universal senior citizen coverage (Age 70+) under expanded NHA guidelines."
            })

        if req.has_ration_card:
            if "hyderabad" in req.city.lower() or "telangana" in req.city.lower():
                potential_coverage_max = max(potential_coverage_max, 1000000.0)
                applicable_schemes.append({
                    "scheme_name": "Telangana Aarogyasri",
                    "coverage_amount": 1000000.0,
                    "reason": "Food Security / White Ration Card holder in Telangana network hospitals."
                })
            else:
                potential_coverage_max = max(potential_coverage_max, 500000.0)
                applicable_schemes.append({
                    "scheme_name": "Ayushman Bharat (PM-JAY)",
                    "coverage_amount": 500000.0,
                    "reason": "Ration card mapped to National Health Protection eligibility."
                })

        if req.has_insurance:
            applicable_schemes.append({
                "scheme_name": "Private Health Insurance Policy",
                "coverage_amount": req.budget or 300000.0,
                "reason": "Cashless pre-authorization through hospital Third-Party Administrator (TPA) desk."
            })

        # 4. Out-of-pocket estimation
        if potential_coverage_max >= cost_est.indicative_range_max:
            # Full scheme coverage: only special non-standard consumables/stents copay
            oop_min = 0.0
            oop_max = min(15000.0, cost_est.indicative_range_min * 0.1)
            fin_guidance = (
                "With confirmed scheme empanelment (PM-JAY / Aarogyasri), your surgery is 100% cashless. "
                "Estimated out-of-pocket expense is limited to ₹0 - ₹15,000 for optional non-standard consumables or premium room upgrades."
            )
        elif req.has_insurance:
            # 10% co-pay or non-payable items
            oop_min = round(cost_est.indicative_range_min * 0.10)
            oop_max = round(cost_est.indicative_range_max * 0.15)
            fin_guidance = (
                "With private health insurance, cashless pre-authorization will cover the primary hospital stay. "
                "Expect a 10-15% co-pay for non-medical expenses (registration, gloves, PPE, companion room charges)."
            )
        else:
            # Self-pay
            oop_min = cost_est.indicative_range_min
            oop_max = cost_est.indicative_range_max
            fin_guidance = (
                f"As a self-pay patient, the estimated expenditure ranges from ₹{oop_min:,.0f} to ₹{oop_max:,.0f}. "
                "We recommend requesting an itemized written estimate from the hospital billing desk prior to admission."
            )

        # 5. Four-step preparation roadmap
        preparation_steps = [
            PlanPreparationStep(
                step=1,
                title="Pre-Authorization & Identity Verification",
                description="Gather patient identity documents and visit the hospital's TPA / Aarogya Mithra helpdesk at least 24 hours prior to elective admission.",
                documents_needed=["Aadhaar Card", "Ration Card or Ayushman Card", "Doctor's Prescription / Referral Slip"]
            ),
            PlanPreparationStep(
                step=2,
                title="Diagnostic & Clinical Clearance",
                description="Complete required pre-operative screening tests (e.g. ECG, 2D Echo, Blood sugar, Renal profile, Coagulation profile).",
                documents_needed=["Recent Lab Reports", "Previous Angiogram / Scan Films", "List of Current Medications"]
            ),
            PlanPreparationStep(
                step=3,
                title="Hospital Admission & Desk Coordination",
                description="Present the pre-authorization approval token at the inpatient admissions counter. Select your eligible room tier (General Ward / Semi-Private).",
                documents_needed=["Admission Order from Surgeon", "Emergency Contact Proof", "Insurance Card or E-Card"]
            ),
            PlanPreparationStep(
                step=4,
                title="Discharge Summary & Claim Settlement",
                description="Verify the itemized discharge bill with the hospital finance desk. Ensure you collect the discharge summary, post-op medication schedule, and next review date.",
                documents_needed=["Signed Claim Form", "Original Pharmacy Receipts", "Discharge Summary & Fit-to-Travel Certificate"]
            )
        ]

        plan = HealthcarePlan(
            plan_id=plan_id,
            created_at=created_at,
            treatment=cost_est.procedure,
            city=req.city,
            budget=req.budget or 200000.0,
            room_type=req.room_type,
            estimated_cost_min=cost_est.indicative_range_min,
            estimated_cost_max=cost_est.indicative_range_max,
            average_cost=cost_est.average_cost,
            itemized_breakdown=cost_est.breakdown or {},
            selected_hospital=selected_hospital,
            recommended_hospitals=recommended,
            applicable_schemes=applicable_schemes,
            potential_coverage_max=potential_coverage_max,
            estimated_out_of_pocket_min=oop_min,
            estimated_out_of_pocket_max=oop_max,
            financial_guidance=fin_guidance,
            preparation_steps=preparation_steps,
            data_sources=[
                "National Health Authority (NHA) Package Master 2024",
                "Telangana Aarogyasri Trust Guideline Orders",
                "CGHS 2025/2026 Tariff Benchmark Schedule",
                "Verified Hospital Schedules (Apollo, NIMS, KIMS, Care)"
            ],
            disclaimer=(
                "This care navigation plan contains indicative benchmarks based on verified regional data. "
                "Actual out-of-pocket costs and admission requirements may vary based on patient clinical complexity, "
                "specific implants used, and final hospital billing policies."
            )
        )

        _SAVED_PLANS[plan_id] = plan
        return plan

    @staticmethod
    def get_plan(plan_id: str) -> Optional[HealthcarePlan]:
        return _SAVED_PLANS.get(plan_id)

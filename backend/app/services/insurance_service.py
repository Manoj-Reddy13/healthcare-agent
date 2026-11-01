import json
from pathlib import Path
from typing import Any, Optional
from app.healthcare_paths import BACKEND_ROOT
from app.models.insurance import (
    Insurer, InsurancePolicy, PolicyComparisonRequest,
    PolicyComparisonResponse, PolicySuitability
)

DATASETS_DIR = BACKEND_ROOT / "app" / "data" / "datasets"

class InsuranceService:
    _insurers: list[dict[str, Any]] = []
    _policies: list[dict[str, Any]] = []

    @classmethod
    def _load_data(cls):
        if not cls._insurers:
            insurers_path = DATASETS_DIR / "insurers_data.json"
            if insurers_path.is_file():
                cls._insurers = json.loads(insurers_path.read_text(encoding="utf-8"))
        if not cls._policies:
            policies_path = DATASETS_DIR / "insurance_policies_data.json"
            if policies_path.is_file():
                cls._policies = json.loads(policies_path.read_text(encoding="utf-8"))

    @classmethod
    def list_insurers(cls) -> list[Insurer]:
        cls._load_data()
        return [Insurer(**item) for item in cls._insurers]

    @classmethod
    def get_insurer_by_id(cls, insurer_id: str) -> Optional[Insurer]:
        cls._load_data()
        for item in cls._insurers:
            if item.get("insurer_id") == insurer_id:
                return Insurer(**item)
        return None

    @classmethod
    def list_policies(
        cls,
        insurer_id: Optional[str] = None,
        policy_type: Optional[str] = None,
        min_sum_insured: Optional[float] = None
    ) -> list[InsurancePolicy]:
        cls._load_data()
        results = []
        for p in cls._policies:
            if insurer_id and p.get("insurer_id") != insurer_id:
                continue
            if policy_type and policy_type.lower() not in p.get("policy_type", "").lower():
                continue
            if min_sum_insured is not None:
                max_si = max(p.get("sum_insured_options", [0]))
                if max_si < min_sum_insured:
                    continue
            results.append(InsurancePolicy(**p))
        return results

    @classmethod
    def get_policy_by_id(cls, policy_id: str) -> Optional[InsurancePolicy]:
        cls._load_data()
        for item in cls._policies:
            if item.get("policy_id") == policy_id:
                return InsurancePolicy(**item)
        return None

    @classmethod
    def compare_policies(cls, request: PolicyComparisonRequest) -> PolicyComparisonResponse:
        cls._load_data()
        selected: list[InsurancePolicy] = []
        for pid in request.policy_ids:
            pol = cls.get_policy_by_id(pid)
            if pol:
                selected.append(pol)

        if len(selected) < 2:
            raise ValueError("Select at least 2 valid policies to perform comparison.")

        # Matrix rows
        features = [
            {
                "feature": "Insurer & Product",
                "values": {p.policy_id: f"{p.insurer_name} — {p.policy_name}" for p in selected}
            },
            {
                "feature": "IRDAI Product UIN",
                "values": {p.policy_id: p.uin for p in selected}
            },
            {
                "feature": "Pre-Existing Disease (PED) Waiting Period",
                "values": {p.policy_id: f"{p.ped_waiting_period_months} Months" for p in selected}
            },
            {
                "feature": "Room Rent Category & Limits",
                "values": {p.policy_id: p.room_rent_limit for p in selected}
            },
            {
                "feature": "ICU Room Limits",
                "values": {p.policy_id: p.icu_limit for p in selected}
            },
            {
                "feature": "Mandatory Co-Payment",
                "values": {p.policy_id: f"{p.copay_percentage}% ({p.copay_notes})" for p in selected}
            },
            {
                "feature": "Restoration / Recharge Benefit",
                "values": {p.policy_id: p.restoration_benefit for p in selected}
            },
            {
                "feature": "Cumulative Bonus (No Claim Bonus)",
                "values": {p.policy_id: p.no_claim_bonus for p in selected}
            },
            {
                "feature": "Maternity & Newborn Coverage",
                "values": {
                    p.policy_id: p.maternity_benefit_details if p.maternity_covered else "Excluded / Not Covered"
                    for p in selected
                }
            },
            {
                "feature": "Modern Treatments & Robotic Surgeries",
                "values": {p.policy_id: p.modern_treatments for p in selected}
            },
            {
                "feature": "Pre / Post-Hospitalization Coverage",
                "values": {p.policy_id: f"{p.pre_hospitalization_days} Days Pre / {p.post_hospitalization_days} Days Post" for p in selected}
            }
        ]

        # Scoring & Suitability evaluation
        suitability_list: list[PolicySuitability] = []
        for p in selected:
            score = 75
            pros = []
            cons = []
            caveats = []

            # Room Rent Evaluation
            if "no sublimit" in p.room_rent_limit.lower():
                score += 10
                pros.append("Zero room rent capping prevents proportionate billing deductions on doctor and OT fees.")
            else:
                score -= 5
                cons.append(f"Room rent restricted to {p.room_rent_limit}; choosing higher room triggers proportionate deductions.")

            # PED waiting period
            if p.ped_waiting_period_months <= 24:
                score += 10
                pros.append(f"Short {p.ped_waiting_period_months}-month PED waiting period allows earlier coverage of pre-existing ailments.")
            else:
                score -= 5
                cons.append(f"{p.ped_waiting_period_months}-month PED waiting period requires 3 continuous claim-free years before coverage.")

            # Co-pay
            if p.copay_percentage == 0:
                score += 5
                pros.append("0% mandatory co-payment across all networked hospitals.")
            else:
                score -= 10
                cons.append(f"Mandatory {p.copay_percentage}% co-pay applies to every hospital claim.")

            # Restoration
            pros.append(p.restoration_benefit)

            # Caveats
            caveats.append("Requires pre-authorization at least 48 hours in advance for planned surgeries, or within 24 hours for emergencies.")
            if p.exclusions:
                caveats.append(f"Excluded: {', '.join(p.exclusions[:2])}.")

            score = max(50, min(98, score))
            verdict = "Highly Recommended" if score >= 85 else ("Recommended" if score >= 75 else "Consider with Caution")

            suitability_list.append(PolicySuitability(
                policy_id=p.policy_id,
                policy_name=p.policy_name,
                suitability_score=score,
                verdict=verdict,
                pros=pros,
                cons=cons,
                underwriting_caveats=caveats
            ))

        return PolicyComparisonResponse(
            policies=selected,
            comparison_features=features,
            suitability=suitability_list,
            disclaimer="Comparison criteria derived directly from IRDAI-registered Customer Information Sheets (CIS) and filed policy wordings. Not financial advice."
        )

from typing import Any, Optional
from app.models.calculator import (
    OutOfPocketRequest, OutOfPocketResponse, DeductionStep
)
from app.services.disease_service import DiseaseService
from app.services.insurance_service import InsuranceService
from app.services.hospital_service import HospitalService

ROOM_MULTIPLIERS = {
    "General Ward": 0.8,
    "Semi-Private": 1.0,
    "Single Private": 1.35,
    "Deluxe Suite": 1.8
}

ROOM_RATES_PER_DAY = {
    "General Ward": 1800.0,
    "Semi-Private": 3500.0,
    "Single Private": 6500.0,
    "Deluxe Suite": 11500.0
}

class CalculatorService:

    @classmethod
    def calculate_out_of_pocket(cls, req: OutOfPocketRequest) -> OutOfPocketResponse:
        # 1. Fetch Procedure details
        procedure = DiseaseService.get_procedure_by_id(req.procedure_id)
        proc_name = procedure.name if procedure else req.procedure_id.replace("-", " ").title()
        los = req.length_of_stay_days or (procedure.typical_stay_days if procedure else 3)
        room_type = req.room_type if req.room_type in ROOM_MULTIPLIERS else "Single Private"
        room_mult = ROOM_MULTIPLIERS[room_type]
        room_rate_daily = ROOM_RATES_PER_DAY[room_type]

        # 2. Hospital details
        hosp_name = "Network Hospital (Hyderabad)"
        if req.hospital_id:
            hosp = HospitalService.get_hospital_by_id(req.hospital_id)
            if hosp:
                hosp_name = hosp.name

        # 3. Base costs
        min_cost = procedure.indicative_cost_min if procedure else 100000.0
        max_cost = procedure.indicative_cost_max if procedure else 180000.0
        base_estimate = (min_cost + max_cost) / 2.0

        # Detailed breakdown
        room_total = room_rate_daily * los
        procedure_charges = base_estimate * 0.55 * (room_mult * 0.9)
        doctor_fees = base_estimate * 0.15 * (room_mult * 0.9)
        diagnostics = base_estimate * 0.12
        medicines = base_estimate * 0.18

        gross_bill = round(room_total + procedure_charges + doctor_fees + diagnostics + medicines, 2)
        non_payable_consumables = round(procedure.non_payable_expenses_inr if procedure else 12500.0, 2)

        breakdown = {
            "Room & Bed Charges": room_total,
            "Procedure & Operation Theatre (OT)": round(procedure_charges, 2),
            "Surgeon & Specialist Consultations": round(doctor_fees, 2),
            "Diagnostics & Laboratory Workup": round(diagnostics, 2),
            "Medicines, Implants & Disposables": round(medicines, 2),
            "Non-Payable Consumables & Admin Fees": non_payable_consumables
        }

        # 4. Insurance policy evaluation
        policy = None
        if req.policy_id:
            policy = InsuranceService.get_policy_by_id(req.policy_id)

        policy_covered = 0.0
        scheme_benefit = 0.0
        room_penalty = 0.0
        copay_amt = 0.0
        steps: list[DeductionStep] = []
        insights: list[str] = []

        running_balance = gross_bill
        step_idx = 1

        steps.append(DeductionStep(
            step_number=step_idx,
            title="Estimated Gross Hospital Bill",
            amount_inr=gross_bill,
            running_balance_inr=running_balance,
            category="charge",
            description=f"Estimated aggregate charge for {proc_name} ({los} days in {room_type}) at {hosp_name}."
        ))

        # Check Government Schemes
        if req.scheme_id in ("pm-jay", "aarogyasri"):
            scheme_title = "Ayushman Bharat PM-JAY" if req.scheme_id == "pm-jay" else "Aarogyasri Health Scheme"
            if room_type == "General Ward":
                scheme_benefit = min(gross_bill - non_payable_consumables, 500000.0)
                running_balance = max(0.0, running_balance - scheme_benefit)
                step_idx += 1
                steps.append(DeductionStep(
                    step_number=step_idx,
                    title=f"{scheme_title} Coverage",
                    amount_inr=-scheme_benefit,
                    running_balance_inr=running_balance,
                    category="scheme_benefit",
                    description=f"Standard government empanelled package rate applied. General ward treatment is 100% cashless under scheme guidelines."
                ))
                insights.append(f"Eligible under {scheme_title} for cashless treatment in General Ward category.")
            else:
                scheme_benefit = min(gross_bill * 0.6, 250000.0)
                running_balance = max(0.0, running_balance - scheme_benefit)
                step_idx += 1
                steps.append(DeductionStep(
                    step_number=step_idx,
                    title=f"{scheme_title} Fixed Tariff Credit",
                    amount_inr=-scheme_benefit,
                    running_balance_inr=running_balance,
                    category="scheme_benefit",
                    description=f"Fixed government scheme entitlement applied; luxury room upgrade is outside scheme scope."
                ))
                insights.append(f"{scheme_title} provides fixed package subsidy when upgrading beyond General Ward.")

        # Check Private Health Insurance
        elif policy:
            ped_active = True
            if req.is_ped and req.policy_active_months < policy.ped_waiting_period_months:
                ped_active = False
                insights.append(
                    f"Warning: Pre-existing condition requires {policy.ped_waiting_period_months} months active coverage. Your policy has been active for {req.policy_active_months} months. Claim for this condition is excluded during waiting period."
                )
                step_idx += 1
                steps.append(DeductionStep(
                    step_number=step_idx,
                    title="Pre-Existing Condition Waiting Period Restriction",
                    amount_inr=0.0,
                    running_balance_inr=running_balance,
                    category="deduction",
                    description=f"Waiting period clause: {policy.ped_waiting_period_months} months required vs {req.policy_active_months} months elapsed.",
                    clause_reference=f"{policy.policy_name} CIS Section 4 - Waiting Periods"
                ))

            if ped_active:
                si = req.sum_insured_inr or (policy.sum_insured_options[-1] if policy.sum_insured_options else 500000.0)
                eligible_bill = gross_bill - non_payable_consumables

                # Room rent sublimit check
                if "no sublimit" not in policy.room_rent_limit.lower():
                    allowed_room = 5000.0
                    if room_rate_daily > allowed_room:
                        ratio = allowed_room / room_rate_daily
                        room_penalty = round(eligible_bill * (1.0 - ratio), 2)
                        eligible_bill = eligible_bill - room_penalty
                        step_idx += 1
                        steps.append(DeductionStep(
                            step_number=step_idx,
                            title="Proportionate Room Rent Deduction",
                            amount_inr=room_penalty,
                            running_balance_inr=running_balance,
                            category="deduction",
                            description=f"Room rate ₹{room_rate_daily}/day exceeds policy limit (₹{allowed_room}/day). Associated medical charges reduced proportionately by {round((1.0 - ratio)*100, 1)}%.",
                            clause_reference="CIS Section 2 - Room Rent Capping"
                        ))
                        insights.append("Proportionate deduction was incurred because chosen room exceeds policy eligibility.")

                # Co-pay
                copay_pct = policy.copay_percentage
                if copay_pct > 0:
                    copay_amt = round(eligible_bill * (copay_pct / 100.0), 2)
                    eligible_bill -= copay_amt
                    step_idx += 1
                    steps.append(DeductionStep(
                        step_number=step_idx,
                        title=f"Mandatory Policy Co-Payment ({copay_pct}%)",
                        amount_inr=copay_amt,
                        running_balance_inr=running_balance,
                        category="copay",
                        description=f"{copay_pct}% co-payment borne by insured as per policy terms ({policy.copay_notes}).",
                        clause_reference="CIS Section 5 - Co-Pay"
                    ))

                policy_covered = min(eligible_bill, si)
                running_balance = max(0.0, running_balance - policy_covered)
                step_idx += 1
                steps.append(DeductionStep(
                    step_number=step_idx,
                    title="Insurance Policy Approved Claim",
                    amount_inr=-policy_covered,
                    running_balance_inr=running_balance,
                    category="insurance_coverage",
                    description=f"{policy.insurer_name} {policy.policy_name} covers ₹{policy_covered:,.2f} under active Sum Insured.",
                    clause_reference=f"UIN: {policy.uin}"
                ))
                insights.append(f"{policy.policy_name} covers ₹{policy_covered:,.2f} of treatment expenses.")

        # Non-payable consumables step
        step_idx += 1
        steps.append(DeductionStep(
            step_number=step_idx,
            title="Non-Payable Medical Consumables & Admin Surcharges",
            amount_inr=non_payable_consumables,
            running_balance_inr=running_balance + non_payable_consumables,
            category="consumables",
            description="IRDAI Non-Payable Items (gloves, PPE kits, admission fee, patient kit) not covered by standard base policies unless optional consumable cover is purchased.",
            clause_reference="IRDAI Guidelines on Standardization of Exclusions (List I)"
        ))

        final_out_of_pocket = round(gross_bill - policy_covered - scheme_benefit, 2)
        final_out_of_pocket = max(non_payable_consumables, final_out_of_pocket)

        insights.append(
            f"Estimated out-of-pocket expenditure: ₹{final_out_of_pocket:,.2f}. Retain ₹{non_payable_consumables:,.2f} in liquid funds at admission for non-payable hospital consumables."
        )

        return OutOfPocketResponse(
            procedure_id=req.procedure_id,
            procedure_name=proc_name,
            hospital_name=hosp_name,
            room_type=room_type,
            gross_hospital_bill=gross_bill,
            bill_breakdown=breakdown,
            policy_coverage_amount=round(policy_covered, 2),
            scheme_benefit_amount=round(scheme_benefit, 2),
            room_rent_penalty=round(room_penalty, 2),
            copay_amount=round(copay_amt, 2),
            non_payable_consumables=non_payable_consumables,
            final_out_of_pocket=round(final_out_of_pocket, 2),
            deduction_steps=steps,
            financial_insights=insights,
            data_mode="indicative_actuarial_model",
            disclaimer="Estimates calculated using published hospital package guidelines, IRDAI exclusion norms, and official insurer CIS filings. Actual hospital bills depend on clinical condition, surgeon fees, and surgical complexities."
        )

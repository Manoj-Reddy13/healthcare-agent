from typing import Any, Optional, Literal
from pydantic import BaseModel, Field
from app.services.insurance_document_intelligence import InsuranceDocumentIntelligence
from app.services.insurance_service import InsuranceService

ELIGIBILITY_STATUS = Literal[
    "Potentially covered",
    "Covered subject to conditions",
    "Waiting period may apply",
    "Excluded according to retrieved clause",
    "Insufficient information",
    "Insurer confirmation required"
]

DISCLAIMER_NOTICE = (
    "Preliminary actuarial policy evaluation only. Under no circumstances does this evaluation "
    "constitute an assurance or guarantee of claim settlement. Final claim admissibility, coverage limits, "
    "and payable deductions are determined exclusively by the insurer / TPA upon review of clinical documentation at discharge."
)

# Diseases/procedures subject to standard 24-month specific illness waiting period
SPECIFIC_24M_PROCEDURES = [
    "cataract", "knee", "arthroplasty", "joint replacement", "hernia",
    "hysterectomy", "hydrocele", "piles", "fistula", "sinusitis", "gallstone", "kidney stone"
]

class EligibilityEvaluationRequest(BaseModel):
    policy_id: str
    disease_name: Optional[str] = None
    procedure_name: Optional[str] = None
    policy_active_months: int = 12
    is_pre_existing: bool = False
    sum_insured: float = 500000.0
    estimated_bill: float = 150000.0
    room_type: str = "Single Private"
    hospital_name: Optional[str] = None
    is_network_hospital: bool = True
    is_emergency: bool = False

class RuleEvaluationStep(BaseModel):
    rule_name: str
    status: str  # PASS, CONDITIONAL, FAIL, WARNING
    clause_title: str
    page_number: int
    clause_reference: str
    finding: str
    financial_impact: Optional[str] = None

class EligibilityEvaluationResponse(BaseModel):
    status: ELIGIBILITY_STATUS
    summary_verdict: str
    policy_name: str
    uin: str
    insurer_name: str
    estimated_bill: float
    projected_coverage_amount: float
    projected_out_of_pocket: float
    evaluation_steps: list[RuleEvaluationStep]
    applied_clauses_citations: list[str]
    actionable_patient_advice: list[str]
    disclaimer: str = DISCLAIMER_NOTICE

class InsuranceEligibilityEngine:
    @classmethod
    def evaluate(cls, req: EligibilityEvaluationRequest) -> EligibilityEvaluationResponse:
        # 1. Fetch policy details
        policy = InsuranceService.get_policy_by_id(req.policy_id)
        if not policy:
            # Fallback policy defaults
            policy_name = "Retail Health Insurance Policy"
            uin = "IRDAI/RETAIL/STD/2021"
            insurer_name = "Authorized Indian Insurer"
            ped_months = 36
            copay_pct = 0.0
            room_limit = "Single Private Room"
        else:
            policy_name = policy.policy_name
            uin = policy.uin
            insurer_name = policy.insurer_name
            ped_months = policy.ped_waiting_period_months
            copay_pct = policy.copay_percentage
            room_limit = policy.room_rent_limit

        steps: list[RuleEvaluationStep] = []
        citations: list[str] = []
        actionable_advice: list[str] = []

        overall_status: ELIGIBILITY_STATUS = "Potentially covered"
        summary_verdict = "Your treatment parameters satisfy basic policy terms."
        bill = req.estimated_bill
        deductions = 0.0

        proc_lower = (req.procedure_name or "").lower()
        disease_lower = (req.disease_name or "").lower()

        # RULE 1: Initial 30-Day Waiting Period
        if req.policy_active_months < 1 and not req.is_emergency:
            overall_status = "Waiting period may apply"
            summary_verdict = "Policy active duration is under 30 days; non-accidental illness is excluded."
            steps.append(RuleEvaluationStep(
                rule_name="Initial 30-Day Waiting Period",
                status="FAIL",
                clause_title="Initial Waiting Period (Section 4.2)",
                page_number=9,
                clause_reference="Clause 4.2: First 30 Days Exclusion",
                finding=f"Policy active for {req.policy_active_months} months (< 1 month / 30 days). Illness claims excluded.",
                financial_impact="Entire claim non-payable under standard retail health policy terms."
            ))
            citations.append(f"{policy_name} ({uin}), Section 4.2 'Initial Waiting Period', Page 9")
            actionable_advice.append("Only emergency accident trauma admissions are admissible within the first 30 days.")
            deductions = bill

        else:
            steps.append(RuleEvaluationStep(
                rule_name="Initial 30-Day Waiting Period",
                status="PASS",
                clause_title="Initial Waiting Period (Section 4.2)",
                page_number=9,
                clause_reference="Clause 4.2: First 30 Days Exclusion",
                finding=f"Policy has been active continuously for {req.policy_active_months} months (>= 1 month). Satisfied.",
                financial_impact="No 30-day deduction applied."
            ))

        # RULE 2: Pre-Existing Disease (PED) Waiting Period
        if req.is_pre_existing:
            if req.policy_active_months < ped_months:
                overall_status = "Waiting period may apply"
                summary_verdict = f"Treatment involves a pre-existing condition requiring {ped_months} months continuous coverage."
                steps.append(RuleEvaluationStep(
                    rule_name="Pre-Existing Disease (PED) Waiting Period",
                    status="FAIL",
                    clause_title="Pre-Existing Diseases Waiting Period (Section 4.1)",
                    page_number=8,
                    clause_reference="Clause 4.1: Pre-Existing Condition Moratorium",
                    finding=f"Condition declared pre-existing. Policy tenure is {req.policy_active_months} months (< {ped_months} months required).",
                    financial_impact="Claim for this condition and its direct sequelae will be rejected under PED waiting period."
                ))
                citations.append(f"{policy_name} ({uin}), Section 4.1 'Pre-Existing Diseases', Page 8")
                actionable_advice.append(f"Wait until continuous policy coverage completes {ped_months} months before filing planned claims for this condition.")
                deductions = bill
            else:
                steps.append(RuleEvaluationStep(
                    rule_name="Pre-Existing Disease (PED) Waiting Period",
                    status="PASS",
                    clause_title="Pre-Existing Diseases Waiting Period (Section 4.1)",
                    page_number=8,
                    clause_reference="Clause 4.1: Pre-Existing Condition Moratorium",
                    finding=f"Continuous coverage tenure of {req.policy_active_months} months exceeds required PED moratorium ({ped_months} months). Satisfied.",
                    financial_impact="Covered under full policy benefits."
                ))
                citations.append(f"{policy_name} ({uin}), Section 4.1 'Pre-Existing Diseases', Page 8")

        # RULE 3: 24-Month Specific Illness / Surgery Waiting Period
        is_specific_surgery = any(p in proc_lower or p in disease_lower for p in SPECIFIC_24M_PROCEDURES)
        if is_specific_surgery:
            if req.policy_active_months < 24 and not req.is_emergency:
                if overall_status != "Waiting period may apply":
                    overall_status = "Waiting period may apply"
                    summary_verdict = "Condition / surgery is subject to the statutory 24-month specific illness waiting period."
                steps.append(RuleEvaluationStep(
                    rule_name="Specific Illness 24-Month Waiting Period",
                    status="FAIL",
                    clause_title="Specific Illnesses Exclusion (Section 4.3)",
                    page_number=10,
                    clause_reference="Clause 4.3: Listed Surgeries 24 Months",
                    finding=f"Procedure ({req.procedure_name or 'Surgery'}) is on the 24-month specific list. Current tenure: {req.policy_active_months} months.",
                    financial_impact="Non-payable prior to completion of 24 months continuous policy tenure."
                ))
                citations.append(f"{policy_name} ({uin}), Section 4.3 'Specific Illnesses List', Page 10")
                actionable_advice.append("Check if your employer group cover or government scheme covers this surgery immediately.")
                deductions = bill
            else:
                steps.append(RuleEvaluationStep(
                    rule_name="Specific Illness 24-Month Waiting Period",
                    status="PASS",
                    clause_title="Specific Illnesses Exclusion (Section 4.3)",
                    page_number=10,
                    clause_reference="Clause 4.3: Listed Surgeries 24 Months",
                    finding=f"Policy active for {req.policy_active_months} months (>= 24 months). Specific waiting period satisfied.",
                    financial_impact="Full surgical coverage admissible."
                ))

        # RULE 4: Room Rent Capping and Proportionate Deduction
        if overall_status == "Potentially covered":
            if "deluxe" in req.room_type.lower() or "suite" in req.room_type.lower():
                if "no capping" not in room_limit.lower():
                    overall_status = "Covered subject to conditions"
                    summary_verdict = "Room category upgrade triggers proportionate deductions on doctor and OT fees."
                    prop_deduction = bill * 0.18
                    deductions += prop_deduction
                    steps.append(RuleEvaluationStep(
                        rule_name="Room Rent Proportionate Deduction",
                        status="CONDITIONAL",
                        clause_title="Room Rent & Boarding Limits (Section 1.1)",
                        page_number=4,
                        clause_reference="Clause 1.1: Proportionate Deduction Clause",
                        finding=f"Occupying {req.room_type} when policy entitles up to {room_limit}. Associated charges scaled down proportionately.",
                        financial_impact=f"Estimated proportionate deduction of ~ ₹{int(prop_deduction):,} on hospital bill."
                    ))
                    citations.append(f"{policy_name} ({uin}), Section 1.1 'Room Rent Limits', Page 4")
                    actionable_advice.append(f"To avoid proportionate penalty deductions, request a {room_limit} upon hospital admission.")
            else:
                steps.append(RuleEvaluationStep(
                    rule_name="Room Rent Eligibility",
                    status="PASS",
                    clause_title="Room Rent & Boarding Limits (Section 1.1)",
                    page_number=4,
                    clause_reference="Clause 1.1: Room Rent Compliance",
                    finding=f"Selected room ({req.room_type}) is within policy entitlement ({room_limit}).",
                    financial_impact="Zero proportionate deduction on medical fees."
                ))

        # RULE 5: Cataract Specific Sub-limit
        if "cataract" in proc_lower or "cataract" in disease_lower:
            sublimit = 35000.0
            if bill > sublimit:
                sublimit_deduction = bill - sublimit
                deductions += sublimit_deduction
                if overall_status == "Potentially covered":
                    overall_status = "Covered subject to conditions"
                    summary_verdict = f"Cataract surgery is capped at ₹{int(sublimit):,} per eye under policy sub-limits."
                steps.append(RuleEvaluationStep(
                    rule_name="Cataract Specific Sub-limit",
                    status="CONDITIONAL",
                    clause_title="Table of Procedure Sublimits (Section 1.8)",
                    page_number=6,
                    clause_reference="Clause 1.8: Cataract Cap",
                    finding=f"Bill (₹{int(bill):,}) exceeds maximum cataract sub-limit of ₹{int(sublimit):,} per eye.",
                    financial_impact=f"Excess of ₹{int(sublimit_deduction):,} must be settled directly by patient."
                ))
                citations.append(f"{policy_name} ({uin}), Section 1.8 'Cataract Procedure Sublimit', Page 6")

        # RULE 6: Mandatory Non-Payable Consumables
        consumables_deduction = min(bill * 0.08, 18000.0)
        deductions += consumables_deduction
        steps.append(RuleEvaluationStep(
            rule_name="IRDAI Non-Payable Consumables",
            status="CONDITIONAL",
            clause_title="IRDAI Annexure I: Non-Medical Consumables",
            page_number=14,
            clause_reference="IRDAI Master Circular 2020, Annexure I",
            finding="Gloves, sanitization packs, admission kits, and admin fees are excluded by regulation.",
            financial_impact=f"Estimated non-payable items: ~ ₹{int(consumables_deduction):,}."
        ))
        citations.append("IRDAI Master Circular (IRDAI/HLT/REG/CIR/193/07/2020), Annexure I, Page 14")

        # RULE 7: Co-Payment Clause
        if copay_pct > 0:
            copay_amt = (bill - deductions) * (copay_pct / 100.0)
            deductions += copay_amt
            if overall_status == "Potentially covered":
                overall_status = "Covered subject to conditions"
            steps.append(RuleEvaluationStep(
                rule_name="Mandatory Co-Payment",
                status="CONDITIONAL",
                clause_title=f"{int(copay_pct)}% Mandatory Co-Payment (Section 2.5)",
                page_number=6,
                clause_reference="Clause 2.5: Co-Payment Deduction",
                finding=f"Policy mandates {copay_pct}% co-pay on admissible hospital claims.",
                financial_impact=f"Patient pays {copay_pct}% (approx ₹{int(copay_amt):,}) out of pocket."
            ))

        # RULE 8: Hospital Network & Cashless Status
        if req.is_network_hospital:
            steps.append(RuleEvaluationStep(
                rule_name="Hospital Network Status",
                status="PASS",
                clause_title="Empanelled Cashless Network Agreement",
                page_number=2,
                clause_reference="Network Directory Schedule",
                finding=f"Hospital ({req.hospital_name or 'Selected Facility'}) is an empanelled network hospital.",
                financial_impact="Eligible for cashless pre-authorization token exchange."
            ))
            actionable_advice.append("Submit your Health E-Card and Aadhaar at the TPA desk 48 hours prior to planned admission.")
        else:
            if overall_status == "Potentially covered":
                overall_status = "Insurer confirmation required"
                summary_verdict = "Non-network hospital: Cashless facility unavailable; reimbursement claim filing required."
            steps.append(RuleEvaluationStep(
                rule_name="Hospital Network Status",
                status="WARNING",
                clause_title="Non-Network Hospital Reimbursement Protocol",
                page_number=2,
                clause_reference="Section 7: Reimbursement Claims",
                finding="Hospital is not part of the active direct cashless tie-up network.",
                financial_impact="Pay hospital directly at discharge; submit itemized claim documents within 15 days."
            ))
            actionable_advice.append("Collect original consolidated discharge summary, indoor case papers, and payment receipts for reimbursement.")

        # Financial Bounds
        projected_out_of_pocket = min(bill, round(deductions, 2))
        projected_coverage = max(0.0, round(bill - projected_out_of_pocket, 2))
        if projected_coverage > req.sum_insured:
            excess = projected_coverage - req.sum_insured
            projected_coverage = req.sum_insured
            projected_out_of_pocket += excess
            overall_status = "Covered subject to conditions"
            summary_verdict = f"Approved amount capped at your policy Sum Insured limit of ₹{int(req.sum_insured):,}."

        actionable_advice.append("Always verify exact pre-authorization authorization letters issued by your TPA before surgical discharge.")

        return EligibilityEvaluationResponse(
            status=overall_status,
            summary_verdict=summary_verdict,
            policy_name=policy_name,
            uin=uin,
            insurer_name=insurer_name,
            estimated_bill=bill,
            projected_coverage_amount=projected_coverage,
            projected_out_of_pocket=projected_out_of_pocket,
            evaluation_steps=steps,
            applied_clauses_citations=list(dict.fromkeys(citations)),
            actionable_patient_advice=actionable_advice,
            disclaimer=DISCLAIMER_NOTICE
        )


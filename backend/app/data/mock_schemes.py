from app.models.scheme import HealthcareScheme

MOCK_SCHEMES: list[HealthcareScheme] = [
    HealthcareScheme(
        id="scheme-pmjay",
        name="Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        short_code="PM-JAY",
        category="Government",
        coverage_limit=500000.0,
        eligibility_summary=(
            "Families listed in the SECC 2011 database, rural households with specific deprivation criteria, "
            "and identified occupational categories of urban workers. Also covers senior citizens aged 70+ irrespective of income."
        ),
        covered_specialties=[
            "Cardiology", "Cardiothoracic Surgery", "Oncology", "Orthopedics",
            "Neurosurgery", "General Medicine", "Pediatrics"
        ],
        income_ceiling_inr=None,
        official_portal="https://pmjay.gov.in",
        claim_process_summary=(
            "Cashless at all empaneled public and private hospitals. Present your Ayushman Card / Aadhaar card "
            "at the Ayushman Mitra helpdesk upon hospital admission."
        ),
        data_mode="mock"
    ),
    HealthcareScheme(
        id="scheme-aarogyasri",
        name="Dr. YSR Aarogyasri / Telangana Aarogyasri Health Care Trust",
        short_code="AAROGYASRI",
        category="State",
        coverage_limit=1000000.0,
        eligibility_summary=(
            "White ration card / Food Security Card holders residing in Telangana and Andhra Pradesh. "
            "Annual family income ceiling below ₹5,00,000 for covered tertiary procedures."
        ),
        covered_specialties=[
            "Cardiology", "Nephrology", "Oncology", "Polytrauma", "Gynecology", "Pediatrics", "Ophthalmology"
        ],
        income_ceiling_inr=500000.0,
        official_portal="https://aarogyasri.telangana.gov.in",
        claim_process_summary=(
            "Completely cashless treatment through the Aarogya Mithra desk at network hospitals. "
            "Covers hospital stay, doctor fees, surgeries, medicines, and 10-day post-discharge medicines."
        ),
        data_mode="mock"
    ),
    HealthcareScheme(
        id="scheme-cghs",
        name="Central Government Health Scheme (CGHS)",
        short_code="CGHS",
        category="Social Security",
        coverage_limit=1500000.0,
        eligibility_summary=(
            "Serving and retired Central Government employees, Members of Parliament, Supreme/High Court judges, "
            "freedom fighters, and eligible dependents residing in CGHS-covered cities."
        ),
        covered_specialties=[
            "Cardiology", "Neurology", "Orthopedics", "Oncology", "Dental", "Ophthalmology", "General Medicine"
        ],
        income_ceiling_inr=None,
        official_portal="https://cghs.nic.in",
        claim_process_summary=(
            "Cashless treatment at empaneled private hospitals upon referral from a CGHS Wellness Centre / Medical Officer. "
            "Direct emergency admissions allowed with CGHS Plastic Card."
        ),
        data_mode="mock"
    ),
    HealthcareScheme(
        id="scheme-esic",
        name="Employees' State Insurance Scheme (ESIC)",
        short_code="ESIC",
        category="Social Security",
        coverage_limit=1000000.0,
        eligibility_summary=(
            "Formal sector employees earning monthly wages up to ₹21,000 (₹25,000 for persons with disability) "
            "working in covered factories and non-seasonal establishments."
        ),
        covered_specialties=[
            "Cardiology", "Pulmonology", "Orthopedics", "Maternity", "General Surgery", "Dialysis"
        ],
        income_ceiling_inr=252000.0,
        official_portal="https://esic.gov.in",
        claim_process_summary=(
            "Direct outpatient & inpatient care at ESI dispensaries and hospitals. "
            "Secondary & super-specialty tie-up hospital referrals for advanced operations without out-of-pocket costs."
        ),
        data_mode="mock"
    )
]

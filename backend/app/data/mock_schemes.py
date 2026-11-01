from app.models.scheme import HealthcareScheme

MOCK_SCHEMES: list[HealthcareScheme] = [
    HealthcareScheme(
        id="scheme-pmjay",
        name="Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        short_code="PM-JAY",
        category="Government",
        coverage_limit=500000.0,
        eligibility_summary=(
            "Families listed in the SECC 2011 database, rural households with deprivation criteria (D1-D7), "
            "and identified occupational categories of urban workers. Also covers all senior citizens aged 70+ irrespective of income."
        ),
        covered_specialties=[
            "Cardiology", "Cardiothoracic Surgery", "Oncology", "Orthopedics",
            "Neurosurgery", "General Medicine", "Pediatrics"
        ],
        income_ceiling_inr=None,
        official_portal="https://pmjay.gov.in",
        claim_process_summary=(
            "Cashless at all empaneled public and private hospitals nationwide. Present your Ayushman Card or Aadhaar "
            "at the Ayushman Mitra helpdesk upon hospital admission."
        ),
        data_mode="mock",
        beneficiary_categories=[
            "SECC 2011 Beneficiary Families",
            "Universal Senior Citizens (Age 70+ under expanded NHA coverage)",
            "Rural Deprivation Criteria (D1 to D7)",
            "Identified Urban Informal Workers"
        ],
        required_documents=[
            "Aadhaar Card of patient",
            "Ration Card or Family Head Record",
            "Ayushman Card (BIS Portal download)",
            "Active mobile number linked to Aadhaar"
        ],
        participating_hospitals_count=29380,
        official_source="National Health Authority (NHA), Ministry of Health & Family Welfare",
        last_updated="2026-10-29"
    ),
    HealthcareScheme(
        id="scheme-aarogyasri",
        name="Telangana Aarogyasri Community Health Care Scheme",
        short_code="AAROGYASRI",
        category="State",
        coverage_limit=1000000.0,
        eligibility_summary=(
            "White ration card / Food Security Card holder families residing in Telangana. "
            "Enhanced coverage limit of up to ₹10 Lakh for 1,672 secondary and tertiary surgical packages."
        ),
        covered_specialties=[
            "Cardiology", "Nephrology", "Oncology", "Polytrauma", "Gynecology", "Pediatrics", "Ophthalmology"
        ],
        income_ceiling_inr=500000.0,
        official_portal="https://aarogyasri.telangana.gov.in",
        claim_process_summary=(
            "100% cashless treatment through the 24x7 Aarogya Mithra desk at network hospitals. "
            "Covers pre-hospital diagnostics, inpatient stay, surgery, consumables, and 10-day post-discharge medicines."
        ),
        data_mode="mock",
        beneficiary_categories=[
            "Telangana Food Security (White) Ration Card Holders",
            "Antyodaya Anna Yojana (AAY) Beneficiaries",
            "Annapurna Card Beneficiaries",
            "Low-income BPL Agricultural Households"
        ],
        required_documents=[
            "Food Security Card (Telangana White Ration Card)",
            "Aadhaar Card of all treated family members",
            "Outpatient Slip / Referral from Government Hospital",
            "Recent passport photo for Aarogya Mithra registry"
        ],
        participating_hospitals_count=874,
        official_source="Telangana Aarogyasri Health Care Trust, Government of Telangana",
        last_updated="2026-10-29"
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
        data_mode="mock",
        beneficiary_categories=[
            "Central Government Employees",
            "Central Government Pensioners & Family Pensioners",
            "Sitting and Former Members of Parliament",
            "Recognized Freedom Fighters"
        ],
        required_documents=[
            "CGHS Plastic Card (Valid Beneficiary ID)",
            "Referral Memo from CGHS Wellness Centre Medical Officer",
            "Government Photo Identity Proof (Aadhaar / Voter ID)"
        ],
        participating_hospitals_count=1450,
        official_source="Directorate General of CGHS, MoHFW (Tariff Order 2025/2026)",
        last_updated="2026-10-29"
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
        data_mode="mock",
        beneficiary_categories=[
            "Organized Sector Employees earning <= ₹21,000/month",
            "Insured Persons (IP) & Registered Dependent Family Members",
            "Persons with Disabilities earning <= ₹25,000/month"
        ],
        required_documents=[
            "ESIC Pehchan / e-Pehchan Card with IP Number",
            "Form 105 for Super Specialty Treatment Tie-up referral",
            "Aadhaar Card of Insured Person and Patient"
        ],
        participating_hospitals_count=1520,
        official_source="Employees' State Insurance Corporation, Ministry of Labour & Employment",
        last_updated="2026-10-29"
    )
]

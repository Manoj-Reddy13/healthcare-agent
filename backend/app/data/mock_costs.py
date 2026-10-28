from typing import Any

# Baseline procedure costs in INR for private tier hospital in metros
PROCEDURE_BENCHMARKS: dict[str, dict[str, Any]] = {
    "angioplasty": {
        "display_name": "Angioplasty (PTCA with Stenting)",
        "base_min": 120000,
        "base_max": 180000,
        "factors": [
            "Number and quality tier of drug-eluting stents (DES)",
            "Duration of post-procedure Coronary Care Unit (CCU) stay",
            "Complex lesion anatomies requiring intravascular ultrasound (IVUS) or OCT",
            "Pre-existing conditions like diabetes or chronic kidney disease"
        ],
        "covered_schemes": ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS", "ESIC"]
    },
    "knee replacement": {
        "display_name": "Total Knee Replacement (Single Joint)",
        "base_min": 140000,
        "base_max": 210000,
        "factors": [
            "Implant material (Titanium / Cobalt-Chromium / Oxinium)",
            "Computer-navigated or robotic-assisted surgery options",
            "Physiotherapy and rehabilitation duration",
            "Inpatient length of stay"
        ],
        "covered_schemes": ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS"]
    },
    "cataract surgery": {
        "display_name": "Cataract Surgery (Phacoemulsification with IOL)",
        "base_min": 20000,
        "base_max": 45000,
        "factors": [
            "Intraocular Lens (IOL) type: Monofocal, Toric, or Multifocal/Trifocal",
            "Femtosecond laser assistance",
            "Day-care procedure vs overnight monitoring"
        ],
        "covered_schemes": ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS", "ESIC"]
    },
    "normal delivery": {
        "display_name": "Normal Vaginal Delivery",
        "base_min": 35000,
        "base_max": 65000,
        "factors": [
            "Epidural analgesia (painless delivery) administration",
            "Neonatal care and nursery monitoring tier",
            "Length of maternal stay"
        ],
        "covered_schemes": ["Janani Suraksha Yojana", "Aarogyasri", "Ayushman Bharat (PM-JAY)"]
    },
    "mri scan": {
        "display_name": "MRI Scan (Brain / Spine / Joint)",
        "base_min": 5500,
        "base_max": 9500,
        "factors": [
            "With or without IV contrast agent",
            "1.5 Tesla vs 3.0 Tesla high-field scanner resolution",
            "Number of anatomical regions scanned"
        ],
        "covered_schemes": ["CGHS", "ESIC", "Aarogyasri"]
    },
    "doctor consultation": {
        "display_name": "Specialist / Super-Specialist Doctor Consultation",
        "base_min": 600,
        "base_max": 1200,
        "factors": [
            "Doctor clinical seniority (Consultant vs Chief Surgeon)",
            "Institution tier (Trust/Govt vs Multi-Specialty Corporate)",
            "Follow-up window inclusions"
        ],
        "covered_schemes": ["CGHS", "ESIC", "Aarogyasri OPD"]
    }
}

ROOM_MULTIPLIERS: dict[str, float] = {
    "General Ward": 0.85,
    "Semi-Private": 1.0,
    "Private Room": 1.25,
    "ICU": 1.6
}

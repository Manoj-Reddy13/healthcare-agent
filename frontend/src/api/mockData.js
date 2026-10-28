export const MOCK_HOSPITALS = [
  {
    id: "hosp-hyd-01",
    name: "Apollo Health City, Jubilee Hills",
    city: "Hyderabad",
    address: "Road No 72, Opposite Bharatiya Vidya Bhavan, Jubilee Hills, Hyderabad - 500033",
    phone: "+91 40 2360 7777",
    specialties: ["Cardiology", "Neurology", "Oncology", "Orthopedics", "Emergency Medicine"],
    indicative_costs: {
      "Doctor Consultation": 1000,
      "Angioplasty": 175000,
      "Knee Replacement": 195000,
      "Normal Delivery": 65000,
      "Cataract Surgery": 35000,
      "MRI Scan": 8500
    },
    rating: 4.7,
    distance_km: 4.2,
    accepted_schemes: ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS"],
    accreditation: ["NABH", "JCI", "NABL"],
    verified: true,
    data_mode: "mock"
  },
  {
    id: "hosp-hyd-02",
    name: "Nizam's Institute of Medical Sciences (NIMS)",
    city: "Hyderabad",
    address: "Punjagutta, Hyderabad, Telangana - 500082",
    phone: "+91 40 2348 9000",
    specialties: ["Cardiology", "Nephrology", "General Medicine", "Oncology", "Orthopedics"],
    indicative_costs: {
      "Doctor Consultation": 150,
      "Angioplasty": 65000,
      "Knee Replacement": 85000,
      "Normal Delivery": 12000,
      "Cataract Surgery": 10000,
      "MRI Scan": 3200
    },
    rating: 4.4,
    distance_km: 3.1,
    accepted_schemes: ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "ESIC", "CGHS"],
    accreditation: ["NABH"],
    verified: true,
    data_mode: "mock"
  },
  {
    id: "hosp-hyd-03",
    name: "KIMS Hospitals, Secunderabad",
    city: "Hyderabad",
    address: "1-8-31/1, Minister Road, Begumpet, Secunderabad - 500003",
    phone: "+91 40 4488 5000",
    specialties: ["Cardiology", "Pulmonology", "Gastroenterology", "Pediatrics", "Orthopedics"],
    indicative_costs: {
      "Doctor Consultation": 800,
      "Angioplasty": 140000,
      "Knee Replacement": 160000,
      "Normal Delivery": 50000,
      "Cataract Surgery": 28000,
      "MRI Scan": 7000
    },
    rating: 4.5,
    distance_km: 6.8,
    accepted_schemes: ["Aarogyasri", "CGHS", "ESIC"],
    accreditation: ["NABH", "NABL"],
    verified: true,
    data_mode: "mock"
  },
  {
    id: "hosp-hyd-04",
    name: "Care Hospitals, Banjara Hills",
    city: "Hyderabad",
    address: "Road No. 1, Prem Nagar, Banjara Hills, Hyderabad - 500034",
    phone: "+91 40 6165 6565",
    specialties: ["Cardiology", "Neurology", "Vascular Surgery", "Critical Care"],
    indicative_costs: {
      "Doctor Consultation": 900,
      "Angioplasty": 155000,
      "Knee Replacement": 175000,
      "Normal Delivery": 55000,
      "Cataract Surgery": 30000,
      "MRI Scan": 7800
    },
    rating: 4.6,
    distance_km: 5.0,
    accepted_schemes: ["Ayushman Bharat (PM-JAY)", "Aarogyasri", "CGHS"],
    accreditation: ["NABH"],
    verified: true,
    data_mode: "mock"
  }
];

export const MOCK_SCHEMES = [
  {
    id: "scheme-pmjay",
    name: "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
    short_code: "PM-JAY",
    category: "Government",
    coverage_limit: 500000,
    eligibility_summary: "SECC 2011 identified families and senior citizens aged 70+ across India.",
    covered_specialties: ["Cardiology", "Cardiothoracic Surgery", "Oncology", "Orthopedics", "Neurosurgery"],
    income_ceiling_inr: null,
    official_portal: "https://pmjay.gov.in",
    claim_process_summary: "Cashless across all empaneled hospitals via Ayushman Card / Aadhaar identification.",
    data_mode: "mock"
  },
  {
    id: "scheme-aarogyasri",
    name: "Dr. YSR Aarogyasri / Telangana Aarogyasri Health Care Trust",
    short_code: "AAROGYASRI",
    category: "State",
    coverage_limit: 1000000,
    eligibility_summary: "White ration card / Food Security Card holders in Telangana and Andhra Pradesh.",
    covered_specialties: ["Cardiology", "Nephrology", "Oncology", "Polytrauma", "Gynecology"],
    income_ceiling_inr: 500000,
    official_portal: "https://aarogyasri.telangana.gov.in",
    claim_process_summary: "Completely cashless hospitalization including surgery and 10 days of post-op medicines.",
    data_mode: "mock"
  },
  {
    id: "scheme-cghs",
    name: "Central Government Health Scheme (CGHS)",
    short_code: "CGHS",
    category: "Social Security",
    coverage_limit: 1500000,
    eligibility_summary: "Serving and retired Central Government employees, MPs, judges, and dependents.",
    covered_specialties: ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Dental"],
    income_ceiling_inr: null,
    official_portal: "https://cghs.nic.in",
    claim_process_summary: "Referral from CGHS Wellness Centre or direct emergency admission with Plastic Card.",
    data_mode: "mock"
  },
  {
    id: "scheme-esic",
    name: "Employees' State Insurance Scheme (ESIC)",
    short_code: "ESIC",
    category: "Social Security",
    coverage_limit: 1000000,
    eligibility_summary: "Formal sector employees earning up to ₹21,000/month.",
    covered_specialties: ["Cardiology", "Pulmonology", "Orthopedics", "Maternity", "General Surgery"],
    income_ceiling_inr: 252000,
    official_portal: "https://esic.gov.in",
    claim_process_summary: "Full outpatient & inpatient care at ESI dispensaries and empanelled tertiary hospitals.",
    data_mode: "mock"
  }
];

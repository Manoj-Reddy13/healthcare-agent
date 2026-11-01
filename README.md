# CareNav AI – Healthcare Cost and Care Navigation Platform

[![Backend CI Verification](https://img.shields.io/badge/CI%20Verification-147%20Tests%20Passed-emerald.svg)](.local/ci-reports/summary.json)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-sky.svg)](https://tailwindcss.com)

**CareNav AI** is a production-quality, data-driven healthcare navigation and cost navigation platform designed to bridge the transparency gap for patients and families in India.

The platform assists users in finding accredited hospitals, calculating itemized out-of-pocket treatment costs across room accommodation tiers, evaluating government healthcare scheme eligibility (Ayushman Bharat PM-JAY, Telangana Aarogyasri), receiving AI-assisted care navigation, and generating personalized care plans.

---

## 📸 6-Screen Healthcare SaaS Suite

The platform recreates a professional healthcare technology SaaS design system with a clean, high-trust palette (navy blue, teal, emerald green):

| Screen | Route / View | Key Capabilities |
| :--- | :--- | :--- |
| **1. Overview** | `overview` | Dynamic service search, quick access cards, regional healthcare insights (2,340+ TS hospitals, 500+ treatments, 12+ schemes), popular medical specialties, and verified provenance badges. |
| **2. AI Healthcare Navigator** | `navigator` | Autonomous conversational assistant equipped with 7 backend tools. Features interactive response tabs (*Hospitals*, *Cost Estimate*, *Scheme Coverage*, *Next Steps*), 108/112 emergency intercept, and source citation. |
| **3. Find Hospitals** | `hospitals` | Search by city, locality, and PIN code (e.g., `500033`); filter by specialty, hospital type (Govt/Private/Trust), accreditation (NABH, JCI), and facilities. Includes side-by-side hospital comparison and Google Maps directions. |
| **4. Treatment Cost Estimator** | `estimator` | Interactive procedure estimator with stay duration (days) and room tier multipliers (General, Semi-Private, Private, ICU). Displays itemized cost breakdown, potential scheme savings, and hospital-by-hospital comparison. |
| **5. Government Schemes** | `schemes` | Central & State scheme discovery (PM-JAY, Aarogyasri, CGHS, ESIC) with detailed coverage limits (up to ₹10 Lakh), beneficiary rules, required documents, official links, and an interactive eligibility questionnaire. |
| **6. My Healthcare Plan** | `plan` | Comprehensive personalized care summary: treatment estimate, out-of-pocket calculation, recommended hospitals, 4-step preparation roadmap with documents needed, and one-click PDF export. |
| **7. About & Data Sources** | `about` | Official Data Source Registry documenting government gazettes (CGHS 2025/2026 tariff orders, PM-JAY NHA package master, Telangana Aarogyasri Trust orders) and live system diagnostics. |

---

## 🏛 System Architecture

```
healthcare-agent/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Primary FastAPI application with CORS
│   │   ├── demo_main.py             # Single-process unified server serving API + React bundle
│   │   ├── api/                     # REST API Routers
│   │   │   ├── chat.py              # AI Assistant endpoint (/api/chat)
│   │   │   ├── hospitals.py         # Hospital search, details, and comparison (/api/hospitals)
│   │   │   ├── costs.py             # Itemized cost estimation engine (/api/cost-estimate)
│   │   │   ├── schemes.py           # Public scheme discovery & eligibility (/api/schemes)
│   │   │   ├── plans.py             # Care plan synthesis & retrieval (/api/plans)
│   │   │   ├── sources.py           # Authoritative data source registry (/api/sources)
│   │   │   └── appointments.py      # Consent-gated simulated booking engine
│   │   ├── agent/                   # Autonomous AI Navigator Agent
│   │   │   ├── orchestrator.py      # Multi-intent parsing, safety guards, tool dispatcher
│   │   │   ├── tools.py             # 7 registered structured agent tools
│   │   │   └── prompts.py           # Clinical safety guardrails & emergency keywords
│   │   ├── services/                # Business logic & data access services
│   │   │   ├── hospital_service.py  # Locality, PIN code, facility, and comparison engine
│   │   │   ├── cost_service.py      # Itemized cost breakdown & stay duration multiplier
│   │   │   ├── scheme_service.py    # Guided eligibility rule evaluation
│   │   │   ├── plan_service.py      # Healthcare plan generator & 4-step roadmap
│   │   │   └── source_service.py    # Authoritative registry loader
│   │   ├── models/                  # Validated Pydantic models (Hospital, Cost, Scheme, Plan)
│   │   └── data/                    # Datasets (CGHS, PM-JAY, Aarogyasri, Provider observations)
│   ├── tests/                       # Pytest test suite (29 tests)
│   │   ├── test_api.py
│   │   ├── test_agent.py
│   │   └── test_services.py
│   ├── scripts/
│   │   ├── ci_verify.py             # Automated CI verification runner (147 tests)
│   │   └── prepare_demo.py          # Unified distribution bundle builder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                     # ApiClient with fallback adapter
│   │   ├── components/              # Sidebar, Header, Modals (Detail, Eligibility, Appointment)
│   │   ├── context/                 # Global HealthcareContext (city, active plan, modals)
│   │   ├── screens/                 # 6 SaaS Screens + AboutScreen
│   │   └── utils/                   # Currency formatters and provenance badges
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 🛡️ Authoritative Data Sources & Provenance

CareNav AI strictly relies on verifiable, published public health sources and clearly labels indicative estimates:

1. **CGHS Tariff Schedule 2025/2026**: Directorate General of CGHS, Ministry of Health and Family Welfare (Government Order dated 3 October 2025 & January 2026 clarification).
2. **Ayushman Bharat PM-JAY Package Master**: National Health Authority (NHA), Government of India – Universal coverage for senior citizens (70+) and SECC deprivation criteria (₹5,00,000 family cover).
3. **Telangana Aarogyasri Health Care Trust**: Government of Telangana – Enhanced tertiary coverage ceiling of ₹10,00,000 for Food Security (White) Ration Card families across 1,672 treatments.
4. **Observed Provider Guides**: Published procedure and diagnostic test schedules from Yashoda Hospitals and Apollo Health City (Jubilee Hills / 24\|7).

---

## ⚡ Quickstart: Running Locally

### 1. Prerequisites
- **Python**: 3.10+ (Tested on Python 3.12)
- **Node.js**: v18+ (Tested on Node v20/v24)
- **Git**

---

### 2. Backend Setup & Automated Verification

```bash
cd backend

# Setup Python virtual environment & install pinned dependencies
python -m venv .local/runtime
.local/runtime/Scripts/activate  # On Windows: .local\runtime\Scripts\Activate.ps1
pip install -r requirements.txt

# Run the complete test suite (29 Pytests)
pytest tests/test_api.py tests/test_agent.py tests/test_services.py -v

# Run full CI verification suite (147 tests: 118 extension + 29 pytests)
python -m scripts.ci_verify
```

#### Start the Backend API Server:
```bash
python -m uvicorn app.demo_main:app_factory --factory --host 127.0.0.1 --port 8000
```
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Data Sources Registry**: [http://localhost:8000/api/sources](http://localhost:8000/api/sources)

---

### 3. Frontend Setup (React, Vite, Tailwind CSS)

In a separate terminal:
```bash
cd frontend

# Install dependencies
npm ci

# Start the Vite development server
npm run dev
```
- **Web Application**: [http://localhost:5173/](http://localhost:5173/)

---

## 🤖 AI Healthcare Navigator: Registered Agent Tools

The conversational agent in `backend/app/agent/` executes structured backend tools:

1. `search_hospitals(city, specialty, pincode, max_budget, hospital_type)`: Locates accredited facilities.
2. `get_hospital_details(hospital_id)`: Fetches contact, facilities, accreditations, and indicative pricing.
3. `estimate_treatment_cost(procedure, city, room_type, stay_days, hospital_id)`: Itemized cost calculation.
4. `find_healthcare_schemes(state, specialty, income_bracket)`: Identifies public welfare schemes.
5. `check_eligibility(age, state, has_ration_card, annual_income, is_senior)`: Guided rules engine for PM-JAY and Aarogyasri.
6. `compare_hospitals(hospital_ids, procedure)`: Generates side-by-side cost and quality comparisons.
7. `generate_healthcare_plan(treatment, city, budget, hospital_id)`: End-to-end plan with out-of-pocket costs and 4-step checklist.

### 🚨 Clinical Safety & Emergency Guardrails
- **Emergency Interception**: Mentions of acute symptoms (e.g. *"severe chest pain"*, *"cannot breathe"*, *"heart attack"*, *"stroke"*) immediately abort administrative workflows and display emergency dialer guidance (**National Ambulance: 108**, **Emergency: 112**).
- **No Medical Prescriptions**: Explicitly avoids diagnosis or pharmaceutical prescribing; functions strictly as a financial and logistical care navigation platform.
- **Simulated Appointment Booking**: Educational booking requests require explicit user confirmation (`user_confirmed: true`) and generate simulation tokens (`SIM-APT-XXXX`) without altering real clinical databases.

---

## 🧪 Automated CI Verification

The verification harness enforces strict data integrity and backward compatibility:

```json
{
  "checks": [
    { "check": "Local setup and database", "passed": true },
    { "check": "extension tests", "passed": true, "tests_reported": 118 },
    { "check": "original-backend tests", "passed": true, "tests_reported": 29 },
    { "check": "Original source files preserved", "passed": true, "changed_files": [] }
  ],
  "passed": true,
  "source_files_checked": 83
}
```

---

## 📄 License
This project is developed as an educational capstone for healthcare technology architecture and care navigation.

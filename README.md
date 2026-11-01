# CareNav AI – Healthcare Data, Cost and Care Navigation Platform

[![Backend CI Verification](https://img.shields.io/badge/CI%20Verification-149%20Tests%20Passed-emerald.svg)](.local/ci-reports/summary.json)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-sky.svg)](https://tailwindcss.com)

**CareNav AI** is a production-quality, data-driven healthcare data and care navigation platform designed to bridge the transparency gap for patients and families in India.

The platform connects hospitals, diseases, medical procedures, private health insurance policies, hospital–insurer cashless networks, government healthcare schemes (PM-JAY, Aarogyasri), and treatment costs with zero fake data, no synthesized statistics, and clear distinction between verified tariffs and indicative actuarial model estimates.

---

## 📸 Complete 10-Module Healthcare SaaS Suite

The platform delivers a modern, clean light healthcare SaaS dashboard (white & light-slate background, deep navy typography, teal & emerald accents):

| Module | Route / Key | Primary Capabilities |
| :--- | :--- | :--- |
| **1. Healthcare Overview** | `overview` | Actionable search bar, quick tool launchpads, regional healthcare insights (2,340+ TS hospitals, 500+ treatments, 12+ schemes), popular medical specialties, and verified provenance badges. |
| **2. Hospital Directory** | `hospitals` | Search by city, locality, and PIN code (e.g., `500033`); filter by specialty, hospital type (Govt/Private/Trust), accreditation (NABH, JCI, NABL), and cashless network. Includes side-by-side hospital comparison and Google Maps directions. |
| **3. Disease & Treatment Explorer** | `diseases` | Explore 8 disease domains (Cardiovascular, Orthopedics, Oncology, Nephrology, Stroke, Cataract, Obstetrics, General Surgery). Displays ICD-10 codes, standard procedures, PM-JAY & Aarogyasri package codes/tariffs, private insurance waiting periods (24–36 mo), and non-payable consumable estimates (~₹8k–₹25k). |
| **4. Insurance Policy Explorer** | `insurance` | Browse 8 top Indian insurers (Star Health, HDFC ERGO, ICICI Lombard, Niva Bupa, Care Health, Aditya Birla Health, Tata AIG, Bajaj Allianz) and filed retail health policies with exact IRDAI UINs, room rent rules, and side-by-side comparison with actuarial suitability scores (0–100). |
| **5. Hospital–Insurance Network** | `network` | "Find Best Hospital and Insurance Match" engine: Select hospital + insurer/policy to verify cashless empanelment status, TPA helpdesk desk contacts, and pre-authorization turnaround times. |
| **6. Treatment Cost Estimator & OOP** | `estimator` | Dual-mode financial engine: (1) Indicative hospital package benchmark with stay duration and room multipliers, (2) Actuarial Out-of-Pocket Calculator implementing bill deductions, proportionate room rent capping penalties, policy co-pays, and non-payable consumables. |
| **7. Government Schemes** | `schemes` | Central & State scheme discovery (PM-JAY, Aarogyasri, CGHS, ESIC) with detailed coverage limits (up to ₹10 Lakh), beneficiary rules, required documents, official links, and an interactive eligibility questionnaire. |
| **8. AI Healthcare Navigator** | `navigator` | Autonomous conversational assistant equipped with 12 backend tools. Features interactive response tabs (*Hospitals*, *Cost Estimate*, *Scheme Coverage*, *Next Steps*), 108/112 emergency intercept, and source citation. |
| **9. My Healthcare Plan** | `plan` | Comprehensive personalized care summary: treatment estimate, out-of-pocket calculation, recommended hospitals, 4-step preparation roadmap with documents needed, and one-click PDF export. |
| **10. Data Sources & Updates** | `about` | Official Data Source Registry documenting government gazettes (CGHS 2025/2026 tariff orders, PM-JAY NHA package master, Telangana Aarogyasri Trust orders, IRDAI CIS filings) and live system diagnostics. |

---

## 🏛 System Architecture & Backend Endpoints

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
│   │   │   ├── appointments.py      # Consent-gated simulated booking engine
│   │   │   ├── insurers.py          # Insurers directory & side-by-side policy comparison (/api/policies)
│   │   │   ├── diseases.py          # Clinical diseases & procedure packages (/api/diseases)
│   │   │   ├── network.py           # Hospital-insurer cashless network match (/api/network/match)
│   │   │   └── calculator.py        # Out-of-pocket actuarial calculator (/api/calculator/out-of-pocket)
│   │   ├── agent/                   # Autonomous AI Navigator Agent
│   │   │   ├── orchestrator.py      # Multi-intent parsing, safety guards, tool dispatcher
│   │   │   ├── tools.py             # 12 registered structured agent tools
│   │   │   └── prompts.py           # Clinical safety guardrails & emergency keywords
│   │   ├── services/                # Business logic & actuarial services
│   │   │   ├── insurance_service.py # Insurer directory & policy comparison matrix
│   │   │   ├── disease_service.py   # Disease, procedure, and scheme package codes
│   │   │   ├── network_service.py   # Hospital cashless network empanelment engine
│   │   │   ├── calculator_service.py# Out-of-pocket mathematical formula & audit trail
│   │   │   ├── hospital_service.py  # Hospital search, PIN codes, and facilities
│   │   │   ├── cost_service.py      # Itemized cost breakdown & stay duration multiplier
│   │   │   ├── scheme_service.py    # Guided eligibility rule evaluation
│   │   │   └── plan_service.py      # Healthcare plan generator & 4-step roadmap
│   │   ├── models/                  # Validated Pydantic models (Insurance, Disease, Network, Calculator)
│   │   └── data/datasets/           # Authoritative verified datasets (Insurers, Policies, Diseases, Network)
│   ├── tests/                       # Automated test suite (149 tests: 118 extension + 31 pytests)
│   └── scripts/                     # CI verification, demo builder, and diagnostics
├── frontend/                        # Modern React 19 + Tailwind CSS + Lucide Icons Single-Page App
```

---

## 🧮 Mathematical Out-of-Pocket Formula

$$\text{Gross Hospital Bill} - \text{Covered by Policy} - \text{Covered by Scheme} + \text{Room Rent Penalty} + \text{Co-pay} + \text{Non-Payable Consumables} = \text{Indicative Out-of-Pocket}$$

- **Proportionate Room Rent Penalty**: If room exceeds policy entitlement (e.g., policy allows standard ₹5,000/day and user chooses deluxe ₹7,500/day), associated fees are reduced in proportion ($\frac{5000}{7500} = 66.7\%$), leaving $33.3\%$ as a patient penalty.
- **IRDAI Non-Payables**: Standard policies exclude List I consumables (gloves, PPE, draping packs, admission fees ~₹8,000–₹25,000) unless an optional consumable rider is attached.

---

## ⚡ Quickstart

### 1. Run Automated CI Verification
```bash
cd healthcare-agent/backend
.local/runtime/Scripts/python.exe -m scripts.ci_verify
```
*Expected: 149 tests passed (118 extension unittests + 31 pytests).*

### 2. Start the Backend API Server
```bash
cd healthcare-agent/backend
.local/runtime/Scripts/python.exe -m uvicorn app.demo_main:app_factory --factory --host 127.0.0.1 --port 8000
```

### 3. Start the Frontend Dev Server
```bash
cd healthcare-agent/frontend
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

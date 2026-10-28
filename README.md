# Healthcare Cost and Care Navigation Agent

> **College Capstone Project**: An AI-powered healthcare navigation web application that assists patients and families in discovering hospitals, estimating indicative treatment costs across room tiers, verifying public healthcare schemes (e.g., Ayushman Bharat PM-JAY, Aarogyasri, CGHS, ESIC), and registering simulated appointment requests.

---

## 🏗 Architecture & Repository Structure

Integrated single-repository application divided into two collaborative modules:
- **Member 1**: React Frontend (`frontend/`)
- **Member 2**: AI Agent Backend (`backend/`)

```
healthcare-agent/
├── docs/
│   ├── API_CONTRACT.md          # Formal REST API contracts and data schemas
│   └── ARCHITECTURE.md          # System architecture and safety guardrails
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point with CORS
│   │   ├── config.py            # App settings and environment config
│   │   ├── api/                 # API endpoint routers (/chat, /hospitals, /cost-estimate, /schemes, /appointments)
│   │   ├── agent/               # AI Agent tool loop, emergency guards, prompts
│   │   ├── services/            # Hospital, Cost, Scheme, Appointment services
│   │   ├── models/              # Validated Pydantic models
│   │   └── data/                # Transparent mock datasets (Hyderabad & Bengaluru)
│   ├── tests/                   # Pytest test suite (16 unit and integration tests)
│   ├── requirements.txt         # Python dependencies
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── api/                 # Unified ApiClient with mock-fallback adapter
│   │   ├── components/          # Navbar, ChatInterface, HospitalCard, CostEstimator, SchemeExplorer, AppointmentModal, EmergencyBanner
│   │   ├── utils/               # Currency (INR) and data mode badge formatters
│   │   ├── App.jsx              # Main dashboard application
│   │   └── index.css            # Tailwind CSS styling and glassmorphism
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
- **Python**: 3.10+ (Tested on Python 3.12)
- **Node.js**: v18+ (Tested on Node v24)
- **Git**

---

### 2. Backend Setup (FastAPI & Agent)

Open a terminal and navigate to the backend folder:

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the test suite (16/16 tests)
pytest

# Start the FastAPI backend server (Runs locally on port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

> [!NOTE]
> The backend runs in **mock-agent mode** out of the box without requiring any third-party paid API keys! All tool calls, cost multipliers, and scheme filters work offline. If you have a Gemini or OpenAI API key, you can optionally set `GEMINI_API_KEY` or `OPENAI_API_KEY` in a `backend/.env` file.

---

### 3. Frontend Setup (React, Vite, Tailwind CSS)

Open a second terminal and navigate to the frontend folder:

```bash
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```

- **Web Dashboard**: [http://localhost:5173/](http://localhost:5173/)

---

## 🛡 Clinical & Simulation Safety Guardrails

1. **Emergency Interception**: Natural language queries containing emergency terms ("chest pain", "breathing difficulty", "severe bleeding", "stroke") immediately trigger emergency triage guidance (National Ambulance 108 / Emergency 112) rather than chatbot delays.
2. **No Medical Prescription / Diagnosis**: The agent strictly assists with administrative navigation, hospital discovery, cost ranges, and scheme eligibility.
3. **Simulated Appointments**: All booking actions require explicit user confirmation (`user_confirmed: true`), generate academic simulation receipts, and clearly state `is_simulated: true`.
4. **Data Mode Transparency**: Every record and estimate is tagged as `"mock"`, `"estimated"`, or `"verified"`.

---

## 🧪 Testing

### Backend Unit & Integration Tests:
```bash
cd backend
pytest
```
- Total tests: 16 passed
- Coverage: `/api/health`, `/api/chat`, `/api/hospitals`, `/api/cost-estimate`, `/api/schemes`, `/api/appointments/confirm`, emergency intercept, tool dispatcher, and room multipliers.

### Frontend Production Build:
```bash
cd frontend
npm run build
```
- Bundles client assets with Vite and validates syntax and CSS processing.